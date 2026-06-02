import { ollama } from './ollama'
import { getMessagesByChatId, createMessage } from '../db/queries/messages'
import { getChatById, updateChatTitle } from '../db/queries/chats'
import { getAgentConfig } from '../db/queries/config'
import { safeQuery, type Result, ok, err } from '../db/result'
import { env } from '../env'
import { DEFAULT_AGENT_ID } from './constants'
import type { Message } from '../db/schema'
import { TOOL_DEFINITIONS } from './tools/definitions'
import { executeTool } from './tools/executor'
import type { ToolCall } from 'ollama'

// Types for Ollama messages
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_name?: string
}

interface AgentConfig {
  systemPrompt: string
  model: string
  temperature: number
  maxTokens: number
  thinkingEnabled: boolean
}

interface PreparedMessages {
  messages: OllamaMessage[]
  config: AgentConfig
}

/**
 * Prepares the message array for Ollama by loading history and config.
 * Returns the prepared messages and config.
 */
export async function prepareAgentMessages(
  chatId: string,
  userContent: string,
  thinkingEnabled: boolean
): Promise<Result<PreparedMessages>> {
  return safeQuery(async () => {
    // 1. LOAD HISTORY
    const historyResult = await getMessagesByChatId(chatId)
    if (!historyResult.ok) {
      throw new Error(`Failed to load history: ${historyResult.error.message}`)
    }
    
    // Filter out system messages first, then take last 10
    const filteredMessages = historyResult.data
      .filter(msg => msg.role !== 'system')
      .slice(-10)
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))

    // 2. LOAD AGENT CONFIG
    const agentResult = await getAgentConfig(DEFAULT_AGENT_ID)
    let agentConfig: AgentConfig
    
    if (!agentResult.ok || !agentResult.data) {
      // Use fallback values if agent config not found
      agentConfig = {
        systemPrompt: "You are Aki, a helpful AI assistant.",
        model: env.OLLAMA_MODEL,
        temperature: 0.7,
        maxTokens: 2048,
        thinkingEnabled: false
      }
    } else {
      agentConfig = {
        systemPrompt: agentResult.data.systemPrompt,
        model: agentResult.data.model,
        temperature: agentResult.data.temperature,
        maxTokens: agentResult.data.maxTokens,
        thinkingEnabled: agentResult.data.thinkingEnabled === 1
      }
    }

    // 3. BUILD MESSAGE ARRAY for Ollama
    const messages: OllamaMessage[] = [
      { role: 'system', content: agentConfig.systemPrompt },
      ...filteredMessages,
      { role: 'user', content: userContent }
    ]

    // 4. PERSIST USER MESSAGE
    const userMessageResult = await createMessage({
      chatId,
      role: 'user',
      content: userContent,
      createdAt: Date.now()
    })
    
    if (!userMessageResult.ok) {
      throw new Error(`Failed to persist user message: ${userMessageResult.error.message}`)
    }

    return { messages, config: agentConfig }
  })
}

/**
 * Runs a complete agent turn (non-streaming).
 * This is the original function, kept for backwards compatibility.
 */
export async function runAgentTurn(
  chatId: string,
  userContent: string,
  thinkingEnabled: boolean
): Promise<Result<{ content: string; thinking: string | null }>> {
  return safeQuery(async () => {
    // Prepare messages using the new helper
    const prepared = await prepareAgentMessages(chatId, userContent, thinkingEnabled)
    if (!prepared.ok) {
      throw prepared.error
    }

    const { messages, config } = prepared.data

    // CALL OLLAMA (non-streaming)
    const response = await ollama.chat({
      model: config.model,
      messages,
      think: thinkingEnabled || config.thinkingEnabled,
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens
      }
    })

    const content = response.message.content
    const thinking = response.message.thinking ?? null

    // PERSIST ASSISTANT MESSAGE
    const assistantMessageResult = await createMessage({
      chatId,
      role: 'assistant',
      content,
      thinkingContent: thinking,
      inputTokens: response.prompt_eval_count ?? null,
      outputTokens: response.eval_count ?? null,
      createdAt: Date.now()
    })
    
    if (!assistantMessageResult.ok) {
      throw new Error(`Failed to persist assistant message: ${assistantMessageResult.error.message}`)
    }

    // UPDATE CHAT TIMESTAMP
    const chatResult = await getChatById(chatId)
    if (chatResult.ok && chatResult.data) {
      // Update title if it's still the default
      if (chatResult.data.title === "Nueva conversación") {
        const title = userContent.split(' ').slice(0, 5).join(' ') + "..."
        await updateChatTitle(chatId, title)
      }
    }

    return { content, thinking }
  })
}

/**
 * Streams an agent turn with real-time callback support.
 * Includes agent loop for tool calling.
 * 
 * @param chatId - The chat ID
 * @param userContent - The user's message content
 * @param thinkingEnabled - Whether to enable thinking mode
 * @param onChunk - Callback for each chunk received from the stream
 * @returns The final accumulated content and thinking
 */
export async function streamAgentTurn(
  chatId: string,
  userContent: string,
  thinkingEnabled: boolean,
  onChunk: (chunk: { content?: string; thinking?: string; toolCall?: string }) => void
): Promise<Result<{ content: string; thinking: string | null }>> {
  return safeQuery(async () => {
    // Prepare messages using the new helper
    const prepared = await prepareAgentMessages(chatId, userContent, thinkingEnabled)
    if (!prepared.ok) {
      throw prepared.error
    }

    let { messages, config } = prepared.data
    
    // Agent loop - max 8 iterations
    const MAX_ITERATIONS = 8
    let finalContent = ''
    let finalThinking: string | null = null
    
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      // Initialize accumulators for this iteration
      let fullContent = ''
      let fullThinking: string | null = null
      let toolCalls: ToolCall[] = []

      // CALL OLLAMA (streaming) with tools
      const stream = await ollama.chat({
        model: config.model,
        messages,
        think: thinkingEnabled || config.thinkingEnabled,
        stream: true,
        tools: TOOL_DEFINITIONS,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens
        }
      })

      // Process the stream
      for await (const chunk of stream) {
        if (chunk.message.content) {
          fullContent += chunk.message.content
          onChunk({ content: chunk.message.content })
        }
        if (chunk.message.thinking) {
          fullThinking = (fullThinking ?? '') + chunk.message.thinking
          onChunk({ thinking: chunk.message.thinking })
        }
        if (chunk.message.tool_calls) {
          toolCalls = [...toolCalls, ...chunk.message.tool_calls]
        }
      }

      // Store final values from this iteration
      finalContent = fullContent
      finalThinking = fullThinking

      // Push assistant message to conversation
      messages.push({
        role: 'assistant',
        content: fullContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
      })

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        break
      }

      // Execute tool calls and add results to conversation
      for (const call of toolCalls) {
        // Notify frontend of tool execution start
        onChunk({ 
          toolCall: `⚙ ${call.function.name}(${JSON.stringify(call.function.arguments)})` 
        })

        // Execute the tool
        const result = await executeTool(call)

        // Notify frontend of tool execution completion
        onChunk({ 
          toolCall: `✓ ${call.function.name}: ${result.slice(0, 120)}` 
        })

        // Add tool result to conversation
        messages.push({
          role: 'tool',
          tool_name: call.function.name,
          content: result
        })
      }
    }

    // PERSIST FINAL ASSISTANT MESSAGE (only the final response, not intermediate tool calls)
    const assistantMessageResult = await createMessage({
      chatId,
      role: 'assistant',
      content: finalContent,
      thinkingContent: finalThinking,
      createdAt: Date.now()
    })
    
    if (!assistantMessageResult.ok) {
      throw new Error(`Failed to persist assistant message: ${assistantMessageResult.error.message}`)
    }

    // UPDATE CHAT TIMESTAMP
    const chatResult = await getChatById(chatId)
    if (chatResult.ok && chatResult.data) {
      // Update title if it's still the default
      if (chatResult.data.title === "Nueva conversación") {
        const title = userContent.split(' ').slice(0, 5).join(' ') + "..."
        await updateChatTitle(chatId, title)
      }
    }

    return { content: finalContent, thinking: finalThinking }
  })
}
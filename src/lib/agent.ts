import { ollama } from './ollama.js'
import { getMessagesByChatId, createMessage } from '../db/queries/messages.js'
import { getChatById, updateChatTitle } from '../db/queries/chats.js'
import { getAgentConfig } from '../db/queries/config.js'
import { safeQuery, type Result, ok, err } from '../db/result.js'
import { env } from '../env.js'
import type { Message } from '../db/schema.js'

const DEFAULT_AGENT_ID = 'default-agent'
const DEFAULT_USER_ID = 'default-user'

export async function runAgentTurn(
  chatId: string,
  userContent: string,
  thinkingEnabled: boolean
): Promise<Result<{ content: string; thinking: string | null }>> {
  return safeQuery(async () => {
    // 1. LOAD HISTORY
    const historyResult = await getMessagesByChatId(chatId)
    if (!historyResult.ok) {
      throw new Error(`Failed to load history: ${historyResult.error.message}`)
    }
    
    // Take only the LAST 10 messages and map them to Ollama format
    const lastMessages = historyResult.data.slice(-10).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })).filter(msg => msg.role !== 'system') // Ignore system messages

    // 2. LOAD AGENT CONFIG
    const agentResult = await getAgentConfig(DEFAULT_AGENT_ID)
    let agentConfig: {
      systemPrompt: string
      model: string
      temperature: number
      maxTokens: number
    }
    
    if (!agentResult.ok || !agentResult.data) {
      // Use fallback values if agent config not found
      agentConfig = {
        systemPrompt: "You are Aki, a helpful AI assistant.",
        model: env.OLLAMA_MODEL,
        temperature: 0.7,
        maxTokens: 2048
      }
    } else {
      agentConfig = {
        systemPrompt: agentResult.data.systemPrompt,
        model: agentResult.data.model,
        temperature: agentResult.data.temperature,
        maxTokens: agentResult.data.maxTokens
      }
    }

    // 3. BUILD MESSAGE ARRAY for Ollama
    const messages = [
      { role: 'system' as const, content: agentConfig.systemPrompt },
      ...lastMessages,
      { role: 'user' as const, content: userContent }
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

    // 5. CALL OLLAMA
    const response = await ollama.chat({
      model: agentConfig.model,
      messages,
      think: thinkingEnabled,
      stream: false,
      options: {
        temperature: agentConfig.temperature,
        num_predict: agentConfig.maxTokens
      }
    })

    const content = response.message.content
    const thinking = response.message.thinking ?? null

    // 6. PERSIST ASSISTANT MESSAGE
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

    // 7. UPDATE CHAT TIMESTAMP
    const chatResult = await getChatById(chatId)
    if (chatResult.ok && chatResult.data) {
      // Update title if it's still the default
      if (chatResult.data.title === "Nueva conversación") {
        const title = userContent.split(' ').slice(0, 5).join(' ') + "..."
        await updateChatTitle(chatId, title)
      }
    }

    // 8. RETURN
    return { content, thinking }
  })
  })
}
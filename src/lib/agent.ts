import type { ToolCall } from 'ollama';
import { getChatById, updateChatTitle } from '../db/queries/chats';
import { getAgentConfig } from '../db/queries/config';
import { createMessage } from '../db/queries/messages';
import { err, ok, type Result, safeQuery } from '../db/result';
import type { Message } from '../db/schema';
import { env } from '../env';
import { DEFAULT_AGENT_ID, DEFAULT_USER_ID } from './constants';
import { ollama } from './ollama';
import { TOOL_DEFINITIONS } from './tools/definitions';
import { executeTool } from './tools/executor';
import { buildContext } from './context';
import { summarizeChat } from './summarizer';
import { extractMemory } from './memory-extractor';

// Types for Ollama messages
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string;
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
  // For backwards compatibility, use default user
  return runAgentTurnWithUser(chatId, DEFAULT_USER_ID, userContent, thinkingEnabled);
}

/**
 * Runs a complete agent turn (non-streaming) with user context.
 */
export async function runAgentTurnWithUser(
  chatId: string,
  userId: string,
  userContent: string,
  thinkingEnabled: boolean
): Promise<Result<{ content: string; thinking: string | null }>> {
  return safeQuery(async () => {
    // Build context using the new context builder
    const contextResult = await buildContext(chatId, userId);
    if (!contextResult.ok) {
      throw contextResult.error;
    }

    const { systemPrompt, messages: recentMessages, shouldSummarize } = contextResult.data;

    // PERSIST USER MESSAGE first
    const userMessageResult = await createMessage({
      chatId,
      role: 'user',
      content: userContent,
      createdAt: Date.now(),
    });

    if (!userMessageResult.ok) {
      throw new Error(`Failed to persist user message: ${userMessageResult.error.message}`);
    }

    // Build message array for Ollama
    const messages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
      { role: 'user', content: userContent },
    ];

    // Load config for model and options
    const agentResult = await getAgentConfig(DEFAULT_AGENT_ID);
    const model = agentResult.ok && agentResult.data ? agentResult.data.model : env.OLLAMA_MODEL;
    const temperature = agentResult.ok && agentResult.data ? agentResult.data.temperature : 0.7;
    const maxTokens = agentResult.ok && agentResult.data ? agentResult.data.maxTokens : 2048;
    const thinkingConfig = agentResult.ok && agentResult.data ? agentResult.data.thinkingEnabled === 1 : false;

    // CALL OLLAMA (non-streaming)
    const response = await ollama.chat({
      model,
      messages,
      think: thinkingEnabled || thinkingConfig,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    });

    const content = response.message.content;
    const thinking = response.message.thinking ?? null;

    // PERSIST ASSISTANT MESSAGE
    const assistantMessageResult = await createMessage({
      chatId,
      role: 'assistant',
      content,
      thinkingContent: thinking,
      inputTokens: response.prompt_eval_count ?? null,
      outputTokens: response.eval_count ?? null,
      createdAt: Date.now(),
    });

    if (!assistantMessageResult.ok) {
      throw new Error(
        `Failed to persist assistant message: ${assistantMessageResult.error.message}`
      );
    }

    // UPDATE CHAT TIMESTAMP
    const chatResult = await getChatById(chatId);
    if (chatResult.ok && chatResult.data) {
      // Update title if it's still the default
      if (chatResult.data.title === 'Nueva conversación') {
        const title = userContent.split(' ').slice(0, 5).join(' ') + '...';
        await updateChatTitle(chatId, title);
      }
    }

    // Fire-and-forget summarization if needed
    if (shouldSummarize) {
      summarizeChat(chatId, userId).catch((err) =>
        console.error('[summarizer] failed:', err)
      );
    }

    // Fire-and-forget memory extraction
    extractMemory(chatId, userId, userContent, content).catch((err) =>
      console.error('[memory-extractor] failed:', err)
    );

    return { content, thinking };
  });
}

/**
 * Streams an agent turn with real-time callback support.
 * Includes agent loop for tool calling.
 *
 * @param chatId - The chat ID
 * @param userId - The user ID
 * @param userContent - The user's message content
 * @param thinkingEnabled - Whether to enable thinking mode
 * @param onChunk - Callback for each chunk received from the stream
 * @returns The final accumulated content and thinking
 */
export async function streamAgentTurn(
  chatId: string,
  userId: string,
  userContent: string,
  thinkingEnabled: boolean,
  onChunk: (chunk: { content?: string; thinking?: string; toolCall?: string }) => void
): Promise<Result<{ content: string; thinking: string | null }>> {
  return safeQuery(async () => {
    // Build context using the new context builder
    const contextResult = await buildContext(chatId, userId);
    if (!contextResult.ok) {
      throw contextResult.error;
    }

    const {
      systemPrompt,
      messages: recentMessages,
      shouldSummarize,
    } = contextResult.data;

    // PERSIST USER MESSAGE first
    const userMessageResult = await createMessage({
      chatId,
      role: 'user',
      content: userContent,
      createdAt: Date.now(),
    });

    if (!userMessageResult.ok) {
      throw new Error(`Failed to persist user message: ${userMessageResult.error.message}`);
    }

    // Build message array for Ollama
    const messages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
      { role: 'user', content: userContent },
    ];

    // Load config for model and options
    const agentResult = await getAgentConfig(DEFAULT_AGENT_ID);
    const model = agentResult.ok && agentResult.data ? agentResult.data.model : env.OLLAMA_MODEL;
    const temperature = agentResult.ok && agentResult.data ? agentResult.data.temperature : 0.7;
    const maxTokens = agentResult.ok && agentResult.data ? agentResult.data.maxTokens : 2048;
    const thinkingConfig = agentResult.ok && agentResult.data ? agentResult.data.thinkingEnabled === 1 : false;

    // Agent loop - max 8 iterations
    const MAX_ITERATIONS = 8;
    let finalContent = '';
    let finalThinking: string | null = null;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      // Initialize accumulators for this iteration
      let fullContent = '';
      let fullThinking: string | null = null;
      let toolCalls: ToolCall[] = [];

      // CALL OLLAMA (streaming) with tools
      const stream = await ollama.chat({
        model,
        messages,
        think: thinkingEnabled || thinkingConfig,
        stream: true,
        tools: TOOL_DEFINITIONS,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      });

      // Process the stream
      for await (const chunk of stream) {
        if (chunk.message.content) {
          fullContent += chunk.message.content;
          onChunk({ content: chunk.message.content });
        }
        if (chunk.message.thinking) {
          fullThinking = (fullThinking ?? '') + chunk.message.thinking;
          onChunk({ thinking: chunk.message.thinking });
        }
        if (chunk.message.tool_calls) {
          toolCalls = [...toolCalls, ...chunk.message.tool_calls];
        }
      }

      // Store final values from this iteration
      finalContent = fullContent;
      finalThinking = fullThinking;

      // Push assistant message to conversation
      messages.push({
        role: 'assistant',
        content: fullContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      });

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        break;
      }

      // Execute tool calls and add results to conversation
      for (const call of toolCalls) {
        // Notify frontend of tool execution start
        onChunk({
          toolCall: `⚙ ${call.function.name}(${JSON.stringify(call.function.arguments)})`,
        });

        // Execute the tool
        const result = await executeTool(call);

        // Notify frontend of tool execution completion
        onChunk({
          toolCall: `✓ ${call.function.name}: ${result.slice(0, 120)}`,
        });

        // Add tool result to conversation
        messages.push({
          role: 'tool',
          tool_name: call.function.name,
          content: result,
        });
      }
    }

    // PERSIST FINAL ASSISTANT MESSAGE (only the final response, not intermediate tool calls)
    const assistantMessageResult = await createMessage({
      chatId,
      role: 'assistant',
      content: finalContent,
      thinkingContent: finalThinking,
      createdAt: Date.now(),
    });

    if (!assistantMessageResult.ok) {
      throw new Error(
        `Failed to persist assistant message: ${assistantMessageResult.error.message}`
      );
    }

    // UPDATE CHAT TIMESTAMP
    const chatResult = await getChatById(chatId);
    if (chatResult.ok && chatResult.data) {
      // Update title if it's still the default
      if (chatResult.data.title === 'Nueva conversación') {
        const title = userContent.split(' ').slice(0, 5).join(' ') + '...';
        await updateChatTitle(chatId, title);
      }
    }

    // Fire-and-forget summarization if needed
    if (shouldSummarize) {
      summarizeChat(chatId, userId).catch((err) =>
        console.error('[summarizer] failed:', err)
      );
    }

    // Fire-and-forget memory extraction
    extractMemory(chatId, userId, userContent, finalContent).catch((err) =>
      console.error('[memory-extractor] failed:', err)
    );

    return { content: finalContent, thinking: finalThinking };
  });
}

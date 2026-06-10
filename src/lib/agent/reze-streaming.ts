import { getChatById, updateChatTitle } from '@/db/queries/chats';
import { createMessage } from '@/db/queries/messages';
import { safeQuery } from '@/db/result';
import { buildContext } from '@/lib/context';
import { extractMemory } from '@/lib/memory-extractor';
import { ollama } from '@/lib/ollama';
import { summarizeChat } from '@/lib/summarizer';
import { REZE_TOOL_DEFINITIONS } from '@/lib/tools/reze-definitions';
import { executeRezeTool } from '@/lib/tools/reze-executor';
import { REZE_AGENT_ID } from '../constants';
import { loadAgentConfig } from './config';
import type { OllamaMessage } from './types';

export async function streamRezeTurn(
  chatId: string,
  userId: string,
  userContent: string,
  onChunk: (chunk: { content?: string; thinking?: string; toolCall?: string }) => void
) {
  return safeQuery(async () => {
    const contextResult = await buildContext(chatId, userId, REZE_AGENT_ID);
    if (!contextResult.ok) {
      throw contextResult.error;
    }

    const { systemPrompt, messages: recentMessages, shouldSummarize } = contextResult.data;

    // Persist user message
    const userMessageResult = await createMessage({
      chatId,
      role: 'user',
      content: userContent,
      createdAt: Date.now(),
    });

    if (!userMessageResult.ok) {
      throw new Error(`Failed to persist user message: ${userMessageResult.error.message}`);
    }

    const config = await loadAgentConfig(REZE_AGENT_ID);

    const messages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
      { role: 'user', content: userContent },
    ];

    let fullContent = '';
    let fullThinking: string | null = null;

    // --- Tool loop: Ollama may call tools multiple times ---
    let maxIterations = 5;
    while (maxIterations > 0) {
      maxIterations--;

      const response = await ollama.chat({
        model: config.model,
        messages,
        tools: REZE_TOOL_DEFINITIONS,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens,
        },
      });

      // Capture thinking if present
      if (response.message.thinking) {
        fullThinking = (fullThinking ?? '') + response.message.thinking;
      }

      // Check if Ollama wants to call a tool
      if (response.message.tool_calls && response.message.tool_calls.length > 0) {
        // Add the assistant's tool_call decision to the conversation
        messages.push(response.message as OllamaMessage);

        // Notify client that a tool is being invoked
        for (const toolCall of response.message.tool_calls) {
          onChunk({
            toolCall: `[tool] ${toolCall.function.name}(${JSON.stringify(toolCall.function.arguments)})`,
          });
        }

        // Execute each tool call and append results
        for (const toolCall of response.message.tool_calls) {
          const toolResult = await executeRezeTool(toolCall);
          messages.push({
            role: 'tool',
            content: toolResult,
          });
        }

        // Continue loop: send results back to Ollama
        continue;
      }

      // No more tool calls — we have the final content
      fullContent = response.message.content ?? '';
      messages.push({
        role: 'assistant',
        content: fullContent,
      });

      break;
    }

    if (maxIterations === 0 && fullContent === '') {
      fullContent =
        "I reached the maximum number of tool iterations. Let me know if you'd like me to continue.";
    }

    // Stream the final content word by word so the client receives it progressively
    const words = fullContent.split(/(\s+)/);
    for (const word of words) {
      if (word) {
        onChunk({ content: word });
      }
    }

    // Persist final message
    const assistantMessageResult = await createMessage({
      chatId,
      role: 'assistant',
      content: fullContent,
      thinkingContent: fullThinking,
      agentId: REZE_AGENT_ID,
      createdAt: Date.now(),
    });

    if (!assistantMessageResult.ok) {
      throw new Error(
        `Failed to persist assistant message: ${assistantMessageResult.error.message}`
      );
    }

    const savedMessageId = assistantMessageResult.data.id;

    // Update chat title
    const chatResult = await getChatById(chatId);
    if (chatResult.ok && chatResult.data?.title === 'Nueva conversación') {
      const title = `${userContent.split(' ').slice(0, 5).join(' ')}...`;
      await updateChatTitle(chatId, title);
    }

    // Background tasks
    if (shouldSummarize) {
      summarizeChat(chatId, userId).catch((err) => console.error('[summarizer] failed:', err));
    }

    extractMemory(chatId, userId, userContent, fullContent).catch((err) =>
      console.error('[memory-extractor] failed:', err)
    );

    return { content: fullContent, thinking: fullThinking, messageId: savedMessageId };
  });
}

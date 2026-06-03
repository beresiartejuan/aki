import { getChatById, updateChatTitle } from '../../db/queries/chats';
import { createMessage } from '../../db/queries/messages';
import { safeQuery } from '../../db/result';
import { ollama } from '../ollama';
import { TOOL_DEFINITIONS } from '../tools/definitions';
import { executeTool } from '../tools/executor';
import { buildContext } from '../context';
import { summarizeChat } from '../summarizer';
import { extractMemory } from '../memory-extractor';
import { loadAgentConfig } from './config';
import type { OllamaMessage } from './types';

const MAX_ITERATIONS = 8;

export async function streamAgentTurn(
  chatId: string,
  userId: string,
  userContent: string,
  thinkingEnabled: boolean,
  onChunk: (chunk: { content?: string; thinking?: string; toolCall?: string }) => void
) {
  return safeQuery(async () => {
    const contextResult = await buildContext(chatId, userId);
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

    const config = await loadAgentConfig();
    
    const messages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
      { role: 'user', content: userContent },
    ];

    let finalContent = '';
    let finalThinking: string | null = null;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let fullContent = '';
      let fullThinking: string | null = null;
      let toolCalls: { function: { name: string; arguments: Record<string, unknown> } }[] = [];

      const stream = await ollama.chat({
        model: config.model,
        messages,
        think: thinkingEnabled || config.thinkingConfig,
        stream: true,
        tools: TOOL_DEFINITIONS,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens,
        },
      });

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

      finalContent = fullContent;
      finalThinking = fullThinking;

      messages.push({
        role: 'assistant',
        content: fullContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      });

      if (toolCalls.length === 0) {
        break;
      }

      // Execute tool calls
      for (const call of toolCalls) {
        onChunk({
          toolCall: `⚙ ${call.function.name}(${JSON.stringify(call.function.arguments)})`,
        });

        const result = await executeTool(call);

        onChunk({
          toolCall: `✓ ${call.function.name}: ${result.slice(0, 120)}`,
        });

        messages.push({
          role: 'tool',
          tool_name: call.function.name,
          content: result,
        });
      }
    }

    // Persist final message
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

    // Update chat title
    const chatResult = await getChatById(chatId);
    if (chatResult.ok && chatResult.data?.title === 'Nueva conversación') {
      const title = userContent.split(' ').slice(0, 5).join(' ') + '...';
      await updateChatTitle(chatId, title);
    }

    // Background tasks
    if (shouldSummarize) {
      summarizeChat(chatId, userId).catch((err) =>
        console.error('[summarizer] failed:', err)
      );
    }

    extractMemory(chatId, userId, userContent, finalContent).catch((err) =>
      console.error('[memory-extractor] failed:', err)
    );

    return { content: finalContent, thinking: finalThinking };
  });
}

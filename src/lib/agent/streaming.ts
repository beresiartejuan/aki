import { getChatById, updateChatTitle } from '@/db/queries/chats';
import { createMessage } from '@/db/queries/messages';
import { safeQuery } from '@/db/result';
import { buildContext } from '@/lib/context';
import { extractMemory } from '@/lib/memory-extractor';
import { ollama } from '@/lib/ollama';
import { summarizeChat } from '@/lib/summarizer';
import { DEFAULT_AGENT_ID } from '../constants';
import { loadAgentConfig } from './config';
import type { OllamaMessage } from './types';

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

    let fullContent = '';
    let fullThinking: string | null = null;

    const stream = await ollama.chat({
      model: config.model,
      messages,
      think: thinkingEnabled || config.thinkingConfig,
      stream: true,
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
    }

    messages.push({
      role: 'assistant',
      content: fullContent,
    });

    // Persist final message
    const assistantMessageResult = await createMessage({
      chatId,
      role: 'assistant',
      content: fullContent,
      thinkingContent: fullThinking,
      agentId: DEFAULT_AGENT_ID,
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

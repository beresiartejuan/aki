import { getChatById, updateChatTitle } from '@/db/queries/chats';
import { createMessage } from '@/db/queries/messages';
import { safeQuery } from '@/db/result';
import { buildContext } from '@/lib/context';
import { extractMemory } from '@/lib/memory-extractor';
import { ollama } from '@/lib/ollama';
import { summarizeChat } from '@/lib/summarizer';
import { loadAgentConfig } from './config';
import type { OllamaMessage } from './types';

export async function runAgentTurnWithUser(
  chatId: string,
  userId: string,
  userContent: string,
  thinkingEnabled: boolean
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

    const response = await ollama.chat({
      model: config.model,
      messages,
      think: thinkingEnabled || config.thinkingConfig,
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    });

    const content = response.message.content;
    const thinking = response.message.thinking ?? null;

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

    // Update chat title if needed
    const chatResult = await getChatById(chatId);
    if (chatResult.ok && chatResult.data?.title === 'Nueva conversación') {
      const title = `${userContent.split(' ').slice(0, 5).join(' ')}...`;
      await updateChatTitle(chatId, title);
    }

    // Background tasks
    if (shouldSummarize) {
      summarizeChat(chatId, userId).catch((err) => console.error('[summarizer] failed:', err));
    }

    extractMemory(chatId, userId, userContent, content).catch((err) =>
      console.error('[memory-extractor] failed:', err)
    );

    return { content, thinking };
  });
}

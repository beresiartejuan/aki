import { getChatById, updateChatTitle } from '@/db/queries/chats';
import { createMessage } from '@/db/queries/messages';
import { safeQuery } from '@/db/result';
import { buildContext } from '@/lib/context';
import { extractMemory } from '@/lib/memory-extractor';
import { ollama } from '@/lib/ollama';
import { summarizeChat } from '@/lib/summarizer';
import { AKI_TOOL_DEFINITIONS } from '@/lib/tools/aki-definitions';
import { executeAkiTool } from '@/lib/tools/aki-executor';
import { DEFAULT_AGENT_ID } from '../constants';
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

    // --- Tool loop: Ollama may call tools multiple times ---
    let content = '';
    let thinking: string | null = null;
    let maxIterations = 3;

    while (maxIterations > 0) {
      maxIterations--;

      const response = await ollama.chat({
        model: config.model,
        messages,
        tools: AKI_TOOL_DEFINITIONS,
        think: thinkingEnabled || config.thinkingConfig,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens,
        },
      });

      if (response.message.thinking) {
        thinking = (thinking ?? '') + response.message.thinking;
      }

      // Check if Ollama wants to call a tool
      if (response.message.tool_calls && response.message.tool_calls.length > 0) {
        messages.push(response.message as OllamaMessage);

        for (const toolCall of response.message.tool_calls) {
          const toolResult = await executeAkiTool(toolCall, chatId);
          messages.push({
            role: 'tool',
            content: toolResult,
          });
        }

        continue;
      }

      content = response.message.content ?? '';
      messages.push({
        role: 'assistant',
        content,
      });

      break;
    }

    if (maxIterations === 0 && content === '') {
      content = 'Llegué al límite de iteraciones de herramientas. Avísame si querés que continúe.';
    }

    const assistantMessageResult = await createMessage({
      chatId,
      role: 'assistant',
      content,
      thinkingContent: thinking,
      agentId: DEFAULT_AGENT_ID,
      inputTokens: null,
      outputTokens: null,
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

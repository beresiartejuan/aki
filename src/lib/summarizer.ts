import { getMessagesByChatId } from '../db/queries/messages';
import { getSummaryByChatId, upsertSummary } from '../db/queries/summaries';
import { ok, type Result, safeQuery } from '../db/result';
import type { Message } from '../db/schema';
import { getAgentConfig } from '../db/queries/config';
import { DEFAULT_AGENT_ID } from './constants';
import { env } from '../env';
import { ollama } from './ollama';

/**
 * Summarizes a chat conversation and upserts the summary.
 * Called fire-and-forget after a turn completes.
 */
export async function summarizeChat(
  chatId: string,
  userId: string
): Promise<Result<void>> {
  return safeQuery(async () => {
    // 1. Load ALL messages for the chat
    const messagesResult = await getMessagesByChatId(chatId);
    if (!messagesResult.ok) {
      throw new Error(`Failed to load messages: ${messagesResult.error.message}`);
    }

    // Filter out system messages
    const messages = messagesResult.data.filter((msg) => msg.role !== 'system');
    const totalMessages = messages.length;

    if (totalMessages === 0) {
      return; // Nothing to summarize
    }

    // 2. Load existing summary if any
    const summaryResult = await getSummaryByChatId(chatId);
    let existingSummary = summaryResult.ok ? summaryResult.data : undefined;

    // 3. Load agent config for model
    const agentResult = await getAgentConfig(DEFAULT_AGENT_ID);
    const model = agentResult.ok && agentResult.data 
      ? agentResult.data.model 
      : env.OLLAMA_MODEL;

    // 4. Build summarization prompt
    const summarizationPrompt = buildSummarizationPrompt(messages, existingSummary);

    // 5. Call ollama (non-streaming, no tools)
    const response = await ollama.chat({
      model,
      messages: [{ role: 'user', content: summarizationPrompt }],
      stream: false,
      think: false,
      // No tools passed - this is an internal utility call
    });

    // 6. Extract summary text
    const summaryText = response.message.content?.trim() ?? '';

    if (!summaryText) {
      console.warn('[summarizer] No summary generated');
      return;
    }

    // 7. Upsert the summary
    const upsertResult = await upsertSummary({
      chatId,
      summary: summaryText,
      messagesCovered: totalMessages,
    });

    if (!upsertResult.ok) {
      throw new Error(`Failed to upsert summary: ${upsertResult.error.message}`);
    }

    console.log(`[summarizer] Updated summary for chat ${chatId}, covered ${totalMessages} messages`);
  });
}

/**
 * Builds the summarization prompt
 */
function buildSummarizationPrompt(
  messages: Message[],
  existingSummary: { summary: string; messagesCovered: number } | undefined
): string {
  const parts: string[] = [
    `You are a conversation summarizer. Your task is to create a concise but complete summary of the following conversation.`,
  ];

  if (existingSummary) {
    parts.push(
      `\nPrevious summary (covering the first ${existingSummary.messagesCovered} messages):\n${existingSummary.summary}\n`
    );

    // Only include messages after what was already summarized
    const newMessages = messages.slice(existingSummary.messagesCovered);
    if (newMessages.length > 0) {
      parts.push(`New messages to incorporate:`);
      parts.push(
        newMessages.map((m) => `[${m.role}]: ${m.content}`).join('\n')
      );
    }
  } else {
    parts.push(`\nMessages to summarize:`);
    parts.push(messages.map((m) => `[${m.role}]: ${m.content}`).join('\n'));
  }

  parts.push(`\nWrite a summary in 3–8 sentences covering:`);
  parts.push(`- The main topics discussed`);
  parts.push(`- Any decisions or conclusions reached`);
  parts.push(`- Key facts mentioned by the user about themselves or their work`);
  parts.push(`- Any pending questions or open threads`);
  parts.push(`\nWrite in third person ("The user asked...", "The assistant explained...").`);
  parts.push(`Be factual and concise. Do not include pleasantries or meta-commentary.`);

  return parts.join('\n');
}

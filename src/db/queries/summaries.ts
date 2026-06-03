import { eq } from 'drizzle-orm';
import { db } from '../index';
import { type Result, safeQuery } from '../result';
import type { ChatSummary, InsertChatSummary } from '../schema';
import { chatSummaries, insertChatSummarySchema, selectChatSummarySchema } from '../schema';

/**
 * Gets the summary for a specific chat
 */
export function getSummaryByChatId(chatId: string): Promise<Result<ChatSummary | undefined>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(chatSummaries)
      .where(eq(chatSummaries.chatId, chatId))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return selectChatSummarySchema.parse(result[0]);
  });
}

/**
 * Upserts a chat summary (insert or update on chatId conflict)
 */
export function upsertSummary(data: InsertChatSummary): Promise<Result<ChatSummary>> {
  return safeQuery(async () => {
    const validatedData = insertChatSummarySchema.parse(data);

    const result = await db
      .insert(chatSummaries)
      .values(validatedData)
      .onConflictDoUpdate({
        target: chatSummaries.chatId,
        set: {
          summary: validatedData.summary,
          messagesCovered: validatedData.messagesCovered,
          updatedAt: Date.now(),
        },
      })
      .returning();

    return selectChatSummarySchema.parse(result[0]);
  });
}

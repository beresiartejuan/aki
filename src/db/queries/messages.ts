import { asc, eq } from 'drizzle-orm';
import { db } from '../index';
import { type Result, safeQuery } from '../result';
import type { InsertMessage, Message } from '../schema';
import { insertMessageSchema, messages, selectMessageSchema } from '../schema';

/**
 * Selects all messages for a chat ordered by createdAt ASC
 */
export function getMessagesByChatId(chatId: string): Promise<Result<Message[]>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt));

    // Validate results with Zod schema
    return result.map((message) => selectMessageSchema.parse(message));
  });
}

/**
 * Validates with insertMessageSchema, inserts, returns created row
 */
export function createMessage(data: InsertMessage): Promise<Result<Message>> {
  return safeQuery(async () => {
    // Validate input with Zod schema
    const validatedData = insertMessageSchema.parse(data);

    const result = await db.insert(messages).values(validatedData).returning();

    // Validate result with Zod schema
    return selectMessageSchema.parse(result[0]);
  });
}

/**
 * Deletes all messages for a chat
 */
export function deleteMessagesByChat(chatId: string): Promise<Result<{ deleted: boolean }>> {
  return safeQuery(async () => {
    await db.delete(messages).where(eq(messages.chatId, chatId));

    return { deleted: true };
  });
}

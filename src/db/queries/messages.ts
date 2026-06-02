import { eq, asc } from "drizzle-orm";
import { db } from "../index.js";
import { messages, insertMessageSchema, selectMessageSchema } from "../schema.js";
import { safeQuery, type Result } from "../result.js";
import type { Message, InsertMessage } from "../schema.js";

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
    
    const result = await db
      .insert(messages)
      .values(validatedData)
      .returning();
    
    // Validate result with Zod schema
    return selectMessageSchema.parse(result[0]);
  });
}

/**
 * Deletes all messages for a chat
 */
export function deleteMessagesByChat(chatId: string): Promise<Result<{ deleted: boolean }>> {
  return safeQuery(async () => {
    await db
      .delete(messages)
      .where(eq(messages.chatId, chatId));
    
    return { deleted: true };
  });
}
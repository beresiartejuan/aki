import { eq, desc } from "drizzle-orm";
import { db } from "../index";
import { chats, insertChatSchema, selectChatSchema } from "../schema";
import { safeQuery, type Result } from "../result";
import type { Chat, InsertChat } from "../schema";

/**
 * Selects all chats for a user ordered by updatedAt DESC
 */
export function getAllChats(userId: string): Promise<Result<Chat[]>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt));
    
    // Validate results with Zod schema
    return result.map((chat) => selectChatSchema.parse(chat));
  });
}

/**
 * Selects a single chat by id
 */
export function getChatById(chatId: string): Promise<Result<Chat | undefined>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);
    
    if (result.length === 0) {
      return undefined;
    }
    
    // Validate result with Zod schema
    return selectChatSchema.parse(result[0]);
  });
}

/**
 * Validates input with insertChatSchema, inserts, returns the created row
 */
export function createChat(data: InsertChat): Promise<Result<Chat>> {
  return safeQuery(async () => {
    // Validate input with Zod schema
    const validatedData = insertChatSchema.parse(data);
    
    const result = await db
      .insert(chats)
      .values(validatedData)
      .returning();
    
    // Validate result with Zod schema
    return selectChatSchema.parse(result[0]);
  });
}

/**
 * Updates title and updatedAt, returns updated row
 */
export function updateChatTitle(chatId: string, title: string): Promise<Result<Chat>> {
  return safeQuery(async () => {
    const result = await db
      .update(chats)
      .set({ title, updatedAt: Date.now() })
      .where(eq(chats.id, chatId))
      .returning();
    
    // Validate result with Zod schema
    return selectChatSchema.parse(result[0]);
  });
}

/**
 * Deletes by id, returns { deleted: true } on success
 */
export function deleteChat(chatId: string): Promise<Result<{ deleted: boolean }>> {
  return safeQuery(async () => {
    await db
      .delete(chats)
      .where(eq(chats.id, chatId));
    
    return { deleted: true };
  });
}
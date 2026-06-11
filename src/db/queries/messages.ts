import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { type Result, safeQuery } from '@/db/result';
import type { InsertMessage, Message } from '@/db/schema';
import { insertMessageSchema, messages, selectMessageSchema } from '@/db/schema';
import { storeMessageEmbedding } from '@/lib/embeddings';

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
 * Get a single message by ID
 */
export function getMessageById(messageId: string): Promise<Result<Message | undefined>> {
  return safeQuery(async () => {
    const result = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return selectMessageSchema.parse(result[0]);
  });
}

/**
 * Validates with insertMessageSchema, inserts, returns created row.
 * Also generates an embedding for the message content in the background.
 */
export function createMessage(data: InsertMessage): Promise<Result<Message>> {
  return safeQuery(async () => {
    // Validate input with Zod schema
    const validatedData = insertMessageSchema.parse(data);

    const result = await db.insert(messages).values(validatedData).returning();

    const message = selectMessageSchema.parse(result[0]);

    // Generate embedding fire-and-forget (does not block)
    if (message.content) {
      storeMessageEmbedding(message.id, message.content).catch((err) =>
        console.error('[createMessage] Embedding generation failed:', err)
      );
    }

    return message;
  });
}

/**
 * Update the makimaJobId of a message
 */
export function updateMessageMakimaJobId(
  messageId: string,
  makimaJobId: string
): Promise<Result<Message>> {
  return safeQuery(async () => {
    const result = await db
      .update(messages)
      .set({ makimaJobId })
      .where(eq(messages.id, messageId))
      .returning();

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

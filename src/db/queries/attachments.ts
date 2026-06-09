import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { type Result, safeQuery } from '@/db/result';
import type { Attachment, InsertAttachment } from '@/db/schema';
import { attachments, insertAttachmentSchema, selectAttachmentSchema } from '@/db/schema';

/**
 * Get attachments by message ID
 */
export function getAttachmentsByMessageId(messageId: string): Promise<Result<Attachment[]>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(attachments)
      .where(eq(attachments.messageId, messageId))
      .orderBy(attachments.createdAt);

    return result.map((attachment) => selectAttachmentSchema.parse(attachment));
  });
}

/**
 * Get attachment by ID
 */
export function getAttachmentById(id: string): Promise<Result<Attachment | undefined>> {
  return safeQuery(async () => {
    const result = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return selectAttachmentSchema.parse(result[0]);
  });
}

/**
 * Create a new attachment
 */
export function createAttachment(data: InsertAttachment): Promise<Result<Attachment>> {
  return safeQuery(async () => {
    const validatedData = insertAttachmentSchema.parse(data);
    const result = await db.insert(attachments).values(validatedData).returning();
    return selectAttachmentSchema.parse(result[0]);
  });
}

/**
 * Delete an attachment by ID
 */
export function deleteAttachment(id: string): Promise<Result<{ deleted: boolean }>> {
  return safeQuery(async () => {
    await db.delete(attachments).where(eq(attachments.id, id));
    return { deleted: true };
  });
}

/**
 * Delete all attachments for a message
 */
export function deleteAttachmentsByMessage(
  messageId: string
): Promise<Result<{ deleted: boolean }>> {
  return safeQuery(async () => {
    await db.delete(attachments).where(eq(attachments.messageId, messageId));
    return { deleted: true };
  });
}

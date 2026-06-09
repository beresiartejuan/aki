import crypto from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '@/db';
import { type Result, safeQuery } from '@/db/result';
import type { InsertSharedChat, SharedChat } from '@/db/schema';
import { insertSharedChatSchema, selectSharedChatSchema, sharedChats } from '@/db/schema';

/**
 * Generate a unique hash for sharing
 */
export function generateShareHash(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a shared chat link
 */
export function createSharedChat(data: InsertSharedChat): Promise<Result<SharedChat>> {
  return safeQuery(async () => {
    const validatedData = insertSharedChatSchema.parse(data);
    const result = await db.insert(sharedChats).values(validatedData).returning();
    return selectSharedChatSchema.parse(result[0]);
  });
}

/**
 * Get shared chat by hash (if active and not expired)
 */
export function getSharedChatByHash(hash: string): Promise<Result<SharedChat | undefined>> {
  return safeQuery(async () => {
    const now = Date.now();
    const result = await db
      .select()
      .from(sharedChats)
      .where(
        and(
          eq(sharedChats.shareHash, hash),
          eq(sharedChats.isActive, 1),
          gt(sharedChats.expiresAt, now)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return selectSharedChatSchema.parse(result[0]);
  });
}

/**
 * Get shared chat by chat ID
 */
export function getSharedChatByChatId(chatId: string): Promise<Result<SharedChat | undefined>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(sharedChats)
      .where(and(eq(sharedChats.chatId, chatId), eq(sharedChats.isActive, 1)))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return selectSharedChatSchema.parse(result[0]);
  });
}

/**
 * Deactivate a shared chat (revoke)
 */
export function deactivateSharedChat(chatId: string): Promise<Result<{ updated: boolean }>> {
  return safeQuery(async () => {
    await db.update(sharedChats).set({ isActive: 0 }).where(eq(sharedChats.chatId, chatId));
    return { updated: true };
  });
}

/**
 * Clean up expired shares
 */
export function cleanupExpiredShares(): Promise<Result<{ deleted: number }>> {
  return safeQuery(async () => {
    const now = Date.now();
    const result = await db.delete(sharedChats).where(lt(sharedChats.expiresAt, now)).returning();
    return { deleted: result.length };
  });
}

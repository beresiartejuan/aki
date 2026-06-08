import { eq, gt, sql } from 'drizzle-orm';
import { db } from '../index';
import { type Result, safeQuery } from '../result';
import { type InsertSession, type InsertUser, type Session, type User, insertSessionSchema, insertUserSchema, selectSessionSchema, selectUserSchema, sessions, users } from '../schema';

/**
 * Get user by username
 */
export function getUserByUsername(username: string): Promise<Result<User | undefined>> {
  return safeQuery(async () => {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return selectUserSchema.parse(result[0]);
  });
}

/**
 * Check if any users exist in the database
 */
export function hasUsers(): Promise<Result<boolean>> {
  return safeQuery(async () => {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0].count > 0;
  });
}

/**
 * Create a new user
 */
export function createUser(data: InsertUser): Promise<Result<User>> {
  return safeQuery(async () => {
    const validatedData = insertUserSchema.parse(data);
    const result = await db.insert(users).values(validatedData).returning();
    return selectUserSchema.parse(result[0]);
  });
}

/**
 * Get session by ID
 */
export function getSessionById(sessionId: string): Promise<Result<Session | undefined>> {
  return safeQuery(async () => {
    const now = Date.now();
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .where(gt(sessions.expiresAt, now))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return selectSessionSchema.parse(result[0]);
  });
}

/**
 * Create a new session
 */
export function createSession(data: InsertSession): Promise<Result<Session>> {
  return safeQuery(async () => {
    const validatedData = insertSessionSchema.parse(data);
    const result = await db.insert(sessions).values(validatedData).returning();
    return selectSessionSchema.parse(result[0]);
  });
}

/**
 * Delete a session (logout)
 */
export function deleteSession(sessionId: string): Promise<Result<{ deleted: boolean }>> {
  return safeQuery(async () => {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return { deleted: true };
  });
}

/**
 * Delete all sessions for a user
 */
export function deleteUserSessions(userId: string): Promise<Result<{ deleted: boolean }>> {
  return safeQuery(async () => {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    return { deleted: true };
  });
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): Promise<Result<{ deleted: number }>> {
  return safeQuery(async () => {
    const now = Date.now();
    const result = await db.delete(sessions).where(gt(sessions.expiresAt, now)).returning();
    return { deleted: result.length };
  });
}

import { desc, eq } from 'drizzle-orm';
import { db } from '../index';
import { type Result, safeQuery } from '../result';
import type { AgentMemory, InsertAgentMemory } from '../schema';
import { agentMemory, insertAgentMemorySchema, selectAgentMemorySchema } from '../schema';

/**
 * Gets all memory entries for a user, ordered by lastSeenAt DESC
 */
export function getMemoryByUser(userId: string): Promise<Result<AgentMemory[]>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(agentMemory)
      .where(eq(agentMemory.userId, userId))
      .orderBy(desc(agentMemory.lastSeenAt));

    return result.map((memory) => selectAgentMemorySchema.parse(memory));
  });
}

/**
 * Upserts a memory entry (insert or update on userId+key conflict)
 */
export function upsertMemoryEntry(data: InsertAgentMemory): Promise<Result<AgentMemory>> {
  return safeQuery(async () => {
    const validatedData = insertAgentMemorySchema.parse(data);

    const result = await db
      .insert(agentMemory)
      .values(validatedData)
      .onConflictDoUpdate({
        target: [agentMemory.userId, agentMemory.key],
        set: {
          category: validatedData.category,
          value: validatedData.value,
          confidence: validatedData.confidence,
          lastSeenAt: validatedData.lastSeenAt ?? Date.now(),
        },
      })
      .returning();

    return selectAgentMemorySchema.parse(result[0]);
  });
}

/**
 * Deletes a memory entry by id
 */
export function deleteMemoryEntry(id: string): Promise<Result<{ deleted: boolean }>> {
  return safeQuery(async () => {
    await db.delete(agentMemory).where(eq(agentMemory.id, id));

    return { deleted: true };
  });
}

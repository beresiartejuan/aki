import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { type Result, safeQuery } from '@/db/result';
import { type MakimaJob, makimaJobs, selectMakimaJobSchema } from '@/db/schema';

/**
 * Create a new Makima job
 */
export function createMakimaJob(data: {
  id?: string;
  chatId: string;
  triggerMessageId?: string | null;
  prompt: string;
  userMessage: string;
  status?: 'pending' | 'running' | 'done' | 'error';
  fullOutput?: string;
  lastOutputChunk?: string;
  akiVerification?: string;
  createdAt?: number;
  finishedAt?: number | null;
}): Promise<Result<MakimaJob>> {
  return safeQuery(async () => {
    const result = await db
      .insert(makimaJobs)
      .values({
        id: data.id ?? crypto.randomUUID(),
        chatId: data.chatId,
        triggerMessageId: data.triggerMessageId ?? null,
        prompt: data.prompt,
        userMessage: data.userMessage,
        status: data.status ?? 'pending',
        fullOutput: data.fullOutput ?? '',
        lastOutputChunk: data.lastOutputChunk ?? '',
        akiVerification: data.akiVerification ?? '',
        createdAt: data.createdAt ?? Date.now(),
        finishedAt: data.finishedAt ?? null,
      })
      .returning();

    return selectMakimaJobSchema.parse(result[0]);
  });
}

/**
 * Get a Makima job by id
 */
export function getMakimaJob(id: string): Promise<Result<MakimaJob | undefined>> {
  return safeQuery(async () => {
    const result = await db.select().from(makimaJobs).where(eq(makimaJobs.id, id)).limit(1);

    if (result.length === 0) {
      return undefined;
    }

    return selectMakimaJobSchema.parse(result[0]);
  });
}

/**
 * Get all Makima jobs for a chat, ordered by createdAt DESC
 */
export function getMakimaJobsByChatId(chatId: string): Promise<Result<MakimaJob[]>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(makimaJobs)
      .where(eq(makimaJobs.chatId, chatId))
      .orderBy(makimaJobs.createdAt);

    return result.map((job) => selectMakimaJobSchema.parse(job));
  });
}

/**
 * Update job status
 */
export function updateMakimaJobStatus(
  id: string,
  status: 'pending' | 'running' | 'done' | 'error'
): Promise<Result<MakimaJob>> {
  return safeQuery(async () => {
    const result = await db
      .update(makimaJobs)
      .set({ status })
      .where(eq(makimaJobs.id, id))
      .returning();

    return selectMakimaJobSchema.parse(result[0]);
  });
}

/**
 * Append chunk to fullOutput and update lastOutputChunk (last ~500 chars)
 */
export function appendMakimaJobOutput(id: string, chunk: string): Promise<Result<MakimaJob>> {
  return safeQuery(async () => {
    const [job] = await db.select().from(makimaJobs).where(eq(makimaJobs.id, id)).limit(1);

    if (!job) {
      throw new Error(`Makima job not found: ${id}`);
    }

    const newFullOutput = (job.fullOutput ?? '') + chunk;
    const newLastOutputChunk = newFullOutput.slice(-500);

    const result = await db
      .update(makimaJobs)
      .set({ fullOutput: newFullOutput, lastOutputChunk: newLastOutputChunk })
      .where(eq(makimaJobs.id, id))
      .returning();

    return selectMakimaJobSchema.parse(result[0]);
  });
}

/**
 * Mark job as done with Aki verification
 */
export function finishMakimaJob(
  id: string,
  akiVerification: string,
  summary?: string
): Promise<Result<MakimaJob>> {
  return safeQuery(async () => {
    const result = await db
      .update(makimaJobs)
      .set({
        status: 'done',
        finishedAt: Date.now(),
        akiVerification,
        ...(summary ? { summary } : {}),
      })
      .where(eq(makimaJobs.id, id))
      .returning();

    return selectMakimaJobSchema.parse(result[0]);
  });
}

/**
 * Mark job as failed
 */
export function failMakimaJob(id: string): Promise<Result<MakimaJob>> {
  return safeQuery(async () => {
    const result = await db
      .update(makimaJobs)
      .set({
        status: 'error',
        finishedAt: Date.now(),
      })
      .where(eq(makimaJobs.id, id))
      .returning();

    return selectMakimaJobSchema.parse(result[0]);
  });
}

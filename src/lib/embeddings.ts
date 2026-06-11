import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { type Result, safeQuery } from '@/db/result';
import { messages } from '@/db/schema';
import { ollamaLocal } from '@/lib/ollama';

const EMBEDDING_MODEL = 'embeddinggemma:300m';
const SIMILARITY_THRESHOLD = 0.7;

/**
 * Generates an embedding for a given text using the local Ollama instance.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ollamaLocal.embed({
    model: EMBEDDING_MODEL,
    input: text,
  });

  // embeddinggemma:300m returns a single embedding array
  const embedding = response.embeddings[0];
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Invalid embedding response from Ollama');
  }

  return embedding;
}

/**
 * Stores the embedding for a message in the database.
 * Called fire-and-forget after message creation.
 */
export async function storeMessageEmbedding(messageId: string, content: string): Promise<void> {
  try {
    const embedding = await generateEmbedding(content);
    await db
      .update(messages)
      .set({ embedding: JSON.stringify(embedding) })
      .where(eq(messages.id, messageId));
    console.log(`[embeddings] Stored embedding for message ${messageId}`);
  } catch (error) {
    console.error(`[embeddings] Failed to store embedding for message ${messageId}:`, error);
  }
}

/**
 * Cosine similarity between two vectors.
 * Returns a value between -1 and 1.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search messages in a chat by semantic similarity to a query.
 * Returns the most similar messages sorted by relevance.
 *
 * @param chatId - The chat to search within
 * @param query - The search query
 * @param limit - Max results (default 5, max 11)
 * @param threshold - Minimum similarity threshold (default 0.7)
 */
export async function searchMessagesByEmbedding(
  chatId: string,
  query: string,
  limit = 5,
  threshold = SIMILARITY_THRESHOLD
): Promise<
  Array<{ id: string; role: string; content: string; createdAt: number; similarity: number }>
> {
  const effectiveLimit = Math.min(Math.max(1, limit), 11);

  // 1. Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Load all messages with embeddings from this chat
  const chatMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
      embedding: messages.embedding,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId));

  // 3. Filter messages that have embeddings and compute similarity
  const scored = chatMessages
    .filter((msg) => msg.embedding !== null && msg.embedding !== '')
    .map((msg) => {
      try {
        const msgEmbedding = JSON.parse(msg.embedding!);
        const similarity = cosineSimilarity(queryEmbedding, msgEmbedding);
        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
          similarity,
        };
      } catch {
        return null;
      }
    })
    .filter(
      (item): item is NonNullable<typeof item> => item !== null && item.similarity >= threshold
    );

  // 4. Sort by similarity descending and take top N
  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, effectiveLimit);
}

/**
 * Safe wrapper for searchMessagesByEmbedding returning Result type
 */
export function searchMessagesByEmbeddingSafe(
  chatId: string,
  query: string,
  limit = 5,
  threshold = SIMILARITY_THRESHOLD
): Promise<
  Result<
    Array<{ id: string; role: string; content: string; createdAt: number; similarity: number }>
  >
> {
  return safeQuery(() => searchMessagesByEmbedding(chatId, query, limit, threshold));
}

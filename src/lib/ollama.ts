import { Ollama } from 'ollama';
import { env } from '@/env';

/**
 * Remote Ollama instance (Ollama Cloud).
 * Used for chat completions (Aki, Reze, Makima).
 * Requires API key authentication.
 */
export const ollamaRemote = new Ollama({
  host: env.OLLAMA_REMOTE_URL,
  headers: {
    Authorization: `Bearer ${env.OLLAMA_API_KEY}`,
  },
});

/**
 * Local Ollama instance (localhost:11434).
 * Used for embeddings generation.
 * Does NOT require API key.
 */
export const ollamaLocal = new Ollama({
  host: env.OLLAMA_LOCAL_URL,
});

/**
 * @deprecated Use ollamaRemote or ollamaLocal explicitly.
 * Default export preserved for backwards compatibility.
 */
export const ollama = ollamaRemote;

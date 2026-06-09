import { Ollama } from 'ollama';
import { env } from '@/env';

export const ollama = new Ollama({
  host: 'https://ollama.com',
  headers: {
    Authorization: `Bearer ${env.OLLAMA_API_KEY}`,
  },
});

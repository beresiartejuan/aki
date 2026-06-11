import Database from 'better-sqlite3';
import { Ollama } from 'ollama';
import * as fs from 'node:fs';
import * as path from 'node:path';

function loadEnv(): string {
  try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const match = envContent.match(/DB_PATH=(.+)/);
    if (match) return match[1].trim();
  } catch { /* ignore */ }
  return './data/aki.db';
}

const DB_PATH = loadEnv();
const sqlite = new Database(path.resolve(DB_PATH));

const ollama = new Ollama({ host: 'http://localhost:11434' });
const EMBEDDING_MODEL = 'embeddinggemma:300m';

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ollama.embed({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.embeddings[0];
}

function cosineSimilarity(a: number[], b: number[]): number {
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

async function test() {
  // Create test chat
  const chatId = crypto.randomUUID();
  const now = Date.now();
  sqlite.exec(`
    INSERT INTO chats (id, user_id, agent_config_id, title, is_pinned, created_at, updated_at)
    VALUES ('${chatId}', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Test embeddings', 0, ${now}, ${now})
  `);

  const testMessages = [
    'Me gusta mucho el color azul',
    'Prefiero la musica rock',
    'Estoy aprendiendo a programar en TypeScript',
    'El clima esta muy lindo hoy',
    'TypeScript es mejor que JavaScript',
  ];

  for (const content of testMessages) {
    const msgId = crypto.randomUUID();
    const emb = await generateEmbedding(content);
    sqlite.prepare(`
      INSERT INTO messages (id, chat_id, role, content, embedding, created_at)
      VALUES (?, ?, 'user', ?, ?, ?)
    `).run(msgId, chatId, content, JSON.stringify(emb), Date.now());
  }

  // Search with different queries
  const queries = ['typescript', 'programar', 'color', 'musica', 'clima'];

  for (const query of queries) {
    console.log(`\n[test] Searching for "${query}"...`);
    const queryEmbedding = await generateEmbedding(query);

    const rows = sqlite.prepare(`SELECT id, content, embedding FROM messages WHERE chat_id = ? AND embedding IS NOT NULL`).all(chatId) as Array<{ id: string; content: string; embedding: string }>;

    const results = rows.map((row) => {
      const msgEmbedding = JSON.parse(row.embedding);
      const similarity = cosineSimilarity(queryEmbedding, msgEmbedding);
      return { content: row.content, similarity };
    }).sort((a, b) => b.similarity - a.similarity);

    for (const r of results) {
      console.log(`  sim=${(r.similarity * 100).toFixed(1)}% | "${r.content}"`);
    }
  }

  sqlite.close();
}

test().catch((err) => {
  console.error('[test] Error:', err);
  sqlite.close();
  process.exit(1);
});

import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Read DB_PATH from .env or use default
function loadEnv(): string {
  try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const match = envContent.match(/DB_PATH=(.+)/);
    if (match) return match[1].trim();
  } catch {
    // ignore
  }
  return './data/aki.db';
}

const DB_PATH = loadEnv();
const absolutePath = path.resolve(DB_PATH);
console.log('[reset-db] Using DB:', absolutePath);

const sqlite = new Database(absolutePath);

console.log('[reset-db] Truncating all non-auth tables...');

const tablesToTruncate = [
  'makima_jobs',
  'shared_chats',
  'attachments',
  'agent_memory',
  'chat_summaries',
  'messages',
  'chats',
  'agent_config',
];

for (const table of tablesToTruncate) {
  try {
    sqlite.exec(`DELETE FROM ${table}`);
    console.log(`[reset-db] Truncated: ${table}`);
  } catch (err) {
    console.error(`[reset-db] Failed to truncate ${table}:`, (err as Error).message);
  }
}

console.log('[reset-db] Reset complete. Auth tables (users, sessions) preserved.');
sqlite.close();

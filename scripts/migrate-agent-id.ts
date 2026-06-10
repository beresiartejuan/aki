/**
 * Migration script: add agent_id column to messages table.
 * Run with: npx tsx scripts/migrate-agent-id.ts
 */
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || './data/aki.db';

const db = new Database(DB_PATH);

// Check if column already exists
const tableInfo = db.prepare("PRAGMA table_info(messages)").all() as Array<{ name: string }>;
const hasAgentId = tableInfo.some((col) => col.name === 'agent_id');

if (hasAgentId) {
  console.log('[migrate] Column agent_id already exists. Skipping.');
  process.exit(0);
}

// Add the column
db.exec(`ALTER TABLE messages ADD COLUMN agent_id TEXT;`);

// Backfill existing assistant messages with the default agent ID
db.exec(`UPDATE messages SET agent_id = '00000000-0000-0000-0000-000000000002' WHERE role = 'assistant' AND agent_id IS NULL;`);

console.log('[migrate] Column agent_id added and backfilled successfully.');
process.exit(0);

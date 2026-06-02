import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

// Create the SQLite connection
const sqlite = new Database("./data/aki.db");

// Enable WAL mode for better performance
sqlite.pragma("journal_mode = WAL");

// Create the Drizzle instance
const db = drizzle(sqlite);

// Insert default user
const userStmt = sqlite.prepare(`
  INSERT OR REPLACE INTO users (id, name, plan, created_at)
  VALUES (?, ?, ?, ?)
`);

userStmt.run("default-user", "Usuario", "free", Date.now());

console.log("Default user created/updated");

// Insert default agent config
const agentStmt = sqlite.prepare(`
  INSERT OR REPLACE INTO agent_config (id, name, system_prompt, model, temperature, max_tokens, thinking_enabled, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

agentStmt.run(
  "default-agent",
  "Aki",
  "You are Aki, a helpful AI assistant.",
  "qwen3.5",
  0.7,
  2048,
  0,
  Date.now(),
  Date.now()
);

console.log("Default agent config created/updated");

// Insert default chat
const chatStmt = sqlite.prepare(`
  INSERT OR REPLACE INTO chats (id, user_id, agent_config_id, title, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

chatStmt.run(
  "default-chat-id",
  "default-user",
  "default-agent",
  "Nueva conversación",
  Date.now(),
  Date.now()
);

console.log("Default chat created/updated");

sqlite.close();
console.log("Database initialization complete");
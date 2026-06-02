import { drizzle } from "drizzle-orm/better-sqlite3";
// @ts-expect-error: better-sqlite3 has no type declarations
import Database from "better-sqlite3";
import * as schema from "./schema";
import { env } from "../env";
import { ensureDefaults } from "./seed";

// Create the SQLite connection
const sqlite = new Database(env.DB_PATH);

// Enable WAL mode for better performance
sqlite.pragma("journal_mode = WAL");

// Create the Drizzle instance
export const db = drizzle(sqlite, { schema });

// Ensure default data exists (fire-and-forget)
ensureDefaults().catch(console.error);
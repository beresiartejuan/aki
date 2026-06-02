import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";
import { env } from "../env.js";

// Create the SQLite connection
const sqlite = new Database(env.DB_PATH);

// Enable WAL mode for better performance
sqlite.pragma("journal_mode = WAL");

// Create the Drizzle instance
export const db = drizzle(sqlite, { schema });
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - represents the single local user
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("free"), // "free" | "pro"
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

// Agent configuration table - stores AI agent behavior settings
export const agentConfig = sqliteTable("agent_config", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(), // e.g. "Aki"
  systemPrompt: text("system_prompt").notNull(),
  model: text("model").notNull(), // e.g. "gpt-4o", "claude-3-5-sonnet"
  temperature: real("temperature").notNull().default(0.7),
  maxTokens: integer("max_tokens").notNull().default(2048),
  thinkingEnabled: integer("thinking_enabled").notNull().default(0), // 0 = false, 1 = true
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

// Chats table
export const chats = sqliteTable("chats", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  agentConfigId: text("agent_config_id")
    .notNull()
    .references(() => agentConfig.id),
  title: text("title").notNull(),
  projectTag: text("project_tag"), // e.g. "Proyecto", "Personal"
  isPinned: integer("is_pinned").notNull().default(0), // 0 = false, 1 = true
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

// Messages table
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant" | "system"
  content: text("content").notNull(),
  thinkingContent: text("thinking_content"), // stores chain-of-thought if thinking was on
  inputTokens: integer("input_tokens"), // nullable
  outputTokens: integer("output_tokens"), // nullable
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

// Zod schemas for users
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Zod schemas for agentConfig
export const insertAgentConfigSchema = createInsertSchema(agentConfig);
export const selectAgentConfigSchema = createSelectSchema(agentConfig);
export type AgentConfig = z.infer<typeof selectAgentConfigSchema>;
export type InsertAgentConfig = z.infer<typeof insertAgentConfigSchema>;

// Zod schemas for chats
export const insertChatSchema = createInsertSchema(chats);
export const selectChatSchema = createSelectSchema(chats);
export type Chat = z.infer<typeof selectChatSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;

// Zod schemas for messages
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export type Message = z.infer<typeof selectMessageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';

// Users table - represents the single local user
export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'), // "free" | "pro"
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Agent configuration table - stores AI agent behavior settings
export const agentConfig = sqliteTable('agent_config', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(), // e.g. "Aki"
  systemPrompt: text('system_prompt').notNull(),
  model: text('model').notNull(), // e.g. "gpt-4o", "claude-3-5-sonnet"
  temperature: real('temperature').notNull().default(0.7),
  maxTokens: integer('max_tokens').notNull().default(2048),
  thinkingEnabled: integer('thinking_enabled').notNull().default(0), // 0 = false, 1 = true
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Chats table
export const chats = sqliteTable('chats', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  agentConfigId: text('agent_config_id')
    .notNull()
    .references(() => agentConfig.id),
  title: text('title').notNull(),
  projectTag: text('project_tag'), // e.g. "Proyecto", "Personal"
  isPinned: integer('is_pinned').notNull().default(0), // 0 = false, 1 = true
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Messages table
export const messages = sqliteTable('messages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // "user" | "assistant" | "system"
  content: text('content').notNull(),
  thinkingContent: text('thinking_content'), // stores chain-of-thought if thinking was on
  inputTokens: integer('input_tokens'), // nullable
  outputTokens: integer('output_tokens'), // nullable
  makimaJobId: text('makima_job_id'), // FK to makima_jobs.id when Aki delegated
  agentId: text('agent_id'), // FK to agent_config.id — which agent sent this message
  embedding: text('embedding'), // JSON string of embedding vector for semantic search
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
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

// Chat summaries table - stores rolling summary of conversation
export const chatSummaries = sqliteTable('chat_summaries', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  chatId: text('chat_id')
    .notNull()
    .unique()
    .references(() => chats.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  messagesCovered: integer('messages_covered').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Agent memory table - stores structured facts across all conversations
export const agentMemory = sqliteTable(
  'agent_memory',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull(), // "preference" | "fact" | "decision" | "goal" | "context"
    key: text('key').notNull(),
    value: text('value').notNull(),
    confidence: real('confidence').notNull().default(1.0),
    lastSeenAt: integer('last_seen_at')
      .notNull()
      .$defaultFn(() => Date.now()),
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => ({
    // Unique index on (userId, key) for upsert operations
    userKeyIdx: uniqueIndex('user_key_idx').on(table.userId, table.key),
  })
);

// Zod schemas for chatSummaries
export const insertChatSummarySchema = createInsertSchema(chatSummaries);
export const selectChatSummarySchema = createSelectSchema(chatSummaries);
export type ChatSummary = z.infer<typeof selectChatSummarySchema>;
export type InsertChatSummary = z.infer<typeof insertChatSummarySchema>;

// Sessions table - for cookie-based authentication
export const sessions = sqliteTable('sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Attachments table - for file uploads
export const attachments = sqliteTable('attachments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  messageId: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  filePath: text('file_path').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Shared chats table - for public links
export const sharedChats = sqliteTable('shared_chats', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  shareHash: text('share_hash').notNull().unique(),
  isActive: integer('is_active').notNull().default(1), // 0 = false, 1 = true
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Zod schemas for sessions
export const insertSessionSchema = createInsertSchema(sessions);
export const selectSessionSchema = createSelectSchema(sessions);
export type Session = z.infer<typeof selectSessionSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;

// Zod schemas for attachments
export const insertAttachmentSchema = createInsertSchema(attachments);
export const selectAttachmentSchema = createSelectSchema(attachments);
export type Attachment = z.infer<typeof selectAttachmentSchema>;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

// Zod schemas for sharedChats
export const insertSharedChatSchema = createInsertSchema(sharedChats);
export const selectSharedChatSchema = createSelectSchema(sharedChats);
export type SharedChat = z.infer<typeof selectSharedChatSchema>;
export type InsertSharedChat = z.infer<typeof insertSharedChatSchema>;

// Zod schemas for agentMemory
export const insertAgentMemorySchema = createInsertSchema(agentMemory);
export const selectAgentMemorySchema = createSelectSchema(agentMemory);
export type AgentMemory = z.infer<typeof selectAgentMemorySchema>;
export type InsertAgentMemory = z.infer<typeof insertAgentMemorySchema>;

// Makima jobs table - tracks delegated tasks from Aki to Makima
export const makimaJobs = sqliteTable(
  'makima_jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    triggerMessageId: text('trigger_message_id'),
    prompt: text('prompt').notNull(),
    userMessage: text('user_message').notNull(),
    status: text('status', { enum: ['pending', 'running', 'done', 'error'] })
      .notNull()
      .default('pending'),
    fullOutput: text('full_output').default(''),
    lastOutputChunk: text('last_output_chunk').default(''),
    akiVerification: text('aki_verification').default(''),
    summary: text('summary').default(''),
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Date.now()),
    finishedAt: integer('finished_at'),
  },
  (table) => ({
    chatIdIdx: index('makima_jobs_chat_id_idx').on(table.chatId),
  })
);

// Zod schemas for makimaJobs
export const insertMakimaJobSchema = createInsertSchema(makimaJobs);
export const selectMakimaJobSchema = createSelectSchema(makimaJobs);
export type MakimaJob = z.infer<typeof selectMakimaJobSchema>;
export type InsertMakimaJob = z.infer<typeof insertMakimaJobSchema>;

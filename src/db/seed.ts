/**
 * Database seed script for initializing default data.
 * Ensures default user and agent config exist on startup.
 */

import { upsertUser, upsertAgentConfig } from './queries/config'
import { DEFAULT_USER_ID, DEFAULT_AGENT_ID } from '../lib/constants'
import { env } from '../env'

/**
 * Ensures the default user and agent config exist in the database.
 * Uses upsert operations so it's safe to call multiple times.
 */
export async function ensureDefaults(): Promise<void> {
  console.log('[seed] Ensuring default user and agent config exist...')
  
  // Ensure default user exists
  const userResult = await upsertUser({
    id: DEFAULT_USER_ID,
    name: 'Usuario',
    plan: 'free',
    createdAt: Date.now(),
  })
  
  if (!userResult.ok) {
    console.error('[seed] Failed to upsert default user:', userResult.error)
    throw userResult.error
  }
  
  console.log('[seed] Default user ensured:', userResult.data.id)
  
  // Ensure default agent config exists
  const agentResult = await upsertAgentConfig({
    id: DEFAULT_AGENT_ID,
    name: 'Aki',
    systemPrompt: `You are Aki, a helpful AI assistant with access to filesystem and shell tools.

You can read, write, create, move, and delete files and directories, and run shell commands. All file operations are sandboxed to the workspace directory.

When a user asks you to work with files or run commands, use your tools directly without asking for confirmation first — just do it and report what you did.
Be concise in your tool use: prefer one well-targeted tool call over multiple exploratory ones.

Always show the user what you did and what the result was.`,
    model: env.OLLAMA_MODEL,
    temperature: 0.7,
    maxTokens: 2048,
    thinkingEnabled: 0, // SQLite uses 0/1 for boolean
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  
  if (!agentResult.ok) {
    console.error('[seed] Failed to upsert agent config:', agentResult.error)
    throw agentResult.error
  }
  
  console.log('[seed] Default agent config ensured:', agentResult.data.id)
  console.log('[seed] Database seed complete')
}

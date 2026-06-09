import { upsertAgentConfig, upsertUser } from '@/db/queries/config';
import { env } from '@/env';
import { DEFAULT_AGENT_ID, DEFAULT_USER_ID } from './constants';

export async function initializeDatabase() {
  try {
    // Create default user
    const userResult = await upsertUser({
      id: DEFAULT_USER_ID,
      name: 'Usuario',
      plan: 'free',
      createdAt: Date.now(),
    });

    if (!userResult.ok) {
      console.error('Failed to create default user:', userResult.error);
      return;
    }

    console.log('Default user created/updated');

    // Create default agent config
    const agentResult = await upsertAgentConfig({
      id: DEFAULT_AGENT_ID,
      name: 'Aki',
      systemPrompt: 'You are Aki, a helpful AI assistant.',
      model: env.OLLAMA_MODEL,
      temperature: 0.7,
      maxTokens: 2048,
      thinkingEnabled: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (!agentResult.ok) {
      console.error('Failed to create default agent config:', agentResult.error);
      return;
    }

    console.log('Default agent config created/updated');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

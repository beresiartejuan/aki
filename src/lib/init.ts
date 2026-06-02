import { upsertUser, upsertAgentConfig } from '../db/queries/config.js'
import { createChat } from '../db/queries/chats.js'

const DEFAULT_USER_ID = 'default-user'
const DEFAULT_AGENT_ID = 'default-agent'
const DEFAULT_CHAT_ID = 'default-chat-id'

export async function initializeDatabase() {
  try {
    // Create default user
    const userResult = await upsertUser({
      id: DEFAULT_USER_ID,
      name: 'Usuario',
      plan: 'free',
      createdAt: Date.now()
    })
    
    if (!userResult.ok) {
      console.error('Failed to create default user:', userResult.error)
      return
    }
    
    console.log('Default user created/updated')
    
    // Create default agent config
    const agentResult = await upsertAgentConfig({
      id: DEFAULT_AGENT_ID,
      name: 'Aki',
      systemPrompt: 'You are Aki, a helpful AI assistant.',
      model: 'qwen3.5',
      temperature: 0.7,
      maxTokens: 2048,
      thinkingEnabled: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    
    if (!agentResult.ok) {
      console.error('Failed to create default agent config:', agentResult.error)
      return
    }
    
    console.log('Default agent config created/updated')
    
    // Try to create default chat, but ignore if it already exists
    try {
      await createChat({
        id: DEFAULT_CHAT_ID,
        userId: DEFAULT_USER_ID,
        agentConfigId: DEFAULT_AGENT_ID,
        title: 'Nueva conversación',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      console.log('Default chat created')
    } catch (error) {
      // If chat already exists, that's fine
      console.log('Default chat already exists')
    }
  } catch (error) {
    console.error('Database initialization error:', error)
  }
}
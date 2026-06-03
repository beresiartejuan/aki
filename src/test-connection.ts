import { db } from './db';
import { agentConfig, chats, messages, users } from './db/schema';

async function test() {
  try {
    // Test querying each table
    const usersResult = await db.select().from(users).limit(1);
    console.log('Users table accessible:', usersResult);

    const agentConfigsResult = await db.select().from(agentConfig).limit(1);
    console.log('Agent configs table accessible:', agentConfigsResult);

    const chatsResult = await db.select().from(chats).limit(1);
    console.log('Chats table accessible:', chatsResult);

    const messagesResult = await db.select().from(messages).limit(1);
    console.log('Messages table accessible:', messagesResult);

    console.log('All tables are accessible!');
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

test();

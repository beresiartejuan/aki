import { getAgentConfig } from '@/db/queries/config';
import { getMemoryByUser } from '@/db/queries/memory';
import { getMessagesByChatId } from '@/db/queries/messages';
import { getSummaryByChatId } from '@/db/queries/summaries';
import { type Result, safeQuery } from '@/db/result';
import type { AgentMemory, ChatSummary } from '@/db/schema';
import { env } from '@/env';
import { DEFAULT_AGENT_ID } from './constants';

// Constants for context management
const RECENT_MESSAGES_LIMIT = 10;
const SUMMARIZE_AFTER = 14;
const MAX_SUMMARY_AGE = 20;

// Types for Ollama messages
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

interface AgentConfig {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  thinkingEnabled: boolean;
}

export type BuiltContext = {
  systemPrompt: string;
  messages: OllamaMessage[];
  shouldSummarize: boolean;
  totalMessages: number;
};

/**
 * Builds the full context for an agent turn, including system prompt with
 * conversation summary and user memory injected.
 */
export async function buildContext(
  chatId: string,
  userId: string,
  agentId?: string
): Promise<Result<BuiltContext>> {
  return safeQuery(async () => {
    // 1. LOAD ALL MESSAGES for the chat
    const messagesResult = await getMessagesByChatId(chatId);
    if (!messagesResult.ok) {
      throw new Error(`Failed to load messages: ${messagesResult.error.message}`);
    }

    // Filter out system messages
    const allMessages = messagesResult.data.filter((msg) => msg.role !== 'system');
    const totalMessages = allMessages.length;

    // 2. LOAD EXISTING SUMMARY
    const summaryResult = await getSummaryByChatId(chatId);
    let summary: ChatSummary | undefined;
    if (summaryResult.ok && summaryResult.data) {
      summary = summaryResult.data;
    }

    // 3. LOAD AGENT MEMORY
    const memoryResult = await getMemoryByUser(userId);
    let memories: AgentMemory[] = [];
    if (memoryResult.ok && memoryResult.data) {
      memories = memoryResult.data;
    }

    // 4. DECIDE RECENT SLICE
    const recentMessages = allMessages.slice(-RECENT_MESSAGES_LIMIT).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // 5. DETECT IF SUMMARIZATION IS NEEDED
    const shouldSummarize =
      totalMessages > SUMMARIZE_AFTER &&
      (!summary || summary.messagesCovered < totalMessages - MAX_SUMMARY_AGE);

    // 6. LOAD AGENT CONFIG
    const effectiveAgentId = agentId ?? DEFAULT_AGENT_ID;
    const agentResult = await getAgentConfig(effectiveAgentId);
    let agentConfig: AgentConfig;

    if (!agentResult.ok || !agentResult.data) {
      // Use fallback values if agent config not found
      const isReze = effectiveAgentId !== DEFAULT_AGENT_ID;
      agentConfig = {
        systemPrompt: isReze
          ? 'You are Reze, a proactive and efficient AI assistant with full filesystem and command access.'
          : 'You are Aki, a helpful AI assistant.',
        model: isReze ? env.REZE_MODEL : env.OLLAMA_MODEL,
        temperature: 0.7,
        maxTokens: 2048,
        thinkingEnabled: false,
      };
    } else {
      agentConfig = {
        systemPrompt: agentResult.data.systemPrompt,
        model: agentResult.data.model,
        temperature: agentResult.data.temperature,
        maxTokens: agentResult.data.maxTokens,
        thinkingEnabled: agentResult.data.thinkingEnabled === 1,
      };
    }

    // 7. BUILD SYSTEM PROMPT
    const systemPrompt = buildSystemPrompt(agentConfig.systemPrompt, summary, memories);

    // 8. RETURN the BuiltContext
    return {
      systemPrompt,
      messages: recentMessages,
      shouldSummarize,
      totalMessages,
    };
  });
}

/**
 * Builds the full system prompt by injecting summary and memory into the base prompt
 */
function buildSystemPrompt(
  basePrompt: string,
  summary: ChatSummary | undefined,
  memories: AgentMemory[]
): string {
  const sections: string[] = [basePrompt];

  // Add conversation summary section if available
  if (summary && summary.messagesCovered > 0 && summary.summary) {
    sections.push(
      `\n## Conversation so far\nThe following is a summary of the earlier conversation with the user:\n${summary.summary}`
    );
  }

  // Add memory section if there are memories
  if (memories.length > 0) {
    const memoryLines = memories.map(
      (memory) => `[${memory.category}] ${memory.key}: ${memory.value}`
    );
    sections.push(`\n## What you know about the user\n${memoryLines.join('\n')}`);
  }

  return sections.join('\n');
}

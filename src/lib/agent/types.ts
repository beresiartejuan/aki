import type { ToolCall } from 'ollama';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string;
}

export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  thinkingConfig: boolean;
}

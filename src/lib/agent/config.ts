import { getAgentConfig } from '../../db/queries/config';
import { env } from '../../env';
import { DEFAULT_AGENT_ID } from '../constants';
import type { AgentConfig } from './types';

export async function loadAgentConfig(): Promise<AgentConfig> {
  const agentResult = await getAgentConfig(DEFAULT_AGENT_ID);
  
  return {
    model: agentResult.ok && agentResult.data ? agentResult.data.model : env.OLLAMA_MODEL,
    temperature: agentResult.ok && agentResult.data ? agentResult.data.temperature : 0.7,
    maxTokens: agentResult.ok && agentResult.data ? agentResult.data.maxTokens : 2048,
    thinkingConfig: agentResult.ok && agentResult.data ? agentResult.data.thinkingEnabled === 1 : false,
  };
}

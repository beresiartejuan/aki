import { getAgentConfig } from '@/db/queries/config';
import { env } from '@/env';
import { DEFAULT_AGENT_ID } from '@/lib/constants';
import type { AgentConfig } from './types';

export async function loadAgentConfig(agentId?: string): Promise<AgentConfig> {
  const effectiveId = agentId ?? DEFAULT_AGENT_ID;
  const agentResult = await getAgentConfig(effectiveId);

  const isReze = effectiveId !== DEFAULT_AGENT_ID;

  return {
    model:
      agentResult.ok && agentResult.data
        ? agentResult.data.model
        : isReze
          ? env.REZE_MODEL
          : env.OLLAMA_MODEL,
    temperature: agentResult.ok && agentResult.data ? agentResult.data.temperature : 0.7,
    maxTokens: agentResult.ok && agentResult.data ? agentResult.data.maxTokens : 2048,
    thinkingConfig:
      agentResult.ok && agentResult.data ? agentResult.data.thinkingEnabled === 1 : false,
  };
}

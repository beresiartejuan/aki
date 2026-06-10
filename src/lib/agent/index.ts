import { DEFAULT_USER_ID } from '@/lib/constants';
import { runAgentTurnWithUser } from './non-streaming';
import { runRezeTurn } from './reze-non-streaming';
import { streamRezeTurn } from './reze-streaming';
import { streamAgentTurn } from './streaming';

export { runAgentTurnWithUser, runRezeTurn, streamAgentTurn, streamRezeTurn };

// Backwards compatibility
export async function runAgentTurn(chatId: string, userContent: string, thinkingEnabled: boolean) {
  return runAgentTurnWithUser(chatId, DEFAULT_USER_ID, userContent, thinkingEnabled);
}

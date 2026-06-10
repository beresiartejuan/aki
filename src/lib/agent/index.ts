import { DEFAULT_USER_ID } from '@/lib/constants';
import { runRezeTurn } from './reze-non-streaming';
import { streamRezeTurn } from './reze-streaming';
import { runAgentTurnWithUser } from './non-streaming';
import { streamAgentTurn } from './streaming';

export { runAgentTurnWithUser, streamAgentTurn, streamRezeTurn, runRezeTurn };

// Backwards compatibility
export async function runAgentTurn(chatId: string, userContent: string, thinkingEnabled: boolean) {
  return runAgentTurnWithUser(chatId, DEFAULT_USER_ID, userContent, thinkingEnabled);
}

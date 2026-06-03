import { runAgentTurnWithUser } from './non-streaming';
import { streamAgentTurn } from './streaming';
import { DEFAULT_USER_ID } from '../constants';

export { runAgentTurnWithUser, streamAgentTurn };

// Backwards compatibility
export async function runAgentTurn(
  chatId: string,
  userContent: string,
  thinkingEnabled: boolean
) {
  return runAgentTurnWithUser(chatId, DEFAULT_USER_ID, userContent, thinkingEnabled);
}

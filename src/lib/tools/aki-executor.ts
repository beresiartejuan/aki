import type { ToolCall } from 'ollama';
import { searchMessagesTool } from './search-messages';

/**
 * Execute a tool call for Aki and return the result as a string.
 * All errors are caught and returned as strings.
 *
 * @param call - The tool call from Ollama
 * @param chatId - The current chat ID (needed for search_messages scope)
 * @returns Human-readable result or error message
 */
export async function executeAkiTool(call: ToolCall, chatId: string): Promise<string> {
  const name = call.function.name;
  const args = call.function.arguments as Record<string, unknown>;

  try {
    switch (name) {
      case 'search_messages': {
        if (!args.query) return 'Error: query is required';
        const limit = typeof args.limit === 'number' ? args.limit : 5;
        return await searchMessagesTool(chatId, String(args.query), limit);
      }

      default: {
        return `Error: unknown tool: ${name}`;
      }
    }
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
}

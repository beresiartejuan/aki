import type { ToolCall } from 'ollama';
import { editFile, listDirectory, readFile, runCommand, writeFile } from './reze-fs';
import { searchMessagesTool } from './search-messages';

/**
 * Execute a tool call for Reze and return the result as a string.
 * All errors are caught and returned as strings.
 * No sandbox restrictions — operates anywhere in user's home directory.
 *
 * @param call - The tool call from Ollama
 * @param chatId - The current chat ID (needed for search_messages)
 * @returns Human-readable result or error message
 */
export async function executeRezeTool(call: ToolCall, chatId: string): Promise<string> {
  const name = call.function.name;
  const args = call.function.arguments as Record<string, unknown>;

  try {
    switch (name) {
      case 'read_file': {
        if (!args.filePath) return 'Error: filePath is required';
        return await readFile(String(args.filePath));
      }

      case 'write_file': {
        if (!args.filePath) return 'Error: filePath is required';
        if (args.content === undefined) return 'Error: content is required';
        return await writeFile(String(args.filePath), String(args.content));
      }

      case 'edit_file': {
        if (!args.filePath) return 'Error: filePath is required';
        if (!args.oldString) return 'Error: oldString is required';
        if (!args.newString) return 'Error: newString is required';
        return await editFile(
          String(args.filePath),
          String(args.oldString),
          String(args.newString)
        );
      }

      case 'list_directory': {
        return await listDirectory(String(args.dirPath ?? '.'));
      }

      case 'run_command': {
        if (!args.command) return 'Error: command is required';
        return await runCommand(
          String(args.command),
          args.workingDir ? String(args.workingDir) : undefined
        );
      }

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

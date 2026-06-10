import type { ToolCall } from 'ollama';
import { readFile, writeFile, editFile, listDirectory, runCommand } from './reze-fs';

/**
 * Execute a tool call for Reze and return the result as a string.
 * All errors are caught and returned as strings.
 * No sandbox restrictions — operates anywhere in user's home directory.
 *
 * @param call - The tool call from Ollama
 * @returns Human-readable result or error message
 */
export async function executeRezeTool(call: ToolCall): Promise<string> {
  const name = call.function.name;
  const args = call.function.arguments as Record<string, string | undefined>;

  try {
    switch (name) {
      case 'read_file': {
        if (!args.filePath) return 'Error: filePath is required';
        return await readFile(args.filePath);
      }

      case 'write_file': {
        if (!args.filePath) return 'Error: filePath is required';
        if (args.content === undefined) return 'Error: content is required';
        return await writeFile(args.filePath, args.content);
      }

      case 'edit_file': {
        if (!args.filePath) return 'Error: filePath is required';
        if (!args.oldString) return 'Error: oldString is required';
        if (!args.newString) return 'Error: newString is required';
        return await editFile(args.filePath, args.oldString, args.newString);
      }

      case 'list_directory': {
        return await listDirectory(args.dirPath ?? '.');
      }

      case 'run_command': {
        if (!args.command) return 'Error: command is required';
        return await runCommand(args.command, args.workingDir);
      }

      default: {
        return `Error: unknown tool: ${name}`;
      }
    }
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
}

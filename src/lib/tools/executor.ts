import type { ToolCall } from 'ollama';
import * as fs from './filesystem';
import * as sh from './shell';

/**
 * Execute a tool call and return the result as a string.
 * All errors are caught and returned as strings.
 *
 * @param call - The tool call from Ollama
 * @returns Human-readable result or error message
 */
export async function executeTool(call: ToolCall): Promise<string> {
  const name = call.function.name;
  const args = call.function.arguments as Record<string, string | undefined>;

  try {
    switch (name) {
      case 'read_file': {
        if (!args.filePath) return 'Error: filePath is required';
        return await fs.readFile(args.filePath);
      }

      case 'write_file': {
        if (!args.filePath) return 'Error: filePath is required';
        if (args.content === undefined) return 'Error: content is required';
        return await fs.writeFile(args.filePath, args.content);
      }

      case 'list_directory': {
        return await fs.listDirectory(args.dirPath ?? '.');
      }

      case 'create_directory': {
        if (!args.dirPath) return 'Error: dirPath is required';
        return await fs.createDirectory(args.dirPath);
      }

      case 'delete_file': {
        if (!args.filePath) return 'Error: filePath is required';
        return await fs.deleteFile(args.filePath);
      }

      case 'delete_directory': {
        if (!args.dirPath) return 'Error: dirPath is required';
        return await fs.deleteDirectory(args.dirPath);
      }

      case 'move_file': {
        if (!args.sourcePath) return 'Error: sourcePath is required';
        if (!args.destPath) return 'Error: destPath is required';
        return await fs.moveFile(args.sourcePath, args.destPath);
      }

      case 'search_files': {
        if (!args.dirPath) return 'Error: dirPath is required';
        if (!args.pattern) return 'Error: pattern is required';
        return await fs.searchFiles(args.dirPath, args.pattern);
      }

      case 'run_command': {
        if (!args.command) return 'Error: command is required';
        return await sh.runCommand(args.command, args.workingDir);
      }

      default: {
        return `Error: unknown tool: ${name}`;
      }
    }
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
}

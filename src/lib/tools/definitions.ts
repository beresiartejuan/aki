/**
 * Ollama tool definitions for filesystem and shell operations.
 * Each tool follows the Ollama format for function calling.
 */

import type { Tool } from 'ollama';

export const TOOL_DEFINITIONS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        required: ['filePath'],
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute or relative path to the file',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file, creating it or overwriting it',
      parameters: {
        type: 'object',
        required: ['filePath', 'content'],
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute or relative path to the file',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List files and subdirectories in a directory',
      parameters: {
        type: 'object',
        required: ['dirPath'],
        properties: {
          dirPath: {
            type: 'string',
            description: 'Absolute or relative path to the directory. Use "." for workspace root',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_directory',
      description: 'Create a directory and any missing parent directories',
      parameters: {
        type: 'object',
        required: ['dirPath'],
        properties: {
          dirPath: {
            type: 'string',
            description: 'Absolute or relative path to the directory',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete a single file',
      parameters: {
        type: 'object',
        required: ['filePath'],
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute or relative path to the file',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_directory',
      description: 'Delete a directory and all its contents recursively',
      parameters: {
        type: 'object',
        required: ['dirPath'],
        properties: {
          dirPath: {
            type: 'string',
            description: 'Absolute or relative path to the directory',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_file',
      description: 'Move or rename a file or directory',
      parameters: {
        type: 'object',
        required: ['sourcePath', 'destPath'],
        properties: {
          sourcePath: {
            type: 'string',
            description: 'Source path (absolute or relative)',
          },
          destPath: {
            type: 'string',
            description: 'Destination path (absolute or relative)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Search for files by name pattern within a directory',
      parameters: {
        type: 'object',
        required: ['dirPath', 'pattern'],
        properties: {
          dirPath: {
            type: 'string',
            description: 'Directory to search in',
          },
          pattern: {
            type: 'string',
            description: 'File name pattern to search for (case-insensitive substring match)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description:
        'Execute a shell command in the workspace. Use for running scripts, package managers, git, etc.',
      parameters: {
        type: 'object',
        required: ['command'],
        properties: {
          command: {
            type: 'string',
            description: 'Shell command to execute',
          },
          workingDir: {
            type: 'string',
            description: 'Working directory for the command (optional, defaults to workspace root)',
          },
        },
      },
    },
  },
];

/**
 * Union type of all available tool names.
 */
export type ToolName =
  | 'read_file'
  | 'write_file'
  | 'list_directory'
  | 'create_directory'
  | 'delete_file'
  | 'delete_directory'
  | 'move_file'
  | 'search_files'
  | 'run_command';

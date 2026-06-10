/**
 * Ollama tool definitions for Reze agent.
 * Reduced toolset: only essential filesystem and shell operations.
 * No sandbox restrictions — operates anywhere in user's home directory.
 */

import type { Tool } from 'ollama';

export const REZE_TOOL_DEFINITIONS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file. Returns first 100KB if the file is larger.',
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
      description: 'Write content to a file, creating it or overwriting it entirely',
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
      name: 'edit_file',
      description: 'Replace a specific string in an existing file with another string',
      parameters: {
        type: 'object',
        required: ['filePath', 'oldString', 'newString'],
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute or relative path to the file',
          },
          oldString: {
            type: 'string',
            description: 'Exact text to search for in the file',
          },
          newString: {
            type: 'string',
            description: 'Replacement text',
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
            description:
              'Absolute or relative path to the directory. Use "." for the current directory',
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
        'Execute a shell command anywhere in the filesystem. Use for running scripts, package managers, git, etc.',
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
            description: 'Working directory for the command (optional, defaults to home directory)',
          },
        },
      },
    },
  },
];

/**
 * Union type of Reze tool names.
 */
export type RezeToolName =
  | 'read_file'
  | 'write_file'
  | 'edit_file'
  | 'list_directory'
  | 'run_command';

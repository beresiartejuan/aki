import type { ToolCall } from 'ollama';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeTool } from '@/lib/tools/executor';

// Mock filesystem module (imported as ./fs from executor.ts)
vi.mock('../fs', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  listDirectory: vi.fn(),
  createDirectory: vi.fn(),
  deleteFile: vi.fn(),
  deleteDirectory: vi.fn(),
  moveFile: vi.fn(),
  searchFiles: vi.fn(),
}));

// Mock shell module
vi.mock('../shell', () => ({
  runCommand: vi.fn(),
}));

// Mock security and sandbox
vi.mock('../security', () => ({
  isBlockedCommand: vi.fn().mockReturnValue(false),
}));

vi.mock('../sandbox', () => ({
  WORKSPACE_ROOT: '/workspace',
  assertInsideSandbox: vi.fn(),
  assertSafeCommand: vi.fn(),
}));

// Import mocked modules
import * as fs from '@/lib/tools/fs';
import * as sh from '@/lib/tools/shell';

describe('executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeTool', () => {
    it('should execute read_file tool', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('file content');

      const result = await executeTool({
        function: {
          name: 'read_file',
          arguments: { filePath: '/workspace/file.txt' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith('/workspace/file.txt');
    });

    it('should execute write_file tool', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue('OK: wrote 12 characters');

      const result = await executeTool({
        function: {
          name: 'write_file',
          arguments: { filePath: '/workspace/file.txt', content: 'hello world' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('OK: wrote 12 characters');
      expect(fs.writeFile).toHaveBeenCalledWith('/workspace/file.txt', 'hello world');
    });

    it('should execute list_directory tool', async () => {
      vi.mocked(fs.listDirectory).mockResolvedValue('file1.txt\nfile2.txt');

      const result = await executeTool({
        function: {
          name: 'list_directory',
          arguments: { dirPath: '/workspace' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('file1.txt\nfile2.txt');
      expect(fs.listDirectory).toHaveBeenCalledWith('/workspace');
    });

    it('should execute create_directory tool', async () => {
      vi.mocked(fs.createDirectory).mockResolvedValue('OK: directory created');

      const result = await executeTool({
        function: {
          name: 'create_directory',
          arguments: { dirPath: '/workspace/newdir' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('OK: directory created');
      expect(fs.createDirectory).toHaveBeenCalledWith('/workspace/newdir');
    });

    it('should execute delete_file tool', async () => {
      vi.mocked(fs.deleteFile).mockResolvedValue('OK: deleted file');

      const result = await executeTool({
        function: {
          name: 'delete_file',
          arguments: { filePath: '/workspace/file.txt' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('OK: deleted file');
      expect(fs.deleteFile).toHaveBeenCalledWith('/workspace/file.txt');
    });

    it('should execute delete_directory tool', async () => {
      vi.mocked(fs.deleteDirectory).mockResolvedValue('OK: deleted directory');

      const result = await executeTool({
        function: {
          name: 'delete_directory',
          arguments: { dirPath: '/workspace/dir' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('OK: deleted directory');
      expect(fs.deleteDirectory).toHaveBeenCalledWith('/workspace/dir');
    });

    it('should execute move_file tool', async () => {
      vi.mocked(fs.moveFile).mockResolvedValue('OK: moved file');

      const result = await executeTool({
        function: {
          name: 'move_file',
          arguments: { sourcePath: '/workspace/old.txt', destPath: '/workspace/new.txt' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('OK: moved file');
      expect(fs.moveFile).toHaveBeenCalledWith('/workspace/old.txt', '/workspace/new.txt');
    });

    it('should execute search_files tool', async () => {
      vi.mocked(fs.searchFiles).mockResolvedValue('/workspace/result1.txt\n/workspace/result2.txt');

      const result = await executeTool({
        function: {
          name: 'search_files',
          arguments: { dirPath: '/workspace', pattern: 'result' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('/workspace/result1.txt\n/workspace/result2.txt');
      expect(fs.searchFiles).toHaveBeenCalledWith('/workspace', 'result');
    });

    it('should execute run_command tool', async () => {
      vi.mocked(sh.runCommand).mockResolvedValue('command output');

      const result = await executeTool({
        function: {
          name: 'run_command',
          arguments: { command: 'ls -la', workingDir: '/workspace' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('command output');
      expect(sh.runCommand).toHaveBeenCalledWith('ls -la', '/workspace');
    });

    it('should handle missing arguments', async () => {
      const result = await executeTool({
        function: {
          name: 'read_file',
          arguments: {},
        },
      } as unknown as ToolCall);

      expect(result).toBe('Error: filePath is required');
    });

    it('should handle unknown tools', async () => {
      const result = await executeTool({
        function: {
          name: 'unknown_tool',
          arguments: {},
        },
      } as unknown as ToolCall);

      expect(result).toBe('Error: unknown tool: unknown_tool');
    });

    it('should handle tool execution errors', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await executeTool({
        function: {
          name: 'read_file',
          arguments: { filePath: '/workspace/nonexistent/file.txt' },
        },
      } as unknown as ToolCall);

      expect(result).toBe('Error: File not found');
    });
  });
});

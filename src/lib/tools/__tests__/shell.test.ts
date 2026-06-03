import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../shell';

// Mock child_process and util
const mockExecAsync = vi.fn();

beforeAll(() => {
  vi.mock('child_process', () => ({
    exec: vi.fn(),
  }));

  vi.mock('util', () => ({
    promisify: vi.fn().mockReturnValue(mockExecAsync),
  }));

  // Mock security
  vi.mock('../security', () => ({
    isBlockedCommand: vi.fn().mockReturnValue(false),
  }));

  // Mock sandbox
  vi.mock('../sandbox', () => ({
    WORKSPACE_ROOT: '/workspace',
    assertInsideSandbox: vi.fn(),
  }));
});

describe('shell tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runCommand', () => {
    it('should execute command successfully', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Hello, world!',
        stderr: '',
      });

      const result = await runCommand('echo "Hello, world!"');
      expect(result).toBe('Hello, world!');
    });

    it('should handle command with stderr', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'output',
        stderr: 'error message',
      });

      const result = await runCommand('some-command');
      expect(result).toContain('output');
      expect(result).toContain('[stderr]: error message');
    });

    it('should handle command with only stderr', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: 'error message',
      });

      const result = await runCommand('some-command');
      expect(result).toBe('[stderr]: error message');
    });

    it('should return success message when no output', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: '',
      });

      const result = await runCommand('some-command');
      expect(result).toBe('Command executed successfully (no output)');
    });

    it('should block dangerous commands', async () => {
      // Re-mock the security function to return true for blocked commands
      vi.doMock('../security', () => ({
        isBlockedCommand: vi.fn().mockReturnValue(true),
      }));

      // Re-import the module to get the updated mock
      const { runCommand } = await import('../shell');
      const result = await runCommand('rm -rf /');
      expect(result).toContain('Error: Blocked command');
    });

    it('should handle command timeout', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command timed out after 15s'));

      const result = await runCommand('sleep 20');
      expect(result).toContain('Error: command timed out after 15s');
    });

    it('should truncate long output', async () => {
      const longOutput = 'a'.repeat(9000);
      mockExecAsync.mockResolvedValue({
        stdout: longOutput,
        stderr: '',
      });

      const result = await runCommand('some-command');
      expect(result).toContain('[... output truncated]');
    });

    it('should handle general execution errors', async () => {
      mockExecAsync.mockRejectedValue(new Error('Permission denied'));

      const result = await runCommand('some-command');
      expect(result).toContain('Error: Permission denied');
    });

    it('should handle errors with stderr', async () => {
      mockExecAsync.mockRejectedValue({
        message: 'Command failed',
        stderr: 'Detailed error message',
      });

      const result = await runCommand('some-command');
      expect(result).toContain('Error: Command failed');
      expect(result).toContain('Detailed error message');
    });
  });
});

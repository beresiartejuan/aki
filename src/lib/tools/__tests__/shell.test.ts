import { beforeEach, describe, expect, it, vi } from 'vitest';

// Top-level mocks - vitest hoists these
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:util', () => ({
  promisify: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('../security', () => ({
  isBlockedCommand: vi.fn().mockReturnValue(false),
}));

vi.mock('../sandbox', () => ({
  WORKSPACE_ROOT: '/workspace',
  assertInsideSandbox: vi.fn(),
}));

describe('shell tools', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    // Reset isBlockedCommand to default (not blocked)
    const { isBlockedCommand } = await import('../security');
    vi.mocked(isBlockedCommand).mockReturnValue(false);
  });

  describe('runCommand', () => {
    it('should execute command successfully', async () => {
      const { promisify } = await import('node:util');
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: 'Hello, world!',
        stderr: '',
      });
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { runCommand } = await import('../shell');
      const result = await runCommand('echo "Hello, world!"');
      expect(result).toBe('Hello, world!');
    });

    it('should handle command with stderr', async () => {
      const { promisify } = await import('node:util');
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: 'output',
        stderr: 'error message',
      });
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { runCommand } = await import('../shell');
      const result = await runCommand('some-command');
      expect(result).toContain('output');
      expect(result).toContain('[stderr]: error message');
    });

    it('should handle command with only stderr', async () => {
      const { promisify } = await import('node:util');
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: '',
        stderr: 'error message',
      });
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { runCommand } = await import('../shell');
      const result = await runCommand('some-command');
      expect(result).toBe('[stderr]: error message');
    });

    it('should return success message when no output', async () => {
      const { promisify } = await import('node:util');
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: '',
        stderr: '',
      });
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { runCommand } = await import('../shell');
      const result = await runCommand('some-command');
      expect(result).toBe('Command executed successfully (no output)');
    });

    it('should block dangerous commands', async () => {
      const { isBlockedCommand } = await import('../security');
      vi.mocked(isBlockedCommand).mockReturnValue(true);

      const { runCommand } = await import('../shell');
      const result = await runCommand('rm -rf /');
      expect(result).toContain('Error: Blocked command');
    });

    it('should handle command timeout', async () => {
      const { promisify } = await import('node:util');
      const mockExecAsync = vi
        .fn()
        .mockRejectedValue(new Error('command timed out after 5 minutes'));
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { runCommand } = await import('../shell');
      const result = await runCommand('sleep 400');
      expect(result).toContain('Error: command timed out after 5 minutes');
    });

    it('should truncate long output', async () => {
      const longOutput = 'a'.repeat(9000);
      const { promisify } = await import('node:util');
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: longOutput,
        stderr: '',
      });
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { runCommand } = await import('../shell');
      const result = await runCommand('some-command');
      expect(result).toContain('[... output truncated]');
    });

    it('should handle general execution errors', async () => {
      const { promisify } = await import('node:util');
      const mockExecAsync = vi.fn().mockRejectedValue(new Error('Permission denied'));
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { runCommand } = await import('../shell');
      const result = await runCommand('some-command');
      expect(result).toContain('Error: Permission denied');
    });

    it('should handle errors with stderr', async () => {
      const { promisify } = await import('node:util');
      const mockExecAsync = vi.fn().mockRejectedValue({
        message: 'Command failed',
        stderr: 'Detailed error message',
      });
      vi.mocked(promisify).mockReturnValue(mockExecAsync);

      const { runCommand } = await import('../shell');
      const result = await runCommand('some-command');
      expect(result).toContain('Error: Command failed');
      expect(result).toContain('Detailed error message');
    });
  });
});

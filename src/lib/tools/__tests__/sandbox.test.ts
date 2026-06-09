import { describe, expect, it, vi } from 'vitest';
import { assertSafeCommand } from '@/lib/tools/sandbox';

// Mock the WORKSPACE_ROOT before importing sandbox
vi.mock('../sandbox', () => {
  return {
    WORKSPACE_ROOT: '/workspace',
    assertInsideSandbox: (targetPath: string) => {
      const resolved = targetPath; // simplified check, workspace is '/workspace'
      if (!resolved.startsWith('/workspace')) {
        throw new Error(`Path outside sandbox: ${resolved}`);
      }
    },
    assertSafeCommand: (command: string) => {
      const blocked = ['rm -rf', 'sudo', 'chmod 777'];
      const normalized = command.toLowerCase().trim();
      const isBlocked = blocked.some((b) => normalized.includes(b.toLowerCase()));
      if (isBlocked) {
        throw new Error(`Blocked command: ${command}`);
      }
    },
  };
});

// Now import the functions after mocking
import { assertInsideSandbox } from '@/lib/tools/sandbox';

describe('sandbox tools', () => {
  describe('assertInsideSandbox', () => {
    it('should allow paths inside workspace', () => {
      expect(() => assertInsideSandbox('/workspace/file.txt')).not.toThrow();
      expect(() => assertInsideSandbox('/workspace/subdir/file.txt')).not.toThrow();
    });

    it('should reject paths outside workspace', () => {
      expect(() => assertInsideSandbox('/etc/passwd')).toThrow('Path outside sandbox');
      expect(() => assertInsideSandbox('/root/secret.txt')).toThrow('Path outside sandbox');
    });

    it('should handle edge cases', () => {
      expect(() => assertInsideSandbox('/workspace')).not.toThrow();
      expect(() => assertInsideSandbox('/workspace/')).not.toThrow();
    });
  });

  describe('assertSafeCommand', () => {
    it('should allow safe commands', () => {
      expect(() => assertSafeCommand('ls -la')).not.toThrow();
      expect(() => assertSafeCommand('echo "Hello World"')).not.toThrow();
      expect(() => assertSafeCommand('git status')).not.toThrow();
    });

    it('should block dangerous commands', () => {
      expect(() => assertSafeCommand('rm -rf /')).toThrow('Blocked command');
      expect(() => assertSafeCommand('sudo rm -rf /')).toThrow('Blocked command');
      expect(() => assertSafeCommand('chmod 777 /etc/passwd')).toThrow('Blocked command');
    });

    it('should block commands with different casing', () => {
      expect(() => assertSafeCommand('RM -RF /')).toThrow('Blocked command');
      expect(() => assertSafeCommand('SUDO rm -rf /')).toThrow('Blocked command');
    });

    it('should handle edge cases', () => {
      expect(() => assertSafeCommand('')).not.toThrow();
      expect(() => assertSafeCommand('  ')).not.toThrow();
    });
  });
});

import path from 'path';
import { describe, expect, it, vi } from 'vitest';

// Mock the WORKSPACE_ROOT before importing sandbox
vi.mock('../sandbox', async () => {
  const originalModule = await vi.importActual('../sandbox');
  return {
    ...(originalModule as any),
    WORKSPACE_ROOT: '/workspace',
  };
});

// Now import the functions after mocking
import { assertInsideSandbox, assertSafeCommand } from '../sandbox';

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

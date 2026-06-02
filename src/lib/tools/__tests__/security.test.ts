import { describe, it, expect } from 'vitest'
import { isBlockedCommand, BLOCKED_PATTERNS } from '../security'

describe('security tools', () => {
  describe('BLOCKED_PATTERNS', () => {
    it('should contain dangerous command patterns', () => {
      expect(BLOCKED_PATTERNS).toContain('rm -rf /')
      expect(BLOCKED_PATTERNS).toContain('sudo')
      expect(BLOCKED_PATTERNS).toContain('chmod 777')
    })

    it('should have consistent pattern definitions', () => {
      // Ensure all patterns are strings
      BLOCKED_PATTERNS.forEach(pattern => {
        expect(typeof pattern).toBe('string')
      })
    })
  })

  describe('isBlockedCommand', () => {
    it('should block dangerous commands', () => {
      expect(isBlockedCommand('rm -rf /')).toBe(true)
      expect(isBlockedCommand('sudo rm -rf /')).toBe(true)
      expect(isBlockedCommand('chmod 777 /etc/passwd')).toBe(true)
    })

    it('should block commands with different casing', () => {
      expect(isBlockedCommand('RM -RF /')).toBe(true)
      expect(isBlockedCommand('SUDO rm -rf /')).toBe(true)
    })

    it('should allow safe commands', () => {
      expect(isBlockedCommand('ls -la')).toBe(false)
      expect(isBlockedCommand('echo "Hello World"')).toBe(false)
      expect(isBlockedCommand('git status')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isBlockedCommand('')).toBe(false)
      expect(isBlockedCommand('  ')).toBe(false)
      expect(isBlockedCommand('normal command with no blocked patterns')).toBe(false)
    })
  })
})
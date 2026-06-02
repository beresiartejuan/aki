/**
 * Security utilities for tool execution.
 * Contains blocked patterns and validation functions.
 */

/**
 * Blocked command patterns for shell execution safety.
 * These patterns are dangerous and should never be executed.
 */
export const BLOCKED_PATTERNS = [
  'rm -rf /',
  'sudo',
  'chmod 777',
  ':(){:|:&}',
  'mkfs',
  '> /dev/sd',
  'dd if=',
  'wget',
  'curl',
  'nc ',
  'ncat',
  'python -c',
  'node -e',
  'eval ',
  'exec ',
] as const

/**
 * Validates that a shell command is safe to execute.
 * Checks against a blocklist of dangerous commands.
 * @param command - The command string to validate
 * @returns true if command is blocked, false if safe
 */
export function isBlockedCommand(command: string): boolean {
  const normalizedCommand = command.toLowerCase()
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (normalizedCommand.includes(pattern.toLowerCase())) {
      return true
    }
  }
  
  return false
}
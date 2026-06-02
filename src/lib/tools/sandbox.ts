import * as path from 'path'

/**
 * Root directory for all sandboxed operations.
 * Can be configured via WORKSPACE_ROOT environment variable.
 */
export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd()

/**
 * Validates that a path is inside the workspace sandbox.
 * Resolves the path to absolute and checks it starts with WORKSPACE_ROOT.
 * @param targetPath - The path to validate
 * @throws Error if the path is outside the sandbox
 */
export function assertInsideSandbox(targetPath: string): void {
  const resolved = path.resolve(targetPath)
  const workspaceRootResolved = path.resolve(WORKSPACE_ROOT)
  
  if (!resolved.startsWith(workspaceRootResolved)) {
    throw new Error(`Path outside sandbox: ${resolved}`)
  }
}

/**
 * Blocked command patterns for shell execution safety.
 * These patterns are dangerous and should never be executed.
 */
const BLOCKED_PATTERNS = [
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
]

/**
 * Validates that a shell command is safe to execute.
 * Checks against a blocklist of dangerous commands.
 * @param command - The command string to validate
 * @throws Error if the command contains blocked patterns
 */
export function assertSafeCommand(command: string): void {
  const normalizedCommand = command.toLowerCase()
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (normalizedCommand.includes(pattern.toLowerCase())) {
      throw new Error(`Blocked command: ${command}`)
    }
  }
}

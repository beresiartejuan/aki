import { exec } from 'child_process'
import { promisify } from 'util'
import { assertInsideSandbox, WORKSPACE_ROOT } from './sandbox'

const execAsync = promisify(exec)

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

/**
 * Execute a shell command with safety checks.
 * 
 * @param command - The command to execute
 * @param workingDir - Optional working directory (defaults to WORKSPACE_ROOT)
 * @returns The command output or error message
 */
export async function runCommand(
  command: string,
  workingDir?: string
): Promise<string> {
  try {
    // Validate command safety
    assertSafeCommand(command)
    
    // Validate working directory
    const cwd = workingDir ?? WORKSPACE_ROOT
    assertInsideSandbox(cwd)
    
    // Execute with timeout and output limits
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 15000, // 15 seconds
      maxBuffer: 1024 * 512, // 512KB
      env: {
        ...process.env,
        PATH: process.env.PATH,
      },
    })
    
    // Build result
    let result = stdout.trim()
    
    if (stderr && stderr.trim()) {
      if (result) {
        result += '\n[stderr]: ' + stderr.trim()
      } else {
        result = '[stderr]: ' + stderr.trim()
      }
    }
    
    // Limit output to 8000 characters
    const MAX_OUTPUT = 8000
    if (result.length > MAX_OUTPUT) {
      result = result.slice(0, MAX_OUTPUT) + '\n[... output truncated]'
    }
    
    return result || 'Command executed successfully (no output)'
  } catch (error) {
    // Handle timeout specifically
    if ((error as Error).message?.includes('timeout')) {
      return 'Error: command timed out after 15s'
    }
    
    // Handle errors with stderr
    const err = error as { message?: string; stderr?: string }
    let errorMessage = err.message || 'Unknown error'
    
    if (err.stderr) {
      errorMessage += '\n' + err.stderr
    }
    
    // Limit error output too
    const MAX_OUTPUT = 8000
    if (errorMessage.length > MAX_OUTPUT) {
      errorMessage = errorMessage.slice(0, MAX_OUTPUT) + '\n[... error truncated]'
    }
    
    return `Error: ${errorMessage}`
  }
}

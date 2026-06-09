import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { assertInsideSandbox, WORKSPACE_ROOT } from './sandbox';
import { isBlockedCommand } from './security';

const execAsync = promisify(exec);

/**
 * Execute a shell command with safety checks.
 *
 * @param command - The command to execute
 * @param workingDir - Optional working directory (defaults to WORKSPACE_ROOT)
 * @returns The command output or error message
 */
export async function runCommand(command: string, workingDir?: string): Promise<string> {
  try {
    // Validate command safety
    if (isBlockedCommand(command)) {
      throw new Error(`Blocked command: ${command}`);
    }

    // Validate working directory
    const cwd = workingDir ?? WORKSPACE_ROOT;
    assertInsideSandbox(cwd);

    // Execute with generous timeout and output limits
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 300000, // 5 minutes — generous limit for long operations
      maxBuffer: 1024 * 1024 * 2, // 2MB
      env: {
        ...process.env,
        PATH: process.env.PATH,
      },
    });

    // Build result
    let result = stdout.trim();

    if (stderr?.trim()) {
      if (result) {
        result += `\n[stderr]: ${stderr.trim()}`;
      } else {
        result = `[stderr]: ${stderr.trim()}`;
      }
    }

    // Limit output to 8000 characters
    const MAX_OUTPUT = 8000;
    if (result.length > MAX_OUTPUT) {
      result = `${result.slice(0, MAX_OUTPUT)}\n[... output truncated]`;
    }

    return result || 'Command executed successfully (no output)';
  } catch (error) {
    // Handle timeout specifically
    if ((error as Error).message?.includes('timeout')) {
      return 'Error: command timed out after 5 minutes';
    }

    // Handle errors with stderr
    const err = error as { message?: string; stderr?: string };
    let errorMessage = err.message || 'Unknown error';

    if (err.stderr) {
      errorMessage += `\n${err.stderr}`;
    }

    // Limit error output too
    const MAX_OUTPUT = 8000;
    if (errorMessage.length > MAX_OUTPUT) {
      errorMessage = `${errorMessage.slice(0, MAX_OUTPUT)}\n[... error truncated]`;
    }

    return `Error: ${errorMessage}`;
  }
}

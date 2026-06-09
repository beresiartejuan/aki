import * as path from 'node:path';
import { isBlockedCommand } from './security';

/**
 * Root directory for all operations.
 * Can be configured via WORKSPACE_ROOT environment variable.
 * Defaults to the current working directory (process.cwd()).
 */
export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

/**
 * Whether sandbox mode is enabled.
 * Set ENABLE_SANDBOX=true to restrict operations to WORKSPACE_ROOT.
 * By default (false), Makima can access any path on the system.
 */
export const ENABLE_SANDBOX = process.env.ENABLE_SANDBOX === 'true';

/**
 * Validates that a path is inside the workspace sandbox.
 * Resolves the path to absolute and checks it starts with WORKSPACE_ROOT.
 * Only enforces restrictions when ENABLE_SANDBOX is true.
 * @param targetPath - The path to validate
 * @throws Error if the path is outside the sandbox (when sandbox is enabled)
 */
export function assertInsideSandbox(targetPath: string): void {
  if (!ENABLE_SANDBOX) {
    return; // Sandbox disabled — allow access to any path
  }

  const resolved = path.resolve(targetPath);
  const workspaceRootResolved = path.resolve(WORKSPACE_ROOT);

  if (!resolved.startsWith(workspaceRootResolved)) {
    throw new Error(`Path outside sandbox: ${resolved}`);
  }
}

/**
 * Validates that a shell command is safe to execute.
 * Checks against a blocklist of dangerous commands.
 * @param command - The command string to validate
 * @throws Error if the command contains blocked patterns
 */
export function assertSafeCommand(command: string): void {
  if (isBlockedCommand(command)) {
    throw new Error(`Blocked command: ${command}`);
  }
}

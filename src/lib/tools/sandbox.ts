import * as path from 'node:path';
import { isBlockedCommand } from './security';

/**
 * Root directory for all sandboxed operations.
 * Can be configured via WORKSPACE_ROOT environment variable.
 */
export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? process.cwd();

/**
 * Validates that a path is inside the workspace sandbox.
 * Resolves the path to absolute and checks it starts with WORKSPACE_ROOT.
 * @param targetPath - The path to validate
 * @throws Error if the path is outside the sandbox
 */
export function assertInsideSandbox(targetPath: string): void {
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

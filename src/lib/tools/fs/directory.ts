import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { assertInsideSandbox, WORKSPACE_ROOT } from '@/lib/tools/sandbox';
import { assertNotSensitiveFile } from '@/lib/tools/security-check';

/**
 * Create a directory and any missing parent directories.
 */
export async function createDirectory(dirPath: string): Promise<string> {
  try {
    assertInsideSandbox(dirPath);

    await fs.mkdir(dirPath, { recursive: true });
    return `OK: directory created: ${dirPath}`;
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
}

/**
 * Delete a single file (not directories).
 */
export async function deleteFile(filePath: string): Promise<string> {
  try {
    assertInsideSandbox(filePath);
    assertNotSensitiveFile(filePath);

    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      return `Error: use delete_directory for directories`;
    }

    await fs.unlink(filePath);
    return `OK: deleted ${filePath}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return `Error: file not found: ${filePath}`;
    }
    return `Error: ${(error as Error).message}`;
  }
}

/**
 * Delete a directory and all its contents recursively.
 * Never allows deleting the WORKSPACE_ROOT itself.
 */
export async function deleteDirectory(dirPath: string): Promise<string> {
  try {
    assertInsideSandbox(dirPath);

    const resolvedTarget = path.resolve(dirPath);
    const resolvedRoot = path.resolve(WORKSPACE_ROOT);

    if (resolvedTarget === resolvedRoot) {
      return `Error: cannot delete the workspace root directory`;
    }

    await fs.rm(dirPath, { recursive: true, force: false });
    return `OK: deleted directory ${dirPath}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return `Error: directory not found: ${dirPath}`;
    }
    return `Error: ${(error as Error).message}`;
  }
}

/**
 * Move or rename a file or directory.
 */
export async function moveFile(sourcePath: string, destPath: string): Promise<string> {
  try {
    assertInsideSandbox(sourcePath);
    assertInsideSandbox(destPath);
    assertNotSensitiveFile(sourcePath);
    assertNotSensitiveFile(destPath);

    await fs.rename(sourcePath, destPath);
    return `OK: moved ${sourcePath} → ${destPath}`;
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
}

import * as fs from 'fs/promises';
import * as path from 'path';
import { assertInsideSandbox } from './sandbox';

/**
 * Read the contents of a file.
 * Returns first 100KB if file is larger than that.
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    assertInsideSandbox(filePath);

    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return `Error: not a file: ${filePath}`;
    }

    // If file > 100KB, read only first 100KB
    const MAX_SIZE = 100 * 1024;
    if (stats.size > MAX_SIZE) {
      const buffer = await fs.open(filePath, 'r').then(async (fd) => {
        const buf = Buffer.alloc(MAX_SIZE);
        await fd.read(buf, 0, MAX_SIZE, 0);
        await fd.close();
        return buf;
      });
      return buffer.toString('utf-8') + '\n[... file truncated at 100KB]';
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return `Error: file not found: ${filePath}`;
    }
    return `Error: ${(error as Error).message}`;
  }
}

/**
 * Write content to a file, creating parent directories if needed.
 */
export async function writeFile(filePath: string, content: string): Promise<string> {
  try {
    assertInsideSandbox(filePath);

    // Create parent directories recursively
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
    return `OK: wrote ${content.length} characters to ${filePath}`;
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
}

/**
 * List files and subdirectories in a directory.
 * Shows name, type, and size for files.
 */
export async function listDirectory(dirPath: string): Promise<string> {
  try {
    assertInsideSandbox(dirPath);

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    if (entries.length === 0) {
      return 'Directory is empty';
    }

    // Limit to 200 entries
    const MAX_ENTRIES = 200;
    const truncated = entries.length > MAX_ENTRIES;
    const displayEntries = entries.slice(0, MAX_ENTRIES);

    const lines: string[] = [];

    for (const entry of displayEntries) {
      if (entry.isDirectory()) {
        lines.push(`[dir]  ${entry.name}/`);
      } else if (entry.isFile()) {
        const fullPath = path.join(dirPath, entry.name);
        try {
          const stats = await fs.stat(fullPath);
          const size = formatBytes(stats.size);
          lines.push(`[file] ${entry.name} (${size})`);
        } catch {
          lines.push(`[file] ${entry.name}`);
        }
      } else {
        lines.push(`[${entry.isSymbolicLink() ? 'link' : 'other'}] ${entry.name}`);
      }
    }

    if (truncated) {
      lines.push(`\n[... ${entries.length - MAX_ENTRIES} more entries truncated]`);
    }

    return lines.join('\n');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return `Error: directory not found: ${dirPath}`;
    }
    return `Error: ${(error as Error).message}`;
  }
}

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

    // Import WORKSPACE_ROOT from sandbox to check
    const { WORKSPACE_ROOT } = await import('./sandbox');
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

    await fs.rename(sourcePath, destPath);
    return `OK: moved ${sourcePath} → ${destPath}`;
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
}

/**
 * Search for files by name pattern within a directory.
 * Simple case-insensitive substring match.
 */
export async function searchFiles(dirPath: string, pattern: string): Promise<string> {
  try {
    assertInsideSandbox(dirPath);

    const normalizedPattern = pattern.toLowerCase();
    const results: string[] = [];
    const MAX_RESULTS = 50;

    async function searchRecursive(currentPath: string): Promise<void> {
      if (results.length >= MAX_RESULTS) return;

      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= MAX_RESULTS) break;

        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await searchRecursive(fullPath);
        } else if (entry.isFile()) {
          if (entry.name.toLowerCase().includes(normalizedPattern)) {
            results.push(fullPath);
          }
        }
      }
    }

    await searchRecursive(dirPath);

    if (results.length === 0) {
      return 'No files found';
    }

    return results.join('\n');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return `Error: directory not found: ${dirPath}`;
    }
    return `Error: ${(error as Error).message}`;
  }
}

/**
 * Format bytes to human readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / k ** i).toFixed(1)) + ' ' + sizes[i];
}

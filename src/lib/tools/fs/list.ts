import * as fs from 'fs/promises';
import * as path from 'path';
import { assertInsideSandbox } from '../sandbox';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / k ** i).toFixed(1)) + ' ' + sizes[i];
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

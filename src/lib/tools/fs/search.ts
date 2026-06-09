import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { assertInsideSandbox } from '@/lib/tools/sandbox';

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

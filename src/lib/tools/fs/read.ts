import * as fs from 'node:fs/promises';
import { assertInsideSandbox } from '@/lib/tools/sandbox';

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
      return `${buffer.toString('utf-8')}\n[... file truncated at 100KB]`;
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

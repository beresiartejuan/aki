import * as fs from 'fs/promises';
import * as path from 'path';
import { assertInsideSandbox } from '../sandbox';

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

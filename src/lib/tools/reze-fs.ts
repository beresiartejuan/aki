import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Read the contents of a file. Returns first 100KB if the file is larger.
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return `Error: not a file: ${filePath}`;
    }

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

/**
 * Write content to a file, creating parent directories if needed.
 */
export async function writeFile(filePath: string, content: string): Promise<string> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return `OK: wrote ${content.length} characters to ${filePath}`;
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
}

/**
 * Replace a specific string in an existing file.
 */
export async function editFile(
  filePath: string,
  oldString: string,
  newString: string
): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    if (!content.includes(oldString)) {
      return `Error: the specified oldString was not found in ${filePath}`;
    }
    const updated = content.replace(oldString, newString);
    await fs.writeFile(filePath, updated, 'utf-8');
    return `OK: edited ${filePath} — replaced ${oldString.length} chars with ${newString.length} chars`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return `Error: file not found: ${filePath}`;
    }
    return `Error: ${(error as Error).message}`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * List files and subdirectories in a directory.
 */
export async function listDirectory(dirPath: string): Promise<string> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    if (entries.length === 0) {
      return 'Directory is empty';
    }

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
 * Execute a shell command without sandbox restrictions.
 * Allows access anywhere in the user's home directory.
 */
export async function runCommand(command: string, workingDir?: string): Promise<string> {
  try {
    const cwd = workingDir ?? process.env.HOME ?? process.cwd();

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 300000,
      maxBuffer: 1024 * 1024 * 2,
      env: { ...process.env, PATH: process.env.PATH },
    });

    let result = stdout.trim();
    if (stderr?.trim()) {
      if (result) {
        result += `\n[stderr]: ${stderr.trim()}`;
      } else {
        result = `[stderr]: ${stderr.trim()}`;
      }
    }

    const MAX_OUTPUT = 8000;
    if (result.length > MAX_OUTPUT) {
      result = `${result.slice(0, MAX_OUTPUT)}\n[... output truncated]`;
    }

    return result || 'Command executed successfully (no output)';
  } catch (error) {
    if ((error as Error).message?.includes('timeout')) {
      return 'Error: command timed out after 5 minutes';
    }

    const err = error as { message?: string; stderr?: string };
    let errorMessage = err.message || 'Unknown error';
    if (err.stderr) {
      errorMessage += `\n${err.stderr}`;
    }

    const MAX_OUTPUT = 8000;
    if (errorMessage.length > MAX_OUTPUT) {
      errorMessage = `${errorMessage.slice(0, MAX_OUTPUT)}\n[... error truncated]`;
    }

    return `Error: ${errorMessage}`;
  }
}

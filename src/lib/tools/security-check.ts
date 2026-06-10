import * as path from 'node:path';

/**
 * Security guardrails for filesystem operations.
 * Prevents reading/writing/editing sensitive files regardless of agent.
 */

/** Extensions that are always blocked. */
const BLOCKED_EXTENSIONS = new Set([
  '.pem',
  '.key',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  '.env.example',
  '.env.staging',
  '.env.prod',
  '.env.dev',
  '.crt',
  '.cer',
  '.p12',
  '.pfx',
  '.der',
  '.csr',
  '.pub',
  '.htpasswd',
  '.netrc',
  '.npmrc',
  '.pypirc',
  '.git-credentials',
]);

/** File names (without directory) that are always blocked. */
const BLOCKED_FILE_NAMES = new Set([
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  '.env.example',
  '.env.staging',
  '.env.prod',
  '.env.dev',
  '.htpasswd',
  '.netrc',
  '.npmrc',
  '.pypirc',
  '.git-credentials',
  'credentials',
  'authorized_keys',
  'known_hosts',
]);

/** Directory names that make any child file sensitive. */
const SENSITIVE_DIRS = new Set(['.ssh', '.aws', '.docker', '.kube']);

function getBaseName(filePath: string): string {
  return path.basename(filePath);
}

function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

function isInSensitiveDir(filePath: string): boolean {
  const parts = filePath.split(/[/\\]/);
  for (const part of parts) {
    if (SENSITIVE_DIRS.has(part)) {
      return true;
    }
  }
  return false;
}

/**
 * Throws an error if the file path points to a sensitive file.
 * Call this BEFORE any read/write/edit/delete operation.
 */
export function assertNotSensitiveFile(filePath: string): void {
  const baseName = getBaseName(filePath);
  const ext = getExtension(filePath);

  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Access denied: files with extension "${ext}" are restricted for security reasons.`
    );
  }

  if (BLOCKED_FILE_NAMES.has(baseName)) {
    throw new Error(`Access denied: "${baseName}" is a restricted file for security reasons.`);
  }

  if (isInSensitiveDir(filePath)) {
    throw new Error(
      `Access denied: files inside sensitive directories (${Array.from(SENSITIVE_DIRS).join(', ')}) are restricted.`
    );
  }
}

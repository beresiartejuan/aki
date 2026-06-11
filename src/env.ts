// Environment variables with fallback to process.env for standalone scripts
const getEnv = (key: string, fallback?: string): string | undefined => {
  const val = import.meta.env?.[key] ?? process.env?.[key];
  return val !== undefined ? val : fallback;
};

export const env = {
  DB_PATH: getEnv('DB_PATH', './data/aki.db')!,
  OLLAMA_API_KEY: getEnv('OLLAMA_API_KEY'),
  OLLAMA_MODEL: getEnv('OLLAMA_MODEL', 'qwen3.5')!,
  MAKIMA_MODEL: getEnv('MAKIMA_MODEL') || getEnv('OLLAMA_MODEL', 'qwen3.5')!,
  REZE_MODEL: getEnv('REZE_MODEL') || getEnv('OLLAMA_MODEL', 'qwen3.5')!,
  WORKSPACE_ROOT: getEnv('WORKSPACE_ROOT') || process.cwd(),
  ENABLE_SANDBOX: getEnv('ENABLE_SANDBOX') === 'true',
  OLLAMA_LOCAL_URL: getEnv('OLLAMA_LOCAL_URL', 'http://localhost:11434')!,
  OLLAMA_REMOTE_URL: getEnv('OLLAMA_REMOTE_URL', 'https://ollama.com')!,
};

// Basic validation
if (!env.DB_PATH) {
  throw new Error('DB_PATH environment variable is required');
}

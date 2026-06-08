// In Astro, environment variables are loaded automatically
// We'll access them directly with basic validation

export const env = {
  DB_PATH: import.meta.env?.DB_PATH || './data/aki.db',
  OLLAMA_API_KEY: import.meta.env?.OLLAMA_API_KEY,
  OLLAMA_MODEL: import.meta.env?.OLLAMA_MODEL || 'qwen3.5',
  WORKSPACE_ROOT: import.meta.env?.WORKSPACE_ROOT || './workspace',
};

// Basic validation
if (!env.DB_PATH) {
  throw new Error('DB_PATH environment variable is required');
}

if (!env.OLLAMA_API_KEY) {
  throw new Error('OLLAMA_API_KEY environment variable is required');
}

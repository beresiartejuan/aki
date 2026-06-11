import type { Tool } from 'ollama';

/**
 * Tool definitions for Aki (conversational agent).
 * Aki does NOT have filesystem access — all system operations are delegated to Makima.
 * The only tool Aki has is search_messages for looking up past messages in the current chat.
 */
export const AKI_TOOL_DEFINITIONS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'search_messages',
      description:
        'Search the current chat history by semantic similarity. Use this when the user refers to something said earlier, asks about previous context, or when you need to recall specific details from earlier in the conversation that are not in your recent context window.',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'The search query describing what you are looking for. Be specific.',
          },
          limit: {
            type: 'number',
            description:
              'Maximum number of results to return (1-11, default 5). Use fewer for precise lookups, more for broad searches.',
          },
        },
      },
    },
  },
];

/**
 * Union type of Aki tool names.
 */
export type AkiToolName = 'search_messages';

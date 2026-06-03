import { upsertMemoryEntry } from '../db/queries/memory';
import { ok, type Result, safeQuery } from '../db/result';
import { getAgentConfig } from '../db/queries/config';
import { DEFAULT_AGENT_ID } from './constants';
import { env } from '../env';
import { ollama } from './ollama';

interface ExtractedMemory {
  category: 'preference' | 'fact' | 'decision' | 'goal' | 'context';
  key: string;
  value: string;
  confidence: number;
}

/**
 * Extracts structured facts from the latest exchange and upserts them to memory.
 * Called fire-and-forget after every turn.
 */
export async function extractMemory(
  chatId: string,
  userId: string,
  lastUserMessage: string,
  lastAssistantMessage: string
): Promise<Result<void>> {
  return safeQuery(async () => {
    // 1. Load agent config for model
    const agentResult = await getAgentConfig(DEFAULT_AGENT_ID);
    const model = agentResult.ok && agentResult.data 
      ? agentResult.data.model 
      : env.OLLAMA_MODEL;

    // 2. Build extraction prompt
    const extractionPrompt = buildExtractionPrompt(lastUserMessage, lastAssistantMessage);

    // 3. Call ollama (non-streaming, no tools)
    const response = await ollama.chat({
      model,
      messages: [{ role: 'user', content: extractionPrompt }],
      stream: false,
      think: false,
      // No tools passed - this is an internal utility call
    });

    // 4. Parse the JSON response
    const content = response.message.content?.trim() ?? '';
    const extracted = parseExtractedMemory(content);

    if (!extracted || extracted.length === 0) {
      return; // Nothing to extract
    }

    // 5. Upsert each memory entry with confidence >= 0.6
    const now = Date.now();
    for (const entry of extracted) {
      if (entry.confidence >= 0.6) {
        const upsertResult = await upsertMemoryEntry({
          userId,
          category: entry.category,
          key: entry.key,
          value: entry.value,
          confidence: entry.confidence,
          lastSeenAt: now,
        });

        if (upsertResult.ok) {
          console.log(`[memory-extractor] Upserted memory: [${entry.category}] ${entry.key}: ${entry.value}`);
        } else {
          console.error(`[memory-extractor] Failed to upsert memory: ${upsertResult.error.message}`);
        }
      }
    }
  });
}

/**
 * Builds the extraction prompt
 */
function buildExtractionPrompt(userMessage: string, assistantMessage: string): string {
  return `You are an entity extractor. Analyze this exchange and extract any important facts about the user worth remembering long-term.

User said: "${userMessage}"
Assistant replied: "${assistantMessage.slice(0, 500)}"

Extract facts ONLY if they are clearly stated and likely to be useful in future conversations. Ignore small talk, questions, and temporary context.

Respond with a JSON array. Each item:
{
  "category": "preference" | "fact" | "decision" | "goal" | "context",
  "key": "short_snake_case_key",
  "value": "the value as a short string",
  "confidence": 0.0 to 1.0
}

If nothing worth remembering was said, respond with an empty array: []
Respond with ONLY the JSON array, no explanation, no markdown fences.`;
}

/**
 * Parses the extracted memory JSON response
 */
function parseExtractedMemory(content: string): ExtractedMemory[] | null {
  try {
    // Strip markdown fences if present
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      return null;
    }

    // Filter valid entries
    return parsed.filter((item): item is ExtractedMemory => {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.key === 'string' &&
        typeof item.value === 'string' &&
        typeof item.confidence === 'number' &&
        ['preference', 'fact', 'decision', 'goal', 'context'].includes(item.category)
      );
    });
  } catch {
    // Silent fail - if parsing fails, just return null
    return null;
  }
}

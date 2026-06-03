import type { APIRoute } from 'astro';
import { getMemoryByUser } from '../../../db/queries/memory';
import { DEFAULT_USER_ID } from '../../../lib/constants';

export const prerender = false;

/**
 * GET /api/memory
 * Returns all memory entries for DEFAULT_USER_ID grouped by category
 */
export const GET: APIRoute = async () => {
  try {
    const result = await getMemoryByUser(DEFAULT_USER_ID);

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: result.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Group memories by category
    const memories = result.data;
    const grouped = {
      preference: memories.filter((m) => m.category === 'preference'),
      fact: memories.filter((m) => m.category === 'fact'),
      decision: memories.filter((m) => m.category === 'decision'),
      goal: memories.filter((m) => m.category === 'goal'),
      context: memories.filter((m) => m.category === 'context'),
    };

    return new Response(JSON.stringify(grouped), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

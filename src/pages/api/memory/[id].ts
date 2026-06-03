import type { APIRoute } from 'astro';
import { deleteMemoryEntry } from '../../../db/queries/memory';

export const prerender = false;

/**
 * DELETE /api/memory/[id]
 * Deletes a memory entry by id
 */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing memory id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await deleteMemoryEntry(id);

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: result.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ deleted: true }), {
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

import { randomUUID } from 'node:crypto';
import type { APIRoute } from 'astro';
import { createChat, getAllChats } from '@/db/queries/chats';
import { DEFAULT_AGENT_ID, DEFAULT_USER_ID } from '@/lib/constants';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const result = await getAllChats(DEFAULT_USER_ID);

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: result.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const title = body?.title?.trim() || 'Nueva conversación';

    const result = await createChat({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      agentConfigId: DEFAULT_AGENT_ID,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: result.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify(result.data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

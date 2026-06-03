import type { APIRoute } from 'astro';
import { deleteSession } from '../../../db/queries/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionId = cookies.get('sessionId')?.value;

    if (sessionId) {
      // Delete session from database
      await deleteSession(sessionId);

      // Clear cookie
      cookies.delete('sessionId', {
        path: '/',
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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

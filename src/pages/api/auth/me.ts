import type { APIRoute } from 'astro';
import { getSessionById, getUserByUsername } from '@/db/queries/auth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionId = cookies.get('sessionId')?.value;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get session from database
    const sessionResult = await getSessionById(sessionId);

    if (!sessionResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: sessionResult.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const session = sessionResult.data;

    if (!session) {
      // Session expired or doesn't exist, clear cookie
      cookies.delete('sessionId', {
        path: '/',
      });
      return new Response(JSON.stringify({ error: 'Session expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user details
    const userResult = await getUserByUsername('admin'); // Assuming single user

    if (!userResult.ok || !userResult.data) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = userResult.data;

    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          plan: user.plan,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
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

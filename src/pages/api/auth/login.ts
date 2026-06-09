import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { createSession, getUserByUsername } from '@/db/queries/auth';

export const prerender = false;

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user from database
    const userResult = await getUserByUsername(username);

    if (!userResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: userResult.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const user = userResult.data;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create session
    const expiresAt = Date.now() + SESSION_DURATION;
    const sessionResult = await createSession({
      userId: user.id,
      expiresAt,
    });

    if (!sessionResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to create session', detail: sessionResult.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Set session cookie
    cookies.set('sessionId', sessionResult.data.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: SESSION_DURATION / 1000, // Convert to seconds
      path: '/',
    });

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

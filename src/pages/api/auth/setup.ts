import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { createSession, hasUsers } from '../../../db/queries/auth';
import { createUser } from '../../../db/queries/auth';
import { DEFAULT_USER_ID } from '../../../lib/constants';

export const prerender = false;

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const SALT_ROUNDS = 12;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // First check if users already exist
    const usersExistResult = await hasUsers();
    
    if (!usersExistResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: usersExistResult.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (usersExistResult.data) {
      return new Response(
        JSON.stringify({ error: 'Setup already complete. Users already exist.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { username, name, password } = await request.json();

    // Validate required fields
    if (!username || !name || !password) {
      return new Response(
        JSON.stringify({ error: 'Username, name, and password are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with DEFAULT_USER_ID to maintain compatibility
    const userResult = await createUser({
      id: DEFAULT_USER_ID,
      username,
      name,
      passwordHash,
      plan: 'free',
    });

    if (!userResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user', detail: userResult.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const user = userResult.data;

    // Create session for immediate login
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
      maxAge: SESSION_DURATION / 1000,
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
        status: 201,
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

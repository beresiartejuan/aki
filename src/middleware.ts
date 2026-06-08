import type { MiddlewareHandler } from 'astro';
import { getSessionById } from './db/queries/auth';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/setup',
  '/api/auth/login',
  '/api/auth/setup',
  '/api/auth/logout',
  '/shared', // Shared chats are public
  '/_astro',
  '/favicon',
];

export const onRequest: MiddlewareHandler = async ({ url, request, cookies, locals, redirect }, next) => {
  const path = url.pathname;

  // Check if path is public
  const isPublic = PUBLIC_PATHS.some((publicPath) =>
    path.startsWith(publicPath)
  );

  if (isPublic) {
    return next();
  }

  // Check for session cookie
  const sessionId = cookies.get('sessionId')?.value;

  if (!sessionId) {
    // API requests return 401, page requests redirect to login
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect('/login');
  }

  // Validate session
  const sessionResult = await getSessionById(sessionId);

  if (!sessionResult.ok || !sessionResult.data) {
    // Invalid or expired session
    cookies.delete('sessionId', {
      path: '/',
    });

    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Session expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect('/login');
  }

  // Attach user info to locals for use in routes
  locals.userId = sessionResult.data.userId;
  locals.sessionId = sessionId;

  return next();
};

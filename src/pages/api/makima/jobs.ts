import type { APIRoute } from 'astro';
import { getChatById } from '@/db/queries/chats';
import { getMakimaJobsByChatId } from '@/db/queries/makima';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const userId = locals.userId as string | undefined;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const chatId = url.searchParams.get('chatId');

  if (!chatId) {
    return new Response(JSON.stringify({ error: 'chatId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify ownership: chat belongs to the authenticated user
  const chatResult = await getChatById(chatId);
  if (!chatResult.ok || !chatResult.data || chatResult.data.userId !== userId) {
    return new Response(null, { status: 403 });
  }

  const result = await getMakimaJobsByChatId(chatId);

  if (!result.ok) {
    return new Response(JSON.stringify({ error: 'Database error', detail: result.error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Return lightweight fields only (no fullOutput)
  const jobs = result.data.map((job) => ({
    id: job.id,
    status: job.status,
    prompt: job.prompt,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt,
    akiVerification: job.akiVerification,
  }));

  return new Response(JSON.stringify(jobs), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

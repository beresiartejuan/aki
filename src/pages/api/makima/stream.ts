import type { APIRoute } from 'astro';
import { getChatById } from '@/db/queries/chats';
import { getMakimaJob } from '@/db/queries/makima';
import {
  onMakimaAkiVerification,
  onMakimaChunk,
  onMakimaDone,
  onMakimaError,
  onMakimaToolEnd,
  onMakimaToolStart,
} from '@/lib/agent/makima-events';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const userId = locals.userId as string | undefined;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const jobId = url.searchParams.get('jobId');

  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify job exists
  const jobResult = await getMakimaJob(jobId);

  if (!jobResult.ok) {
    return new Response(
      JSON.stringify({ error: 'Database error', detail: jobResult.error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const job = jobResult.data;

  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify ownership: job's chat belongs to the authenticated user
  const chatResult = await getChatById(job.chatId);
  if (!chatResult.ok || !chatResult.data || chatResult.data.userId !== userId) {
    return new Response(null, { status: 403 });
  }

  const encoder = new TextEncoder();

  // Will hold the cleanup function for cancel()
  let streamCleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      // If job already finished or errored, send snapshot and close
      if (job.status === 'done') {
        send('chunk', JSON.stringify({ chunk: job.fullOutput || '' }));
        send('done', JSON.stringify({ status: 'done' }));
        controller.close();
        return;
      }

      if (job.status === 'error') {
        send('chunk', JSON.stringify({ chunk: job.fullOutput || '' }));
        send('error', JSON.stringify({ message: 'Job failed' }));
        controller.close();
        return;
      }

      // Active job: subscribe to events
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        offChunk();
        offDone();
        offError();
        offAkiVerification();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      const offChunk = onMakimaChunk(jobId, (chunk) => {
        if (closed) return;
        send('chunk', JSON.stringify({ chunk }));
      });

      const offDone = onMakimaDone(jobId, () => {
        if (closed) return;
        send('done', JSON.stringify({ status: 'done' }));
        cleanup();
      });

      const offError = onMakimaError(jobId, (message) => {
        if (closed) return;
        send('error', JSON.stringify({ message }));
        cleanup();
      });

      const offAkiVerification = onMakimaAkiVerification(jobId, (content) => {
        if (closed) return;
        send('aki_verification', JSON.stringify({ content }));
      });

      const offToolStart = onMakimaToolStart(jobId, (data) => {
        if (closed) return;
        send('tool_start', JSON.stringify(data));
      });

      const offToolEnd = onMakimaToolEnd(jobId, (data) => {
        if (closed) return;
        send('tool_end', JSON.stringify(data));
      });

      // Store cleanup for cancel()
      streamCleanup = () => {
        offChunk();
        offDone();
        offError();
        offAkiVerification();
        offToolStart();
        offToolEnd();
      };
    },
    cancel() {
      streamCleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};

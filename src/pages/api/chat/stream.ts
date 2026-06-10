import type { APIRoute } from 'astro';
import { getChatById } from '@/db/queries/chats';
import { streamAgentTurn, streamRezeTurn } from '@/lib/agent';
import { triggerMakimaIfNeeded } from '@/lib/agent/makima-runner';
import { DEFAULT_USER_ID } from '@/lib/constants';

export const prerender = false;

interface StreamChunk {
  content?: string;
  thinking?: string;
  toolCall?: string;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const chatId = url.searchParams.get('chatId');
  const message = url.searchParams.get('message');
  const thinking = url.searchParams.get('thinking') === 'true';
  const agent = url.searchParams.get('agent') ?? 'aki';

  // Validate
  if (!chatId || !message) {
    return new Response(
      JSON.stringify({ error: 'Missing required query parameters: chatId, message' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Verify chat exists
  const chatResult = await getChatById(chatId);
  if (!chatResult.ok) {
    return new Response(
      JSON.stringify({ error: 'Database error', detail: chatResult.error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!chatResult.data) {
    return new Response(JSON.stringify({ error: 'Chat not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Return SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (agent === 'reze') {
          // --- Reze mode ---
          const result = await streamRezeTurn(
            chatId,
            DEFAULT_USER_ID,
            message,
            (chunk: StreamChunk) => {
              if (chunk.content) send({ type: 'content', text: chunk.content });
              if (chunk.thinking) send({ type: 'thinking', text: chunk.thinking });
              if (chunk.toolCall) send({ type: 'tool_call', text: chunk.toolCall });
            }
          );

          if (!result.ok) {
            send({ type: 'error', message: result.error.message });
          } else {
            send({ type: 'done' });
          }
        } else {
          // --- Aki mode (default) ---
          const result = await streamAgentTurn(
            chatId,
            DEFAULT_USER_ID,
            message,
            thinking,
            (chunk: StreamChunk) => {
              if (chunk.content) send({ type: 'content', text: chunk.content });
              if (chunk.thinking) send({ type: 'thinking', text: chunk.thinking });
              if (chunk.toolCall) send({ type: 'tool_call', text: chunk.toolCall });
            }
          );

          if (!result.ok) {
            send({ type: 'error', message: result.error.message });
          } else {
            const { content, messageId } = result.data;

            // Check if Aki delegated to Makima and fire background job
            if (messageId) {
              try {
                const jobId = await triggerMakimaIfNeeded(content, chatId, message, messageId);
                if (jobId) {
                  send({ type: 'makima_job_created', jobId });
                }
              } catch (err) {
                console.error('[stream] Makima trigger failed:', err);
              }
            }

            send({ type: 'done' });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        send({ type: 'error', message: errorMessage });
      }

      controller.close();
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

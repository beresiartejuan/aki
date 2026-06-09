import {
  appendMakimaJobOutput,
  createMakimaJob,
  failMakimaJob,
  finishMakimaJob,
  updateMakimaJobStatus,
} from '@/db/queries/makima';
import { createMessage, updateMessageMakimaJobId } from '@/db/queries/messages';
import type { MakimaJob } from '@/db/schema';
import { ollama } from '@/lib/ollama';
import { loadAgentConfig } from './config';
import { runMakimaAgent } from './makima';
import {
  emitMakimaAkiVerification,
  emitMakimaChunk,
  emitMakimaDone,
  emitMakimaError,
} from './makima-events';

const MAKIMA_PATTERN = /@makima\s+(.+)/s;

export function extractMakimaPrompt(akiMessage: string): string | null {
  const match = akiMessage.match(MAKIMA_PATTERN);
  return match ? match[1].trim() : null;
}

/**
 * Crea el job en DB y dispara Makima de forma no bloqueante.
 * Retorna el jobId si se creó un job, null si no había @makima.
 */
export async function triggerMakimaIfNeeded(
  akiMessage: string,
  chatId: string,
  userMessage: string,
  triggerMessageId: string
): Promise<string | null> {
  const makimaPrompt = extractMakimaPrompt(akiMessage);
  if (!makimaPrompt) return null;

  const jobResult = await createMakimaJob({
    id: crypto.randomUUID(),
    chatId,
    triggerMessageId,
    prompt: makimaPrompt,
    userMessage,
    status: 'pending',
    createdAt: Date.now(),
  });

  if (!jobResult.ok) {
    console.error('[makima] Failed to create job:', jobResult.error);
    return null;
  }

  // Link the message to the job so the frontend can render the chip
  if (triggerMessageId) {
    updateMessageMakimaJobId(triggerMessageId, jobResult.data.id).catch((err) =>
      console.error('[makima] Failed to link message to job:', err)
    );
  }

  // Disparar sin await: no bloquea el response de Aki
  runMakimaInBackground(jobResult.data, chatId).catch((err) => {
    console.error('[makima] Background run failed:', err);
  });

  return jobResult.data.id;
}

async function runMakimaInBackground(job: MakimaJob, chatId: string): Promise<void> {
  // Buffer de chunks para evitar race conditions en appendMakimaJobOutput
  let chunkBuffer = '';
  let flushTimeout: ReturnType<typeof setTimeout> | null = null;
  let isFlushing = false;

  async function flushBuffer() {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    if (!chunkBuffer || isFlushing) return;
    isFlushing = true;
    const chunk = chunkBuffer;
    chunkBuffer = '';
    try {
      await appendMakimaJobOutput(job.id, chunk);
    } catch (err) {
      console.error('[makima] Failed to flush chunk buffer:', err);
    } finally {
      isFlushing = false;
    }
  }

  function scheduleFlush() {
    if (flushTimeout) return;
    flushTimeout = setTimeout(() => {
      void flushBuffer();
    }, 150);
  }

  try {
    await updateMakimaJobStatus(job.id, 'running');

    await runMakimaAgent({
      jobId: job.id,
      prompt: job.prompt,
      userMessage: job.userMessage,
      onChunk: (chunk) => {
        chunkBuffer += chunk;
        emitMakimaChunk(job.id, chunk); // SSE inmediato
        scheduleFlush();
      },
      onDone: async (lastChunk) => {
        await flushBuffer();
        try {
          const verification = await requestAkiVerification(lastChunk);
          await finishMakimaJob(job.id, verification);
          await saveVerificationMessage(chatId, verification);
          emitMakimaAkiVerification(job.id, verification);
        } catch (_err) {
          // Aún así marcar como done con verificación de fallback
          await finishMakimaJob(
            job.id,
            'Tarea completada (no se pudo obtener verificación de Aki)'
          ).catch(() => {});
        } finally {
          emitMakimaDone(job.id); // ← siempre se emite
        }
      },
      onError: async (error) => {
        await flushBuffer();
        try {
          await failMakimaJob(job.id);
          const msg = `Makima encontró un error: ${error.message}`;
          await saveVerificationMessage(chatId, msg);
        } catch (_err) {
          // ignorar error secundario
        } finally {
          emitMakimaError(job.id, error.message); // ← siempre se emite
        }
      },
    });
  } catch (error) {
    // Si llegamos acá, los callbacks de runMakimaAgent no se llamaron
    await flushBuffer();
    await failMakimaJob(job.id);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    emitMakimaError(job.id, message);
    await saveVerificationMessage(
      chatId,
      'Makima encontró un error inesperado y no pudo completar la tarea.'
    );
  }
}

async function requestAkiVerification(lastChunk: string): Promise<string> {
  try {
    const config = await loadAgentConfig();

    const messages = [
      {
        role: 'system' as const,
        content:
          'Sos Aki. Recibís el reporte final de Makima y escribís un mensaje MUY corto para el usuario (1-2 oraciones máximo) confirmando si la tarea salió bien o si hubo algún problema. Sin tecnicismos, directo al punto.',
      },
      {
        role: 'user' as const,
        content: `Makima terminó su tarea. Estas son sus últimas líneas de output:\n\n${lastChunk}\n\n¿Salió bien?`,
      },
    ];

    const response = await ollama.chat({
      model: config.model,
      messages,
      options: {
        temperature: 0.4,
        num_predict: 512,
      },
    });

    // Usar || en lugar de ?? para capturar strings vacíos también
    const content = response.message.content || 'Makima terminó su tarea.';
    return content;
  } catch {
    return 'Makima completó la tarea.';
  }
}

async function saveVerificationMessage(chatId: string, content: string): Promise<void> {
  const result = await createMessage({
    chatId,
    role: 'assistant',
    content,
    createdAt: Date.now(),
  });

  if (!result.ok) {
    console.error('[makima] Failed to save verification message:', result.error);
  }
}

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
  emitMakimaToolEnd,
  emitMakimaToolStart,
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
      onToolStart: (toolName, args) => {
        emitMakimaToolStart(job.id, toolName, args);
      },
      onToolEnd: (toolName, result) => {
        emitMakimaToolEnd(job.id, toolName, result);
      },
      onDone: async (fullOutput) => {
        await flushBuffer();
        try {
          const summary = extractJobSummary(fullOutput, job.prompt);
          const verification = await requestAkiVerification(
            fullOutput,
            job.prompt,
            job.userMessage
          );
          await finishMakimaJob(job.id, verification, summary);
          await saveVerificationMessage(chatId, verification);
          emitMakimaAkiVerification(job.id, verification);
        } catch (_err) {
          // Aún así marcar como done con verificación de fallback
          await finishMakimaJob(
            job.id,
            'Listo, Makima completó la tarea que pediste (no se pudo obtener verificación detallada).'
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

async function requestAkiVerification(
  fullOutput: string,
  prompt: string,
  userMessage: string
): Promise<string> {
  try {
    const config = await loadAgentConfig();

    // Truncar output si es muy largo para no exceder contexto
    const truncatedOutput =
      fullOutput.length > 8000
        ? `${fullOutput.slice(0, 4000)}\n\n[... output muy largo, continuación ...]\n\n${fullOutput.slice(-4000)}`
        : fullOutput;

    const messages = [
      {
        role: 'system' as const,
        content:
          'Sos Aki. Recibís el reporte completo de Makima (agente de ejecución) y escribís una respuesta natural para el usuario.\n\nReglas:\n- Explicá qué hizo Makima de forma clara y amigable.\n- No repitas mensajes genéricos como "Makima terminó su tarea". Interpretá el output real.\n- Si Makima encontró archivos, listálos brevemente.\n- Si Makima ejecutó comandos, mencioná el resultado.\n- Si hubo un error, explicá qué pasó sin tecnicismos.\n- Usá Markdown si ayuda a clarificar.\n- Sé conversacional pero conciso (máximo 3-4 oraciones).',
      },
      {
        role: 'user' as const,
        content: `Mensaje original del usuario: ${userMessage}\n\nTarea delegada a Makima: ${prompt}\n\nOutput completo de Makima:\n\n${truncatedOutput}\n\nResumí para el usuario qué hizo Makima y el resultado final.`,
      },
    ];

    const response = await ollama.chat({
      model: config.model,
      messages,
      options: {
        temperature: 0.5,
        num_predict: 1024,
      },
    });

    const content = response.message.content || 'Listo, Makima completó la tarea que pediste.';
    return content;
  } catch {
    return 'Listo, Makima completó la tarea que pediste.';
  }
}

/**
 * Extrae un resumen de la acción principal del output de Makima.
 * Busca: archivos creados/modificados, comandos ejecutados, directorios listados.
 * Fallback: prompt truncado.
 */
function extractJobSummary(fullOutput: string, prompt: string): string {
  // Buscar archivo creado/modificado por write_file
  const writeMatch = fullOutput.match(/write_file\s*\([^)]*['"]([^'"]+)['"]/);
  if (writeMatch) {
    return `Makima creó \`${writeMatch[1]}\``;
  }

  // Buscar archivo creado por create_file
  const createMatch = fullOutput.match(/create_file\s*\([^)]*['"]([^'"]+)['"]/);
  if (createMatch) {
    return `Makima creó \`${createMatch[1]}\``;
  }

  // Buscar archivo modificado por edit_file
  const editMatch = fullOutput.match(/edit_file\s*\([^)]*['"]([^'"]+)['"]/);
  if (editMatch) {
    return `Makima modificó \`${editMatch[1]}\``;
  }

  // Buscar comando ejecutado (primer run_command o shell)
  const runMatch = fullOutput.match(
    /(?:run_command|shell_exec|shell)\s*\([^)]*['"]([^'"]{3,})['"]/
  );
  if (runMatch) {
    const cmd = runMatch[1].slice(0, 30);
    const ellipsis = runMatch[1].length > 30 ? '...' : '';
    return `Makima ejecutó \`${cmd}${ellipsis}\``;
  }

  // Buscar directorio listado
  const lsMatch = fullOutput.match(/list_directory\s*\([^)]*['"]([^'"]+)['"]/);
  if (lsMatch) {
    return `Makima listó \`${lsMatch[1]}\``;
  }

  // Fallback: prompt truncado
  const truncated = prompt.length > 50 ? `${prompt.slice(0, 50)}...` : prompt;
  return `Makima: ${truncated}`;
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

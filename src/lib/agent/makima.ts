import { env } from '@/env';
import { ollama } from '@/lib/ollama';
import { TOOL_DEFINITIONS } from '@/lib/tools/definitions';
import { executeTool } from '@/lib/tools/executor';
import type { OllamaMessage } from './types';

const MAKIMA_MAX_ITERATIONS = 50;

const MAKIMA_SYSTEM_PROMPT = `Sos Makima. Sos un agente de ejecución especializado en operar el sistema de archivos y correr comandos.

Recibís tareas específicas de Aki (el agente conversacional) y las ejecutás con precisión.

Reglas:
- Ejecutá la tarea descripta sin pedir confirmación.
- ANTES de cada herramienta, explicá qué vas a hacer y por qué.
- DESPUÉS de cada herramienta, reportá el resultado de forma clara: qué obtuviste, si funcionó, qué encontraste.
- Si algo falla, describí exactamente qué falló y por qué, sin rodeos.
- Usá formato Markdown cuando sea útil: listas, bloques de código, tablas.
- No charles de más. Sé conciso pero informativo.
- Al terminar, emití un resumen con: (1) qué se hizo, (2) el estado final, (3) si hubo algún problema.
- Nunca inventes resultados. Si no podés completar algo, decilo claramente.`;

export async function runMakimaAgent(params: {
  jobId: string;
  prompt: string;
  userMessage: string;
  onChunk: (chunk: string) => void;
  onDone: (lastChunk: string) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  const { prompt, userMessage, onChunk, onDone, onError } = params;

  try {
    const messages: OllamaMessage[] = [
      { role: 'system', content: MAKIMA_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Mensaje original del usuario: ${userMessage}\n\nTarea delegada por Aki: ${prompt}`,
      },
    ];

    let fullOutput = '';

    for (let iteration = 0; iteration < MAKIMA_MAX_ITERATIONS; iteration++) {
      let iterationContent = '';
      const toolCalls: { function: { name: string; arguments: Record<string, unknown> } }[] = [];

      const stream = await ollama.chat({
        model: env.MAKIMA_MODEL,
        messages,
        stream: true,
        tools: TOOL_DEFINITIONS,
        options: {
          temperature: 0.3,
          num_predict: 4096,
        },
      });

      for await (const chunk of stream) {
        if (chunk.message.content) {
          iterationContent += chunk.message.content;
          fullOutput += chunk.message.content;
          onChunk(chunk.message.content);
        }
        if (chunk.message.tool_calls) {
          toolCalls.push(...chunk.message.tool_calls);
        }
      }

      messages.push({
        role: 'assistant',
        content: iterationContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      });

      if (toolCalls.length === 0) {
        break;
      }

      // Execute tool calls
      for (const call of toolCalls) {
        const result = await executeTool(call);

        messages.push({
          role: 'tool',
          content: `[${call.function.name}]\n${result}`,
        });
      }
    }

    onDone(fullOutput);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

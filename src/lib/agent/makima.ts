import { env } from '@/env';
import { ollama } from '@/lib/ollama';
import { TOOL_DEFINITIONS } from '@/lib/tools/definitions';
import { executeTool } from '@/lib/tools/executor';
import type { OllamaMessage } from './types';

const MAKIMA_MAX_ITERATIONS = 12;

const MAKIMA_SYSTEM_PROMPT = `Sos Makima. Sos un agente de ejecución especializado en operar el sistema de archivos y correr comandos.

Recibís tareas específicas de Aki (el agente conversacional) y las ejecutás con precisión.

Reglas:
- Ejecutá la tarea descripta sin pedir confirmación.
- Reportá cada acción que tomás de forma concisa: qué herramienta usaste y qué resultado obtuviste.
- Si algo falla, describí exactamente qué falló y por qué, sin rodeos.
- No charles. No expliques conceptos. No des contexto innecesario.
- Al terminar, emití un resumen de una o dos líneas: qué se hizo y si hubo algún problema.
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

    const lastChunk = fullOutput.slice(-500);
    onDone(lastChunk);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

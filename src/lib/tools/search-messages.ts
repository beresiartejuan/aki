import { searchMessagesByEmbedding } from '@/lib/embeddings';

/**
 * Execute a semantic search over messages in a chat.
 * Used as a tool for Aki and Reze agents.
 */
export async function searchMessagesTool(
  chatId: string,
  query: string,
  limit?: number
): Promise<string> {
  try {
    const results = await searchMessagesByEmbedding(chatId, query, limit);

    if (results.length === 0) {
      return 'No se encontraron mensajes relevantes en el historial de esta conversación.';
    }

    const lines = results.map((msg, i) => {
      const date = new Date(msg.createdAt).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const roleLabel = msg.role === 'user' ? 'Usuario' : 'Asistente';
      return `[${i + 1}] ${roleLabel} (${date}): ${msg.content}\n(similitud: ${(msg.similarity * 100).toFixed(1)}%)`;
    });

    return lines.join('\n\n');
  } catch (error) {
    return `Error en la búsqueda: ${(error as Error).message}`;
  }
}

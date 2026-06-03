import type { APIRoute } from 'astro';
import { db } from '../../../../db/index';
import { chats, messages } from '../../../../db/schema';
import { createChat, getChatById } from '../../../../db/queries/chats';
import { getMessagesByChatId } from '../../../../db/queries/messages';
import { DEFAULT_USER_ID } from '../../../../lib/constants';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Chat ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get original chat
    const originalChatResult = await getChatById(id);

    if (!originalChatResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: originalChatResult.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!originalChatResult.data) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const originalChat = originalChatResult.data;

    // Get messages
    const messagesResult = await getMessagesByChatId(id);

    if (!messagesResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: messagesResult.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create new chat with copy title
    const newTitle = `${originalChat.title} (copia)`;
    const newChatResult = await createChat({
      userId: DEFAULT_USER_ID,
      agentConfigId: originalChat.agentConfigId,
      title: newTitle,
      projectTag: originalChat.projectTag,
      isPinned: 0,
    });

    if (!newChatResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: newChatResult.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const newChat = newChatResult.data;

    // Copy messages if any
    if (messagesResult.data && messagesResult.data.length > 0) {
      const messagesToInsert = messagesResult.data.map((msg) => ({
        chatId: newChat.id,
        role: msg.role,
        content: msg.content,
        thinkingContent: msg.thinkingContent,
      }));

      await db.insert(messages).values(messagesToInsert);
    }

    return new Response(JSON.stringify(newChat), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
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
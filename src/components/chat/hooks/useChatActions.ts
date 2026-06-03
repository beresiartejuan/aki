import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ChatActionState {
  isDeleting: boolean;
  isRenaming: boolean;
  isExporting: boolean;
  isSharing: boolean;
}

interface UseChatActionsOptions {
  chatId?: string;
  chatTitle: string;
  onChatDeleted?: (chatId: string) => void;
  onTitleUpdated?: (title: string) => void;
}

export function useChatActions({
  chatId,
  chatTitle,
  onChatDeleted,
  onTitleUpdated,
}: UseChatActionsOptions) {
  const [state, setState] = useState<ChatActionState>({
    isDeleting: false,
    isRenaming: false,
    isExporting: false,
    isSharing: false,
  });

  const deleteChat = useCallback(async () => {
    if (!chatId) return false;

    if (!confirm(`¿Eliminar "${chatTitle}"? Esta acción no se puede deshacer.`)) {
      return false;
    }

    setState((prev) => ({ ...prev, isDeleting: true }));

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete chat');
      }

      toast.success('Chat eliminado');
      onChatDeleted?.(chatId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar chat';
      toast.error(errorMessage);
      console.error('Error deleting chat:', err);
      return false;
    } finally {
      setState((prev) => ({ ...prev, isDeleting: false }));
    }
  }, [chatId, chatTitle, onChatDeleted]);

  const renameChat = useCallback(async () => {
    if (!chatId) return false;

    const newTitle = prompt('Nuevo título:', chatTitle);
    if (!newTitle || newTitle.trim() === '' || newTitle.trim() === chatTitle) {
      return false;
    }

    setState((prev) => ({ ...prev, isRenaming: true }));

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rename chat');
      }

      const updatedChat = await response.json();
      onTitleUpdated?.(updatedChat.title);
      toast.success('Chat renombrado');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al renombrar chat';
      toast.error(errorMessage);
      console.error('Error renaming chat:', err);
      return false;
    } finally {
      setState((prev) => ({ ...prev, isRenaming: false }));
    }
  }, [chatId, chatTitle, onTitleUpdated]);

  const exportChat = useCallback(async () => {
    if (!chatId) return false;

    setState((prev) => ({ ...prev, isExporting: true }));

    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const messages = await response.json();

      const exportContent = messages
        .map((msg: { role: string; content: string }) => {
          const role = msg.role === 'user' ? '**Usuario**' : '**Asistente**';
          return `${role}:\n${msg.content}\n`;
        })
        .join('\n---\n\n');

      const blob = new Blob([`# ${chatTitle}\n\n${exportContent}`], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Conversación exportada');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al exportar';
      toast.error(errorMessage);
      console.error('Error exporting chat:', err);
      return false;
    } finally {
      setState((prev) => ({ ...prev, isExporting: false }));
    }
  }, [chatId, chatTitle]);

  const shareChat = useCallback(async () => {
    toast.info('Compartir - Próximamente');
    return false;
  }, []);

  return {
    ...state,
    deleteChat,
    renameChat,
    exportChat,
    shareChat,
  };
}

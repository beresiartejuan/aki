import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { ChatItem } from '@/components/chat/sidebar/types';

interface UseChatActionsProps {
  onSelectChat?: (chatId: string) => void;
  activeChatId?: string;
}

export function useChatActions({ onSelectChat, activeChatId }: UseChatActionsProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Action states
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [duplicatingChatId, setDuplicatingChatId] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch chats');
      }

      setChats(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar chats';
      setError(errorMessage);
      console.error('Error fetching chats:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createChat = async () => {
    setIsCreating(true);

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nueva conversación' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create chat');
      }

      setChats((prev) => [data, ...prev]);
      toast.success('Chat creado');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear chat';
      toast.error(errorMessage);
      console.error('Error creating chat:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    const chatToDelete = chats.find((c) => c.id === chatId);
    if (!chatToDelete) return false;

    if (!confirm(`¿Eliminar "${chatToDelete.title}"? Esta acción no se puede deshacer.`)) {
      return false;
    }

    setDeletingChatId(chatId);

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete chat');
      }

      setChats((prev) => prev.filter((c) => c.id !== chatId));

      if (activeChatId === chatId) {
        onSelectChat?.('');
      }

      toast.success('Chat eliminado');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar chat';
      toast.error(errorMessage);
      console.error('Error deleting chat:', err);
      return false;
    } finally {
      setDeletingChatId(null);
    }
  };

  const startRenaming = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setEditingChatId(chatId);
      setEditingTitle(chat.title);
    }
  };

  const cancelRenaming = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const submitRename = async (chatId: string) => {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      cancelRenaming();
      return false;
    }

    setRenamingChatId(chatId);

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rename chat');
      }

      const updatedChat = await response.json();

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, title: updatedChat.title, updatedAt: updatedChat.updatedAt } : c
        )
      );

      toast.success('Chat renombrado');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al renombrar chat';
      toast.error(errorMessage);
      console.error('Error renaming chat:', err);
      return false;
    } finally {
      setRenamingChatId(null);
      setEditingChatId(null);
      setEditingTitle('');
    }
  };

  const duplicateChat = async (chatId: string) => {
    setDuplicatingChatId(chatId);

    try {
      const response = await fetch(`/api/chats/${chatId}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to duplicate chat');
      }

      const duplicatedChat = await response.json();
      setChats((prev) => [duplicatedChat, ...prev]);
      toast.success('Chat duplicado');
      return duplicatedChat;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al duplicar chat';
      toast.error(errorMessage);
      console.error('Error duplicating chat:', err);
      return null;
    } finally {
      setDuplicatingChatId(null);
    }
  };

  return {
    chats,
    loading,
    error,
    isCreating,
    deletingChatId,
    editingChatId,
    editingTitle,
    renamingChatId,
    duplicatingChatId,
    setEditingTitle,
    fetchChats,
    createChat,
    deleteChat,
    startRenaming,
    cancelRenaming,
    submitRename,
    duplicateChat,
  };
}

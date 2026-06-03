import { useEffect, useState, useCallback } from 'react';
import type { SidebarProps } from './sidebar/types';
import { useUser } from './sidebar/hooks/useUser';
import { useChatActions } from './sidebar/hooks/useChatActions';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { ChatList } from './sidebar/ChatList';

export default function Sidebar({
  onSelectChat,
  activeChatId: propActiveChatId,
  onNewChat,
}: SidebarProps) {
  const { user, isLoggingOut, logout } = useUser();
  const {
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
  } = useChatActions({ onSelectChat, activeChatId: propActiveChatId });

  const [internalActiveChatId, setInternalActiveChatId] = useState<string | undefined>(undefined);
  const activeChatId = propActiveChatId ?? internalActiveChatId;

  // Fetch chats on mount
  useEffect(() => {
    fetchChats().then((chats) => {
      // Select first chat if none selected
      if (!activeChatId && chats.length > 0) {
        handleChatClick(chats[0].id);
      }
    });
  }, []);

  const handleChatClick = useCallback((chatId: string) => {
    setInternalActiveChatId(chatId);
    onSelectChat?.(chatId);
  }, [onSelectChat]);

  const handleNewChat = async () => {
    const newChat = await createChat();
    if (newChat) {
      handleChatClick(newChat.id);
      onNewChat?.(newChat.id);
    }
  };

  const handleMenuAction = async (action: 'rename' | 'duplicate' | 'delete', chatId: string) => {
    if (action === 'rename') {
      startRenaming(chatId);
    } else if (action === 'duplicate') {
      await duplicateChat(chatId);
    } else if (action === 'delete') {
      const success = await deleteChat(chatId);
      if (success && activeChatId === chatId) {
        setInternalActiveChatId(undefined);
      }
    }
  };

  const handleRenameSubmit = async (chatId: string) => {
    await submitRename(chatId);
  };

  return (
    <aside className="flex flex-col h-full w-64 shrink-0 bg-surface border-r border-border">
      <SidebarHeader isCreating={isCreating} onNewChat={handleNewChat} />
      
      <ChatList
        chats={chats}
        loading={loading}
        error={error}
        activeChatId={activeChatId}
        deletingChatId={deletingChatId}
        editingChatId={editingChatId}
        editingTitle={editingTitle}
        renamingChatId={renamingChatId}
        duplicatingChatId={duplicatingChatId}
        onChatClick={handleChatClick}
        onMenuAction={handleMenuAction}
        onRenameSubmit={handleRenameSubmit}
        onRenameCancel={cancelRenaming}
        onEditingTitleChange={setEditingTitle}
      />
      
      <SidebarFooter user={user} isLoggingOut={isLoggingOut} onLogout={logout} />
    </aside>
  );
}

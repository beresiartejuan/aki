import { Loader2 } from 'lucide-react';
import { ChatListItem } from './ChatListItem';
import type { ChatItem } from './types';

interface ChatListProps {
  chats: ChatItem[];
  loading: boolean;
  error: string | null;
  activeChatId?: string;
  deletingChatId: string | null;
  editingChatId: string | null;
  editingTitle: string;
  renamingChatId: string | null;
  duplicatingChatId: string | null;
  onChatClick: (chatId: string) => void;
  onMenuAction: (action: 'rename' | 'duplicate' | 'delete', chatId: string) => void;
  onRenameSubmit: (chatId: string) => void;
  onRenameCancel: () => void;
  onEditingTitleChange: (title: string) => void;
}

export function ChatList({
  chats,
  loading,
  error,
  activeChatId,
  deletingChatId,
  editingChatId,
  editingTitle,
  renamingChatId,
  duplicatingChatId,
  onChatClick,
  onMenuAction,
  onRenameSubmit,
  onRenameCancel,
  onEditingTitleChange,
}: ChatListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive text-sm">
        Error: {error}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No hay chats
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeChatId}
          isDeleting={deletingChatId === chat.id}
          isEditing={editingChatId === chat.id}
          isRenaming={renamingChatId === chat.id}
          isDuplicating={duplicatingChatId === chat.id}
          editingTitle={editingTitle}
          onClick={() => onChatClick(chat.id)}
          onMenuAction={(action) => onMenuAction(action, chat.id)}
          onRenameSubmit={() => onRenameSubmit(chat.id)}
          onRenameCancel={onRenameCancel}
          onEditingTitleChange={onEditingTitleChange}
        />
      ))}
    </div>
  );
}

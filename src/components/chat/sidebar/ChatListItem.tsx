import { Copy, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatItem } from './types';

interface ChatListItemProps {
  chat: ChatItem;
  isActive: boolean;
  isDeleting: boolean;
  isEditing: boolean;
  isRenaming: boolean;
  isDuplicating: boolean;
  editingTitle: string;
  onClick: () => void;
  onMenuAction: (action: 'rename' | 'duplicate' | 'delete') => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onEditingTitleChange: (title: string) => void;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) {
    return minutes < 1 ? 'ahora' : `${minutes}m`;
  } else if (hours < 24) {
    return `${hours}h`;
  } else {
    return `${days}d`;
  }
}

export function ChatListItem({
  chat,
  isActive,
  isEditing,
  isRenaming,
  editingTitle,
  onClick,
  onMenuAction,
  onRenameSubmit,
  onRenameCancel,
  onEditingTitleChange,
}: ChatListItemProps) {
  return (
    <div
      className={`group flex items-start gap-3 py-3 cursor-pointer transition-colors duration-150 ${
        isActive
          ? 'bg-surface-hover border-l-2 border-l-primary pl-[calc(theme(spacing.4)-2px)] pr-4'
          : 'border-l-2 border-l-transparent hover:bg-surface-hover px-4'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 flex items-start gap-3 text-left"
      >
        <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {isEditing ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onEditingTitleChange(e.target.value)}
                onBlur={onRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRenameSubmit();
                  } else if (e.key === 'Escape') {
                    onRenameCancel();
                  }
                }}
                disabled={isRenaming}
                className="font-medium text-foreground text-sm bg-transparent border-none outline-none focus:ring-0 w-full px-0 py-0 disabled:opacity-50"
              />
            ) : (
              <span className="font-medium text-foreground text-sm truncate">{chat.title}</span>
            )}
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTimeAgo(chat.updatedAt)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {chat.projectTag || 'Sin etiqueta'}
          </p>
        </div>
      </button>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger className="h-6 w-6 p-0 flex items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" side="right" className="w-40">
            <DropdownMenuItem onClick={() => onMenuAction('rename')}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>Renombrar</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onMenuAction('duplicate')}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Duplicar</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onMenuAction('delete')}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Eliminar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

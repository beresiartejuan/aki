import {
  Copy,
  Keyboard,
  Loader2,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatItem {
  id: string;
  userId: string;
  agentConfigId: string;
  title: string;
  projectTag: string | null;
  isPinned: number;
  createdAt: number;
  updatedAt: number;
}

interface SidebarProps {
  onSelectChat?: (chatId: string) => void;
  activeChatId?: string;
  onNewChat?: (chatId: string) => void;
}

export default function Sidebar({
  onSelectChat,
  activeChatId: propActiveChatId,
  onNewChat,
}: SidebarProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalActiveChatId, setInternalActiveChatId] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  const activeChatId = propActiveChatId ?? internalActiveChatId;

  // Fetch chats from API
  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/chats');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch chats');
        }

        setChats(data);

        // Select first chat if none selected
        if (!activeChatId && data.length > 0) {
          handleChatClick(data[0].id);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar chats';
        setError(errorMessage);
        console.error('Error fetching chats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  const handleChatClick = (chatId: string) => {
    setInternalActiveChatId(chatId);
    onSelectChat?.(chatId);
  };

  const handleNewChat = async () => {
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

      // Add new chat to list and select it
      setChats((prev) => [data, ...prev]);
      handleChatClick(data.id);
      onNewChat?.(data.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear chat';
      toast.error(errorMessage);
      console.error('Error creating chat:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleMenuAction = (action: string, chatId: string) => {
    console.log(action, chatId);
  };

  const handleHeaderMenuAction = (action: string) => {
    console.log('Header menu:', action);
  };

  const formatTimeAgo = (timestamp: number) => {
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
  };

  return (
    <aside className="flex flex-col h-full w-64 shrink-0 bg-surface border-r border-border">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-black font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-foreground">Aki</span>
          </div>

          {/* Header dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" className="w-48">
              <DropdownMenuItem onClick={() => handleHeaderMenuAction('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleHeaderMenuAction('shortcuts')}>
                <Keyboard className="mr-2 h-4 w-4" />
                <span>Atajos de teclado</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleHeaderMenuAction('logout')}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* New chat button with loading state */}
        <Button
          variant="outline"
          className={`w-full gap-2 border-border text-foreground hover:border-primary hover:text-primary transition-colors duration-150 ${
            isCreating ? 'pointer-events-none opacity-70' : ''
          }`}
          onClick={handleNewChat}
          disabled={isCreating}
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Nuevo chat
        </Button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-destructive text-sm">
            Error: {error}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No hay chats
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => handleChatClick(chat.id)}
                className={`group flex items-start gap-3 py-3 cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'bg-surface-hover border-l-2 border-l-primary pl-[calc(theme(spacing.4)-2px)] pr-4'
                    : 'border-l-2 border-l-transparent hover:bg-surface-hover px-4'
                }`}
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground text-sm truncate">
                      {chat.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTimeAgo(chat.updatedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {chat.projectTag || 'Sin etiqueta'}
                  </p>
                </div>

                {/* Chat item dropdown menu */}
                <div
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right" className="w-40">
                      <DropdownMenuItem onClick={() => handleMenuAction('rename', chat.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Renombrar</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMenuAction('duplicate', chat.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        <span>Duplicar</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleMenuAction('delete', chat.id)}
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
          })
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Usuario</p>
            <p className="text-xs text-muted-foreground">Free Plan</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

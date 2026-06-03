import { Download, MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ChatInput from './ChatInput';
import MessageList, { type MessageListHandle } from './MessageList';

interface ChatAreaProps {
  chatId?: string;
}

export default function ChatArea({ chatId }: ChatAreaProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatTitle, setChatTitle] = useState('Nueva conversación');
  const [projectTag, setProjectTag] = useState<string | null>(null);
  const messageListRef = useRef<MessageListHandle>(null);

  const handleTopBarAction = (action: string) => {
    console.log('topbar action:', action);
  };

  const handleMessageSent = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Optimistic message handler - adds user message to list immediately
  const handleOptimisticMessage = (message: { role: 'user' | 'assistant'; content: string }) => {
    messageListRef.current?.addOptimisticMessage(message);
  };

  // Stream handlers
  const handleStreamStart = () => {
    messageListRef.current?.startStreaming();
  };

  const handleStreamChunk = (chunk: string) => {
    messageListRef.current?.addStreamChunk(chunk);
  };

  const handleStreamThinking = (thinking: string) => {
    messageListRef.current?.addStreamThinking(thinking);
  };

  const handleStreamToolCall = (toolCall: string) => {
    messageListRef.current?.addStreamToolCall(toolCall);
  };

  const handleStreamEnd = () => {
    messageListRef.current?.stopStreaming();
  };

  // Fetch chat details
  useEffect(() => {
    const fetchChatDetails = async () => {
      if (!chatId) {
        setChatTitle('Nueva conversación');
        setProjectTag(null);
        return;
      }

      try {
        const response = await fetch(`/api/chats/${chatId}`);
        const data = await response.json();

        if (response.ok) {
          setChatTitle(data.title);
          setProjectTag(data.projectTag || null);
        }
      } catch (error) {
        console.error('Error fetching chat details:', error);
      }
    };

    fetchChatDetails();
  }, [chatId, refreshKey]);

  // Don't render if no chat selected
  if (!chatId) {
    return (
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-background items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Selecciona un chat o crea uno nuevo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-border shadow-[0_1px_0_0_#222222]">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">{chatTitle}</h1>
          {projectTag && (
            <Badge
              variant="outline"
              className="bg-primary/15 text-primary border-primary/30 text-xs font-medium rounded-full px-2.5 py-0.5"
            >
              {projectTag}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-150"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {/* Top bar dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-150"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleTopBarAction('rename')}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Renombrar chat</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTopBarAction('export')}>
                <Download className="mr-2 h-4 w-4" />
                <span>Exportar conversación</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTopBarAction('share')}>
                <Share2 className="mr-2 h-4 w-4" />
                <span>Compartir</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleTopBarAction('delete')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Eliminar chat</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Message List */}
      <MessageList ref={messageListRef} chatId={chatId} refreshKey={refreshKey} />

      {/* Chat Input */}
      <ChatInput
        chatId={chatId}
        onMessageSent={handleMessageSent}
        onOptimisticMessage={handleOptimisticMessage}
        onStreamStart={handleStreamStart}
        onStreamChunk={handleStreamChunk}
        onStreamThinking={handleStreamThinking}
        onStreamToolCall={handleStreamToolCall}
        onStreamEnd={handleStreamEnd}
      />
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import ChatInput from './ChatInput';
import MessageList, { type MessageListHandle } from './MessageList';
import { ChatHeader } from './ChatHeader';
import { useChatActions } from './hooks/useChatActions';

interface ChatAreaProps {
  chatId?: string;
  onChatDeleted?: (chatId: string) => void;
}

export default function ChatArea({ chatId, onChatDeleted }: ChatAreaProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatTitle, setChatTitle] = useState('Nueva conversación');
  const [projectTag, setProjectTag] = useState<string | null>(null);
  const messageListRef = useRef<MessageListHandle>(null);

  const {
    isDeleting,
    isRenaming,
    isExporting,
    deleteChat,
    renameChat,
    exportChat,
    shareChat,
  } = useChatActions({
    chatId,
    chatTitle,
    onChatDeleted,
    onTitleUpdated: setChatTitle,
  });

  const handleMessageSent = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleOptimisticMessage = (message: { role: 'user' | 'assistant'; content: string }) => {
    messageListRef.current?.addOptimisticMessage(message);
  };

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
      <ChatHeader
        chatTitle={chatTitle}
        projectTag={projectTag}
        isDeleting={isDeleting}
        isRenaming={isRenaming}
        isExporting={isExporting}
        onRename={renameChat}
        onExport={exportChat}
        onShare={shareChat}
        onDelete={deleteChat}
      />

      <MessageList ref={messageListRef} chatId={chatId} refreshKey={refreshKey} />

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

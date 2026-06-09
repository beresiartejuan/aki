import { useEffect, useRef, useState } from 'react';
import { useMakimaJobStatus } from '@/hooks/useMakimaJobStatus';
import { ChatHeader } from './ChatHeader';
import ChatInput from './ChatInput';
import { useChatActions } from './hooks/useChatActions';
import MessageList, { type MessageListHandle } from './MessageList';

interface ChatAreaProps {
  chatId?: string;
  onChatDeleted?: (chatId: string) => void;
  onOpenMakimaPanel?: (jobId: string) => void;
}

export default function ChatArea({ chatId, onChatDeleted, onOpenMakimaPanel }: ChatAreaProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatTitle, setChatTitle] = useState('Nueva conversación');
  const [projectTag, setProjectTag] = useState<string | null>(null);
  const [activeMakimaJobId, setActiveMakimaJobId] = useState<string | null>(null);
  const messageListRef = useRef<MessageListHandle>(null);

  const makimaStatus = useMakimaJobStatus(activeMakimaJobId);

  // Auto-refresh chat messages when Makima finishes
  useEffect(() => {
    if (makimaStatus === 'done' || makimaStatus === 'error') {
      setRefreshKey((prev) => prev + 1);
      // Clear the tracked job after a delay so the chip stays visible for a bit
      const timeout = setTimeout(() => {
        setActiveMakimaJobId(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [makimaStatus]);

  const { isDeleting, isRenaming, isExporting, deleteChat, renameChat, exportChat, shareChat } =
    useChatActions({
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

  const handleMakimaJobCreated = (jobId: string) => {
    setActiveMakimaJobId(jobId);
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
  }, [chatId]);

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

      <MessageList
        ref={messageListRef}
        chatId={chatId}
        refreshKey={refreshKey}
        onOpenMakimaPanel={onOpenMakimaPanel}
      />

      <ChatInput
        chatId={chatId}
        onMessageSent={handleMessageSent}
        onOptimisticMessage={handleOptimisticMessage}
        onStreamStart={handleStreamStart}
        onStreamChunk={handleStreamChunk}
        onStreamThinking={handleStreamThinking}
        onStreamToolCall={handleStreamToolCall}
        onStreamEnd={handleStreamEnd}
        onMakimaJobCreated={handleMakimaJobCreated}
        disabled={makimaStatus === 'running' || makimaStatus === 'pending'}
      />
    </div>
  );
}

import { ChevronDown, ChevronUp, Settings, Sparkles } from 'lucide-react';
import * as React from 'react';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinkingContent: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: number;
}

interface MessageListProps {
  chatId: string;
  refreshKey: number;
}

export interface MessageListHandle {
  addOptimisticMessage: (message: { role: 'user' | 'assistant'; content: string }) => void;
  startStreaming: () => void;
  addStreamChunk: (chunk: string) => void;
  addStreamThinking: (thinking: string) => void;
  addStreamToolCall: (toolCall: string) => void;
  stopStreaming: () => void;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 shadow-inner">
        <span className="text-black text-lg font-bold tracking-tight">A</span>
      </div>
      <h2 className="text-xl font-medium text-foreground mb-2">¿En qué puedo ayudarte hoy?</h2>
      <p className="text-sm text-muted-foreground">Escribe un mensaje para comenzar</p>
    </div>
  );
}

const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(
  { chatId, refreshKey },
  ref
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThinking, setStreamingThinking] = useState<string | null>(null);
  const [streamingToolCalls, setStreamingToolCalls] = useState<string[]>([]);
  const [showToolCalls, setShowToolCalls] = useState(true);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    addOptimisticMessage: (msg) => {
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        chatId,
        role: msg.role,
        content: msg.content,
        thinkingContent: null,
        inputTokens: null,
        outputTokens: null,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);
    },
    startStreaming: () => {
      setIsStreaming(true);
      setStreamingContent('');
      setStreamingThinking(null);
      setStreamingToolCalls([]);
      setShowToolCalls(true);
    },
    addStreamChunk: (chunk) => {
      setStreamingContent((prev) => prev + chunk);
    },
    addStreamThinking: (thinking) => {
      setStreamingThinking((prev) => (prev ?? '') + thinking);
    },
    addStreamToolCall: (toolCall) => {
      setStreamingToolCalls((prev) => [...prev, toolCall]);
    },
    stopStreaming: () => {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingThinking(null);
      setShowToolCalls(false);
    },
  }));

  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/chats/${chatId}/messages`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch messages');
        }

        setMessages(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar mensajes';
        setError(errorMessage);
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [chatId, refreshKey]);

  // Group messages into conversation turns (user + assistant pairs)
  const turns: { user?: Message; assistant?: Message }[] = [];

  messages.forEach((msg) => {
    if (msg.role === 'user') {
      turns.push({ user: msg });
    } else if (msg.role === 'assistant' && turns.length > 0) {
      turns[turns.length - 1].assistant = msg;
    }
  });

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pt-8 pb-4">
        <div className="max-w-3xl mx-auto w-full pb-0">
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse">Cargando mensajes...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pt-8 pb-4">
        <div className="max-w-3xl mx-auto w-full pb-0">
          <div className="flex items-center justify-center h-full">
            <div className="text-destructive">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6">
        <div className="max-w-3xl mx-auto w-full h-full">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pt-8 pb-4">
      <div className="max-w-3xl mx-auto w-full pb-0">
        {turns.map((turn, index) => (
          <div key={index} className="mb-6">
            {/* User message */}
            {turn.user && (
              <MessageBubble
                role="user"
                content={turn.user.content}
                timestamp={new Date(turn.user.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                thinking={turn.user.thinkingContent}
              />
            )}

            {/* Assistant message - close to user message */}
            {turn.assistant && (
              <div className="mt-2">
                <MessageBubble
                  role="assistant"
                  content={turn.assistant.content}
                  timestamp={new Date(turn.assistant.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  thinking={turn.assistant.thinkingContent}
                />
              </div>
            )}
          </div>
        ))}

        {/* Streaming assistant message */}
        {isStreaming && (
          <div className="mb-6">
            {/* Tool calls section */}
            {streamingToolCalls.length > 0 && showToolCalls && (
              <div className="mb-3">
                <button
                  onClick={() => setShowToolCalls(!showToolCalls)}
                  className="flex items-center gap-2 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 p-2 rounded-lg hover:bg-surface"
                >
                  <Settings className="h-4 w-4" />
                  <span>Usando herramientas</span>
                  {showToolCalls ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </button>

                {showToolCalls && (
                  <div className="bg-surface/50 border border-border/40 rounded-lg p-3 mt-1 space-y-1">
                    {streamingToolCalls.map((toolCall, idx) => (
                      <div key={idx} className="font-mono text-xs text-muted-foreground">
                        {toolCall}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-2">
              <MessageBubble
                role="assistant"
                content={streamingContent}
                thinking={streamingThinking}
                isStreaming={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageList;

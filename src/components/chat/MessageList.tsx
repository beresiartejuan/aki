import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
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
  makimaJobId: string | null;
  agentId: string | null;
  createdAt: number;
}

interface MakimaJobLite {
  id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  summary: string | null;
}

interface MessageListProps {
  chatId: string;
  refreshKey: number;
  onOpenMakimaPanel?: (jobId: string) => void;
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
  { chatId, refreshKey, onOpenMakimaPanel },
  ref
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [makimaJobs, setMakimaJobs] = useState<Map<string, MakimaJobLite>>(new Map());
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
        makimaJobId: null,
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional refetch trigger
  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatId) return;

      setLoading(true);
      setError(null);

      try {
        const [messagesRes, jobsRes] = await Promise.all([
          fetch(`/api/chats/${chatId}/messages`),
          fetch(`/api/makima/jobs?chatId=${chatId}`),
        ]);

        const messagesData = await messagesRes.json();
        const jobsData = jobsRes.ok ? await jobsRes.json() : [];

        if (!messagesRes.ok) {
          throw new Error(messagesData.error || 'Failed to fetch messages');
        }

        setMessages(messagesData);

        const jobsMap = new Map<string, MakimaJobLite>();
        for (const job of jobsData) {
          jobsMap.set(job.id, {
            id: job.id,
            status: job.status,
            summary: job.summary ?? null,
          });
        }
        setMakimaJobs(jobsMap);
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
      <div className="max-w-3xl mx-auto w-full pb-0 space-y-6">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <MessageBubble
                key={msg.id}
                senderRole="user"
                content={msg.content}
                timestamp={new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                thinking={msg.thinkingContent}
              />
            );
          }

          if (msg.role === 'assistant') {
            const job = msg.makimaJobId ? makimaJobs.get(msg.makimaJobId) : undefined;
            return (
              <div key={msg.id} className="mt-2">
                <MessageBubble
                  senderRole="assistant"
                  content={msg.content}
                  timestamp={new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  thinking={msg.thinkingContent}
                  makimaJobId={msg.makimaJobId}
                  makimaJobStatus={job?.status}
                  makimaJobSummary={job?.summary ?? null}
                  onOpenMakimaPanel={onOpenMakimaPanel}
                  agentId={msg.agentId}
                />
              </div>
            );
          }

          return null;
        })}

        {/* Streaming assistant message */}
        {isStreaming && (
          <div className="mb-6">
            {/* Tool calls section */}
            {streamingToolCalls.length > 0 && showToolCalls && (
              <div className="mb-3">
                <button
                  type="button"
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
                    {streamingToolCalls.map((toolCall) => (
                      <div key={toolCall} className="font-mono text-xs text-muted-foreground">
                        {toolCall}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-2">
              <MessageBubble
                senderRole="assistant"
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

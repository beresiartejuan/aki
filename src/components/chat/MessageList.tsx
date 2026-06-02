import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import MessageBubble from "./MessageBubble";

interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 shadow-inner">
        <span className="text-black text-lg font-bold tracking-tight">A</span>
      </div>
      <h2 className="text-xl font-medium text-foreground mb-2">
        ¿En qué puedo ayudarte hoy?
      </h2>
      <p className="text-sm text-muted-foreground">
        Escribe un mensaje para comenzar
      </p>
    </div>
  );
}

export default function MessageList({ chatId, refreshKey }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (msg.role === "user") {
      turns.push({ user: msg });
    } else if (msg.role === "assistant" && turns.length > 0) {
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

  if (messages.length === 0) {
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
                role={turn.user.role}
                content={turn.user.content}
                timestamp={new Date(turn.user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                thinking={turn.user.thinkingContent}
              />
            )}
            
            {/* Assistant message - close to user message */}
            {turn.assistant && (
              <div className="mt-2">
                <MessageBubble
                  role={turn.assistant.role}
                  content={turn.assistant.content}
                  timestamp={new Date(turn.assistant.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  thinking={turn.assistant.thinkingContent}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

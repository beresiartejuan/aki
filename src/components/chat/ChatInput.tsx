import { ArrowUp, Loader2, Zap, ZapOff } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAutoResizeTextarea } from './hooks/useAutoResizeTextarea';

interface ChatInputProps {
  chatId: string;
  onMessageSent: () => void;
  onOptimisticMessage?: (message: { role: 'user' | 'assistant'; content: string }) => void;
  onStreamStart?: () => void;
  onStreamChunk?: (chunk: string) => void;
  onStreamThinking?: (thinking: string) => void;
  onStreamToolCall?: (toolCall: string) => void;
  onStreamEnd?: () => void;
  onMakimaJobCreated?: (jobId: string) => void;
  onAgentSelected?: (agentId: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export default function ChatInput({
  chatId,
  onMessageSent,
  onOptimisticMessage,
  onStreamStart,
  onStreamChunk,
  onStreamThinking,
  onStreamToolCall,
  onStreamEnd,
  onMakimaJobCreated,
  disabled = false,
  disabledReason = 'Escribe un mensaje...',
}: ChatInputProps) {
  // Reze mode state persisted in localStorage
  const [rezeMode, setRezeMode] = useState(() => {
    try {
      return localStorage.getItem('reze-mode') === 'true';
    } catch {
      return false;
    }
  });

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { textareaRef, resetHeight } = useAutoResizeTextarea(inputValue);

  useEffect(() => {
    localStorage.setItem('reze-mode', String(rezeMode));
  }, [rezeMode]);

  const toggleReze = () => setRezeMode((prev) => !prev);

  const isDisabled = loading || disabled;

  const handleSend = async () => {
    if (inputValue.trim() === '' || isDisabled) return;

    const messageToSend = inputValue.trim();
    setLoading(true);
    setError(null);
    setInputValue('');
    resetHeight();

    onOptimisticMessage?.({ role: 'user', content: messageToSend });
    onStreamStart?.();

    const params = new URLSearchParams({
      chatId,
      message: messageToSend,
      thinking: 'false',
      agent: rezeMode ? 'reze' : 'aki',
    });

    const source = new EventSource(`/api/chat/stream?${params}`);
    const abortController = new AbortController();

    const cleanup = () => {
      source.close();
    };

    abortController.signal.addEventListener('abort', cleanup);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'content') {
          onStreamChunk?.(data.text);
        } else if (data.type === 'thinking') {
          onStreamThinking?.(data.text);
        } else if (data.type === 'tool_call') {
          onStreamToolCall?.(data.text);
        } else if (data.type === 'done') {
          source.close();
          setLoading(false);
          onStreamEnd?.();
          onMessageSent();
        } else if (data.type === 'makima_job_created') {
          onMakimaJobCreated?.(data.jobId);
        } else if (data.type === 'error') {
          source.close();
          setLoading(false);
          const errorMessage = data.message || 'Error al obtener respuesta';
          setError(errorMessage);
          toast.error(errorMessage);
          onStreamEnd?.();
        }
      } catch (_err) {
        // Ignore parsing errors
      }
    };

    source.onerror = () => {
      source.close();
      setLoading(false);
      const errorMessage = 'Error de conexión';
      setError(errorMessage);
      toast.error(errorMessage);
      onStreamEnd?.();
    };

    return () => {
      abortController.abort();
    };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() !== '' && !isDisabled) {
        handleSend();
      }
    }
  };

  const getPlaceholder = () => {
    if (isDisabled && disabledReason !== 'Escribe un mensaje...') return disabledReason;
    return 'Escribe un mensaje...';
  };

  const getButtonClasses = (isActive: boolean, isReze = false) => {
    if (isActive) {
      return `h-8 w-8 rounded-lg bg-primary/20 text-primary border border-primary/40 ${isReze ? 'ring-1 ring-primary/50 animate-pulse' : ''}`;
    }
    return 'h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-150';
  };

  const isSendDisabled = inputValue.trim() === '' || isDisabled;

  return (
    <TooltipProvider>
      <div className="shrink-0 p-4 border-t border-border">
        <div className="mx-auto max-w-3xl w-full">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden focus-within:border-primary/40 focus-within:shadow-[0_0_0_1px_rgba(249,115,22,0.15)] transition-all duration-200">
            {/* Textarea */}
            <div className="px-4 pt-3">
              <Textarea
                ref={textareaRef}
                placeholder={getPlaceholder()}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isDisabled}
                className="min-h-[44px] max-h-[200px] w-full bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-0 focus:border-none border-0 p-0 shadow-none overflow-y-hidden"
                style={{ minHeight: '44px' }}
                rows={1}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="px-4">
                <p className="text-destructive text-xs mt-1">{error}</p>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-border/40">
              {/* Left side - tools */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={getButtonClasses(rezeMode, true)}
                      onClick={toggleReze}
                      disabled={loading || disabled}
                    >
                      {rezeMode ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{rezeMode ? 'Reze (activo)' : 'Reze (inactivo)'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Right side - send button */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground/40 hidden sm:block">
                  Enter para enviar
                </span>
                <Button
                  size="icon"
                  disabled={isSendDisabled}
                  onClick={handleSend}
                  className={`h-8 w-8 rounded-full transition-all duration-150 ${
                    isSendDisabled
                      ? 'opacity-40 cursor-not-allowed bg-primary/50 text-black'
                      : 'bg-primary hover:bg-primary/90 text-black hover:scale-105'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

import { useState, useEffect, useRef } from "react";
import { Brain, Paperclip, Target, Mic, ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ChatInputProps {
  chatId: string;
  onMessageSent: () => void;
}

export default function ChatInput({ chatId, onMessageSent }: ChatInputProps) {
  // Toolbar active states
  const [thinkingActive, setThinkingActive] = useState(false);
  const [attachActive, setAttachActive] = useState(false);
  const [goalActive, setGoalActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  
  // Input state
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle handlers with mutual exclusivity
  const toggleThinking = () => setThinkingActive(prev => !prev);
  
  const toggleAttach = () => {
    setAttachActive(prev => {
      const newState = !prev;
      if (newState) setAudioActive(false); // Mutual exclusion
      return newState;
    });
  };
  
  const toggleGoal = () => setGoalActive(prev => !prev);
  
  const toggleAudio = () => {
    setAudioActive(prev => {
      const newState = !prev;
      if (newState) setAttachActive(false); // Mutual exclusion
      return newState;
    });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
      
      // Enable/disable scroll based on height
      if (textareaRef.current.scrollHeight > 200) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (inputValue.trim() === "" || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          message: inputValue,
          thinking: thinkingActive,
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      // Clear input
      setInputValue("");
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Notify parent to refresh messages
      onMessageSent();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al enviar';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() !== "" && !loading) {
        handleSend();
      }
    }
  };

  const isSendDisabled = inputValue.trim() === "" || loading;

  // Get button classes based on active state
  const getButtonClasses = (isActive: boolean, isThinking = false) => {
    if (isActive) {
      return `h-8 w-8 rounded-lg bg-primary/20 text-primary border border-primary/40 ${isThinking ? 'ring-1 ring-primary/50 animate-pulse' : ''}`;
    }
    return "h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-150";
  };

  return (
    <TooltipProvider>
      <div className="shrink-0 p-4 border-t border-border">
        <div className="mx-auto max-w-3xl w-full">
          {/* Unified card wrapping both textarea and toolbar */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden focus-within:border-primary/40 focus-within:shadow-[0_0_0_1px_rgba(249,115,22,0.15)] transition-all duration-200">
            {/* Textarea */}
            <div className="px-4 pt-3">
              <Textarea
                ref={textareaRef}
                placeholder="Escribe un mensaje..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
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

            {/* Toolbar row - unified with the card, no separate background */}
            <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-border/40">
              {/* Left side - tools */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={getButtonClasses(thinkingActive, true)}
                      onClick={toggleThinking}
                      disabled={loading}
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Thinking</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={getButtonClasses(attachActive)}
                      onClick={toggleAttach}
                      disabled={loading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Adjuntar</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={getButtonClasses(goalActive)}
                      onClick={toggleGoal}
                      disabled={loading}
                    >
                      <Target className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Objetivo</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={getButtonClasses(audioActive)}
                      onClick={toggleAudio}
                      disabled={loading}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Audio</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Right side - send button + hint */}
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

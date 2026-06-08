import { Brain, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  thinking?: string | null;
  isStreaming?: boolean;
}

// User messages stay as plain text - no markdown rendering
function UserMessageContent({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-7 text-foreground whitespace-pre-wrap">
      {content}
    </div>
  );
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  thinking,
  isStreaming,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // Silently fail
    }
  };

  const copyButtonClasses = copied
    ? 'h-6 w-6 text-primary'
    : 'h-6 w-6 text-muted-foreground hover:text-foreground';

  if (role === 'user') {
    return (
      <div className="group relative mb-2 w-full">
        {/* User message - soft card with proper left border accent */}
        <div className="bg-surface rounded-2xl rounded-tl-none border-l-[3px] border-primary px-4 py-3 pr-10">
          {/* Copy button - appears on hover, positioned inside the card */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <Button
              variant="ghost"
              size="icon"
              className={copyButtonClasses}
              onClick={handleCopy}
              title="Copiar mensaje"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>

          <UserMessageContent content={content} />

          {/* Timestamp - appears on hover */}
          {timestamp && (
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-2 block">
              {timestamp}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="group relative flex gap-3">
      {/* Assistant avatar - lighter, less dominant */}
      <div className="opacity-90">
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shrink-0 self-start mt-0.5">
          <span className="text-black text-xs font-semibold">A</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {/* Thinking section */}
        {thinking && (
          <div className="mb-3">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-2 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 p-2 rounded-lg hover:bg-surface"
            >
              <Brain className="h-4 w-4" />
              <span>Ver razonamiento</span>
              {showThinking ? (
                <ChevronUp className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-auto" />
              )}
            </button>

            {showThinking && (
              <div className="bg-surface/50 border border-border/50 rounded-lg p-3 text-sm text-muted-foreground font-mono mt-1">
                {thinking}
              </div>
            )}
          </div>
        )}

        {/* Copy button - appears on hover */}
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 transition-colors duration-150 ${copied ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={handleCopy}
            title="Copiar mensaje"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Message content */}
        <div className="text-[15px] leading-7 text-foreground pr-10">
          <MarkdownRenderer content={content} streaming={isStreaming} />
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary/60 ml-1 animate-pulse" />
          )}
        </div>

        {/* Timestamp - appears on hover (only when not streaming) */}
        {timestamp && !isStreaming && (
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-2 block">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}

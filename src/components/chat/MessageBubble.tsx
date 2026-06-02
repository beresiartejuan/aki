import { useState } from "react";
import { Copy, Check, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  thinking?: string | null;
}

function parseMarkdownContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  const result: React.ReactNode[] = [];
  let currentList: React.ReactNode[] | null = null;
  let key = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    if (trimmed === '') {
      if (currentList) {
        result.push(
          <ul key={`list-${key++}`} className="pl-4 space-y-1 my-2">
            {currentList}
          </ul>
        );
        currentList = null;
      }
      return;
    }

    if (trimmed.match(/^\d+\./) || trimmed.match(/^-/)) {
      const text = trimmed.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '');
      if (!currentList) currentList = [];
      currentList.push(
        <li key={`item-${index}`} className="text-[15px] leading-7 text-foreground">
          {parseInlineFormatting(text)}
        </li>
      );
      return;
    }

    if (currentList) {
      result.push(
        <ul key={`list-${key++}`} className="pl-4 space-y-1 my-2">
          {currentList}
        </ul>
      );
      currentList = null;
    }

    if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.slice(2, -2).includes('**')) {
      const text = trimmed.slice(2, -2);
      result.push(
        <h3 key={`h-${index}`} className="text-white font-semibold mt-4 mb-2 text-[15px]">
          {text}
        </h3>
      );
      return;
    }

    result.push(
      <p key={`p-${index}`} className="text-[15px] leading-7 text-foreground mb-3">
        {parseInlineFormatting(line)}
      </p>
    );
  });

  if (currentList) {
    result.push(
      <ul key={`list-${key++}`} className="pl-4 space-y-1 my-2">
        {currentList}
      </ul>
    );
  }

  return <>{result}</>;
}

function parseInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/`([^`]+)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(parseBoldText(remaining.slice(0, codeMatch.index), key++));
      }
      parts.push(
        <code key={key++} className="bg-surface px-1.5 py-0.5 rounded text-sm font-mono text-orange-400">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
    } else {
      parts.push(parseBoldText(remaining, key++));
      break;
    }
  }

  return <>{parts}</>;
}

function parseBoldText(text: string, key: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let partKey = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={`text-${partKey++}`}>{remaining.slice(0, boldMatch.index)}</span>);
      }
      parts.push(
        <strong key={`bold-${partKey++}`} className="text-white font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(<span key={`text-${partKey++}`}>{remaining}</span>);
      break;
    }
  }

  return <span key={key}>{parts}</span>;
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  thinking,
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
    ? "h-6 w-6 text-primary" 
    : "h-6 w-6 text-muted-foreground hover:text-foreground";

  if (role === "user") {
    return (
      <div className="group relative mb-2 max-w-2xl w-fit">
        {/* User message - soft card with proper left border accent */}
        <div 
          className="bg-surface rounded-2xl rounded-tl-none border-l-[3px] border-primary px-4 py-3 pr-10"
        >
          {/* Copy button - appears on hover, positioned inside the card */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <Button
              variant="ghost"
              size="icon"
              className={copyButtonClasses}
              onClick={handleCopy}
              title="Copiar mensaje"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>

          <div className="text-[15px] leading-7 text-foreground">
            {parseMarkdownContent(content)}
          </div>
          
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
          {parseMarkdownContent(content)}
        </div>

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

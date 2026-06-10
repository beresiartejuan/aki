import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Loader2,
  Play,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { useMakimaStream } from '@/hooks/useMakimaStream';

interface MakimaJob {
  id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  prompt: string;
  summary: string | null;
  createdAt: number;
  finishedAt: number | null;
}

interface MakimaPanelProps {
  isOpen: boolean;
  chatId: string;
  focusedJobId: string | null;
  onClose: () => void;
}

function StatusBadge({ status }: { status: MakimaJob['status'] }) {
  const configs = {
    pending: {
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/20',
      label: 'Pendiente',
    },
    running: {
      icon: Loader2,
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
      border: 'border-orange-400/20',
      label: 'Ejecutando',
    },
    done: {
      icon: Zap,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      label: 'Completado',
    },
    error: {
      icon: Zap,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/20',
      label: 'Error',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.bg} ${config.color} ${config.border}`}
    >
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

interface CompactToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: string;
  error?: boolean;
}

function ToolCallRow({ tool }: { tool: CompactToolCall }) {
  const [expanded, setExpanded] = useState(false);

  // Extract primary argument
  const primaryArg = Object.values(tool.args)[0] as string | undefined;
  const argDisplay = primaryArg ? String(primaryArg).slice(0, 40) : '';
  const argTruncated = primaryArg && String(primaryArg).length > 40 ? '...' : '';

  const success = tool.result !== undefined && !tool.error;

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-surface/30 transition-colors"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        )}
        <Play className="h-3 w-3 text-orange-400/60 shrink-0" />
        <span className="font-mono text-orange-300/80 shrink-0">{tool.toolName}</span>
        {argDisplay && (
          <span className="text-muted-foreground/50 truncate">
            {argDisplay}
            {argTruncated}
          </span>
        )}
        <span className="ml-auto shrink-0">
          {success ? (
            <span className="text-emerald-400/80">&#10003;</span>
          ) : tool.error ? (
            <span className="text-red-400/80">&#10007;</span>
          ) : (
            <Loader2 className="h-3 w-3 text-orange-400/60 animate-spin" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 pl-8 space-y-1.5">
          <pre className="text-[11px] font-mono text-muted-foreground/60 bg-[#0a0a0a] rounded px-2 py-1.5 border border-border/30 whitespace-pre-wrap break-all">
            {JSON.stringify(tool.args, null, 2)}
          </pre>
          {tool.result !== undefined && (
            <pre
              className={`text-[11px] font-mono rounded px-2 py-1.5 border border-border/30 whitespace-pre-wrap break-all ${
                tool.error
                  ? 'text-red-300/60 bg-red-950/20'
                  : 'text-emerald-300/60 bg-emerald-950/10'
              }`}
            >
              {tool.result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Reconstruct chronological mixed content: markdown text interleaved with tool calls.
 */
function MixedOutput({
  output,
  toolCalls,
  isStreaming,
}: {
  output: string;
  toolCalls: CompactToolCall[];
  isStreaming: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: output intentionally triggers scroll update
  useEffect(() => {
    if (scrollRef.current && isStreaming) {
      const container = scrollRef.current;
      const isNearBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [isStreaming, output, toolCalls.length]);

  // Parse output into segments: text chunks and tool call markers
  const segments = parseOutput(output, toolCalls);
  let segmentCounter = 0;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-thin text-[13px] leading-6 text-foreground/80 bg-[#0d0d0d] rounded-lg border border-border/60"
    >
      {segments.length === 0 && !output && !isStreaming ? (
        <div className="px-4 py-6 text-center">
          <span className="text-muted-foreground/40 italic">Esperando output...</span>
        </div>
      ) : (
        <div className="p-4">
          {segments.map((seg) => {
            const key = `seg-${segmentCounter++}`;
            return seg.type === 'text' ? (
              <div key={key} className="mb-3">
                <MarkdownRenderer
                  content={seg.content}
                  streaming={isStreaming && key === `seg-${segments.length - 1}`}
                />
              </div>
            ) : (
              <div key={key} className="mb-2 -mx-1">
                <ToolCallRow tool={seg.tool} />
              </div>
            );
          })}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-orange-400/60 ml-1 animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}

type Segment = { type: 'text'; content: string } | { type: 'tool'; tool: CompactToolCall };

function parseOutput(output: string, toolCalls: CompactToolCall[]): Segment[] {
  if (!output) return [];

  const segments: Segment[] = [];
  let remaining = output;

  // Tool call marker patterns in the output
  for (const tool of toolCalls) {
    const marker = `ToolCall: ${tool.toolName}`;
    const idx = remaining.indexOf(marker);
    if (idx !== -1) {
      // Text before this tool call
      const before = remaining.slice(0, idx).trim();
      if (before) {
        segments.push({ type: 'text', content: before });
      }
      segments.push({ type: 'tool', tool });
      remaining = remaining.slice(idx + marker.length);
    }
  }

  // Any remaining text after the last tool call
  const final = remaining.trim();
  if (final) {
    segments.push({ type: 'text', content: final });
  }

  // If no tool calls were found, return the whole thing as text
  if (segments.length === 0) {
    segments.push({ type: 'text', content: output.trim() });
  }

  return segments;
}

export default function MakimaPanel({ isOpen, chatId, focusedJobId, onClose }: MakimaPanelProps) {
  const [jobs, setJobs] = useState<MakimaJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(focusedJobId);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  // Panel width with resize
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('makimaPanelWidth');
      return saved ? Number.parseInt(saved, 10) : 520;
    }
    return 520;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const { output, status: _status, isStreaming, toolCalls } = useMakimaStream(selectedJobId);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch(`/api/makima/jobs?chatId=${chatId}`);
      const data = await response.json();
      if (response.ok) {
        setJobs(data);
      }
    } catch (err) {
      console.error('Error fetching makima jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [chatId, fetchJobs]);

  // When focusedJobId changes or jobs load, select the right job
  useEffect(() => {
    if (focusedJobId) {
      setSelectedJobId(focusedJobId);
    } else if (jobs.length > 0 && !selectedJobId) {
      // Show most recent job
      const mostRecent = [...jobs].sort((a, b) => b.createdAt - a.createdAt)[0];
      setSelectedJobId(mostRecent.id);
    }
  }, [focusedJobId, jobs, selectedJobId]);

  // Sort jobs by createdAt for navigation
  const sortedJobs = [...jobs].sort((a, b) => a.createdAt - b.createdAt);
  const currentIndex = selectedJobId ? sortedJobs.findIndex((j) => j.id === selectedJobId) : -1;

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < sortedJobs.length - 1;

  const goPrev = useCallback(() => {
    if (canGoPrev) setSelectedJobId(sortedJobs[currentIndex - 1].id);
  }, [canGoPrev, sortedJobs, currentIndex]);

  const goNext = useCallback(() => {
    if (canGoNext) setSelectedJobId(sortedJobs[currentIndex + 1].id);
  }, [canGoNext, sortedJobs, currentIndex]);

  const currentJob = sortedJobs[currentIndex];

  // Resize handlers
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.max(360, Math.min(newWidth, window.innerWidth * 0.7));
      setPanelWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('makimaPanelWidth', String(panelWidth));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panelWidth]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowLeft' && canGoPrev) {
        goPrev();
      } else if (e.key === 'ArrowRight' && canGoNext) {
        goNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canGoPrev, canGoNext, goPrev, goNext, onClose]);

  if (!chatId) return null;

  return (
    <div
      className={`
        flex flex-col shrink-0 border-l border-border/60 bg-[#0c0c0c]/95 backdrop-blur-sm
        transition-transform duration-300 ease-out
        absolute right-0 top-0 bottom-0 z-40
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
      style={{ width: isOpen ? panelWidth : 0, overflow: isOpen ? 'visible' : 'hidden' }}
    >
      {/* Resize handle */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: div is a draggable resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={() => setIsResizing(true)}
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-orange-500/30 transition-colors z-50 ${
          isResizing ? 'bg-orange-500/40' : 'bg-transparent'
        }`}
        title="Arrastra para redimensionar"
      />

      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/makima_profile_picture (1).png"
            alt="Makima"
            className="h-8 w-8 rounded-md object-cover border border-border/30"
          />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Makima</h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Navigation */}
          {sortedJobs.length > 1 && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goPrev}
                disabled={!canGoPrev}
              >
                <ChevronLeft
                  className={`h-4 w-4 ${canGoPrev ? 'text-foreground/70' : 'text-muted-foreground/30'}`}
                />
              </Button>
              <span className="text-xs text-muted-foreground/70 tabular-nums min-w-[40px] text-center">
                {sortedJobs.length > 0 ? `${currentIndex + 1} / ${sortedJobs.length}` : ''}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goNext}
                disabled={!canGoNext}
              >
                <ChevronRight
                  className={`h-4 w-4 ${canGoNext ? 'text-foreground/70' : 'text-muted-foreground/30'}`}
                />
              </Button>
            </div>
          )}

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Job subtitle */}
      {currentJob && (
        <div className="shrink-0 px-4 py-2.5 border-b border-border/40 bg-[#0a0a0a]/50">
          <p className="text-[13px] text-foreground/80 leading-snug line-clamp-1">
            {currentJob.prompt.length > 60
              ? `${currentJob.prompt.slice(0, 60)}...`
              : currentJob.prompt}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                currentJob.status === 'done'
                  ? 'bg-emerald-400'
                  : currentJob.status === 'error'
                    ? 'bg-red-400'
                    : currentJob.status === 'running'
                      ? 'bg-orange-400 animate-pulse'
                      : 'bg-yellow-400'
              }`}
            />
            <StatusBadge status={currentJob.status} />
            <span className="text-[11px] text-muted-foreground/50">
              {formatRelativeTime(currentJob.createdAt)}
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isLoadingJobs && jobs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground/40 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando jobs...
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
          <Terminal className="h-6 w-6" />
          <p className="text-sm">No hay jobs todavía</p>
        </div>
      ) : (
        /* Output area */
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 px-3 py-3">
          {/* Label */}
          <div className="shrink-0 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Terminal className="h-3 w-3" />
            Output
          </div>

          <MixedOutput output={output} toolCalls={toolCalls} isStreaming={isStreaming} />
        </div>
      )}
    </div>
  );
}

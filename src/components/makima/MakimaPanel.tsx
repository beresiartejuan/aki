import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
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
  createdAt: number;
  finishedAt: number | null;
  akiVerification: string | null;
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
      icon: Activity,
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color} ${config.border}`}
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
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

function MakimaOutput({ output, isStreaming }: { output: string; isStreaming: boolean }) {
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
  }, [isStreaming, output]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 text-[13px] leading-6 text-foreground/80 bg-[#0d0d0d] rounded-lg border border-border/60"
    >
      {output ? (
        <MarkdownRenderer content={output} streaming={isStreaming} />
      ) : (
        <span className="text-muted-foreground/40 italic">Esperando output...</span>
      )}
      {isStreaming && <span className="inline-block w-2 h-4 bg-orange-400/60 ml-1 animate-pulse" />}
    </div>
  );
}

export default function MakimaPanel({ isOpen, chatId, focusedJobId, onClose }: MakimaPanelProps) {
  const [_jobs, setJobs] = useState<MakimaJob[]>([]);
  const [selectedJobId, _setSelectedJobId] = useState<string | null>(focusedJobId);
  const [_isCollapsed, setIsCollapsed] = useState(false);
  const [_loadingJobs, setLoadingJobs] = useState(true);

  const { output, status, isStreaming, akiVerification, toolCalls } =
    useMakimaStream(selectedJobId);

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
      setLoadingJobs(false);
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    fetchJobs();
    // Refresh jobs list periodically while panel is open
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [chatId, fetchJobs]);

  useEffect(() => {
    if (focusedJobId) {
      _setSelectedJobId(focusedJobId);
    }
  }, [focusedJobId]);

  const hasJobs = _jobs.length > 0;

  if (!chatId) return null;

  return (
    <div
      className={`
        flex flex-col shrink-0 border-l border-border/60 bg-[#0c0c0c]/95 backdrop-blur-sm
        transition-transform duration-300 ease-out
        absolute right-0 top-0 bottom-0 z-40
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        ${isOpen ? (_isCollapsed ? 'w-12' : 'w-[480px]') : 'w-0 overflow-hidden'}
      `}
    >
      {/* Collapse toggle (desktop only) */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!_isCollapsed)}
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 rounded-l-lg bg-[#111] border border-r-0 border-border/60 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {_isCollapsed ? (
          <ChevronLeft className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>

      {_isCollapsed ? (
        <div className="flex-1 flex flex-col items-center py-4 gap-3">
          <Terminal className="h-5 w-5 text-orange-500/60" />
          {hasJobs && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="shrink-0 px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
                <Terminal className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Makima</h3>
                <p className="text-[10px] text-muted-foreground/60">Agente de ejecución</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Job list */}
          <div className="shrink-0 border-b border-border/40">
            <div className="px-4 py-2 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
              Jobs ({_jobs.length})
            </div>
            <div className="max-h-[160px] overflow-y-auto scrollbar-thin">
              {_loadingJobs && _jobs.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground/40">Cargando...</div>
              ) : !hasJobs ? (
                <div className="px-4 py-3 text-xs text-muted-foreground/40">
                  No hay jobs todavía
                </div>
              ) : (
                _jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => _setSelectedJobId(job.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-surface/40 transition-colors border-l-2 ${
                      selectedJobId === job.id
                        ? 'border-orange-500 bg-surface/30'
                        : 'border-transparent'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground/80 truncate leading-tight">
                        {job.prompt.length > 60 ? `${job.prompt.slice(0, 60)}...` : job.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={job.status} />
                        <span className="text-[10px] text-muted-foreground/40">
                          {formatRelativeTime(job.createdAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Selected job detail */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Job metadata */}
            <div className="shrink-0 px-4 py-3 border-b border-border/40">
              <p className="text-[11px] text-foreground/70 mb-2 leading-relaxed">
                Output de Makima
              </p>
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Tool calls section */}
              {toolCalls.length > 0 && (
                <div className="shrink-0 px-4 py-2 border-b border-border/40">
                  <div className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="text-orange-400/70">Tools</span>
                    <span className="text-muted-foreground/30">({toolCalls.length})</span>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto scrollbar-thin space-y-2">
                    {toolCalls.map((tool) => (
                      <div
                        key={tool.id}
                        className="text-[11px] font-mono text-muted-foreground/60 bg-[#0a0a0a] rounded px-2 py-1.5 border border-border/30"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-orange-300/70">{tool.toolName}</span>
                          {tool.result === undefined ? (
                            <Loader2 className="h-3 w-3 text-orange-400/70 animate-spin" />
                          ) : (
                            <span className="text-emerald-400/70 text-[10px]">✓</span>
                          )}
                        </div>
                        <pre className="whitespace-pre-wrap break-all text-[10px]">
                          {JSON.stringify(tool.args, null, 2)}
                        </pre>
                        {tool.result && (
                          <pre className="whitespace-pre-wrap break-all text-[10px] text-emerald-300/60 mt-1 border-t border-border/20 pt-1">
                            {tool.result}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Output */}
              <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 min-h-0">
                <div className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Terminal className="h-3 w-3" />
                  Proceso completo
                </div>
                <MakimaOutput output={output} isStreaming={isStreaming} />
              </div>
            </div>

            {/* Aki verification */}
            {akiVerification && (
              <div className="shrink-0 px-4 py-3 border-t border-border/40 bg-surface/20">
                <div className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  Verificación de Aki
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed">{akiVerification}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

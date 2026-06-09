import { useEffect, useRef, useState } from 'react';

type JobStatus = 'pending' | 'running' | 'done' | 'error';

interface ToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: string;
}

interface MakimaStreamState {
  output: string;
  status: JobStatus;
  isStreaming: boolean;
  akiVerification: string;
  toolCalls: ToolCall[];
}

const initialState: MakimaStreamState = {
  output: '',
  status: 'pending',
  isStreaming: false,
  akiVerification: '',
  toolCalls: [],
};

export function useMakimaStream(jobId: string | null): MakimaStreamState {
  const [state, setState] = useState<MakimaStreamState>(initialState);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) {
      setState(initialState);
      return;
    }

    // Close previous connection
    if (esRef.current) {
      esRef.current.close();
    }

    // Reset for new job
    setState({ ...initialState, isStreaming: true });

    const es = new EventSource(`/api/makima/stream?jobId=${jobId}`);
    esRef.current = es;

    es.addEventListener('chunk', (e) => {
      try {
        const data = JSON.parse(e.data);
        const chunk = data.chunk || '';
        setState((prev) => ({
          ...prev,
          output: prev.output + chunk,
          status: 'running',
          isStreaming: true,
        }));
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('aki_verification', (e) => {
      try {
        const data = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          akiVerification: data.content || '',
        }));
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('tool_start', (e) => {
      try {
        const data = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          toolCalls: [
            ...prev.toolCalls,
            {
              id: `${Date.now()}-${Math.random()}`,
              toolName: data.toolName || 'unknown',
              args: data.args || {},
            },
          ],
        }));
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('tool_end', (e) => {
      try {
        const data = JSON.parse(e.data);
        setState((prev) => {
          const calls = [...prev.toolCalls];
          // Manual polyfill for findLastIndex (ES2023) to keep TS target safe
          let lastPending = -1;
          for (let i = calls.length - 1; i >= 0; i--) {
            if (calls[i].result === undefined) {
              lastPending = i;
              break;
            }
          }
          if (lastPending >= 0) {
            calls[lastPending] = { ...calls[lastPending], result: data.result || '' };
          }
          return { ...prev, toolCalls: calls };
        });
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('done', (e) => {
      try {
        const data = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          status: 'done',
          isStreaming: false,
          akiVerification: data.akiVerification || prev.akiVerification,
        }));
      } catch {
        setState((prev) => ({ ...prev, status: 'done', isStreaming: false }));
      }
      es.close();
    });

    es.addEventListener('error', (e) => {
      try {
        const data = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          status: 'error',
          isStreaming: false,
          output: prev.output
            ? `${prev.output}\n\nError: ${data.message}`
            : `Error: ${data.message}`,
        }));
      } catch {
        setState((prev) => ({ ...prev, status: 'error', isStreaming: false }));
      }
      es.close();
    });

    es.onerror = () => {
      // Connection closed; if status is still running, assume error
      setState((prev) => {
        if (prev.status === 'running' || prev.status === 'pending') {
          return { ...prev, status: 'error', isStreaming: false };
        }
        return prev;
      });
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [jobId]);

  return state;
}

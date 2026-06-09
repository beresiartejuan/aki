import { useEffect, useRef, useState } from 'react';

type JobStatus = 'pending' | 'running' | 'done' | 'error';

interface MakimaStreamState {
  output: string;
  status: JobStatus;
  isStreaming: boolean;
  akiVerification: string;
}

const initialState: MakimaStreamState = {
  output: '',
  status: 'pending',
  isStreaming: false,
  akiVerification: '',
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

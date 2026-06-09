import { useEffect, useState } from 'react';

type JobStatus = 'pending' | 'running' | 'done' | 'error';

export function useMakimaJobStatus(jobId: string | null): JobStatus | null {
  const [status, setStatus] = useState<JobStatus | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      return;
    }

    setStatus('pending');

    const es = new EventSource(`/api/makima/stream?jobId=${jobId}`);

    es.addEventListener('chunk', () => {
      setStatus((prev) => (prev === 'pending' ? 'running' : prev));
    });

    es.addEventListener('done', () => {
      setStatus('done');
      es.close();
    });

    es.addEventListener('error', () => {
      setStatus((prev) => {
        if (prev === 'running' || prev === 'pending') {
          return 'error';
        }
        return prev;
      });
      es.close();
    });

    es.onerror = () => {
      setStatus((prev) => {
        if (prev === 'running' || prev === 'pending') {
          return 'error';
        }
        return prev;
      });
      es.close();
    };

    return () => {
      es.close();
    };
  }, [jobId]);

  return status;
}

import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

interface MakimaChipProps {
  jobId: string;
  status?: 'pending' | 'running' | 'done' | 'error';
  onOpen: (id: string) => void;
}

export default function MakimaChip({ jobId, status = 'pending', onOpen }: MakimaChipProps) {
  const configs = {
    pending: {
      icon: Clock,
      label: 'Makima está por empezar...',
      classes: 'bg-yellow-400/10 border-yellow-400/25 text-yellow-400 hover:bg-yellow-400/20',
      animate: 'animate-pulse',
    },
    running: {
      icon: Loader2,
      label: 'Makima está trabajando...',
      classes: 'bg-orange-400/10 border-orange-400/25 text-orange-400 hover:bg-orange-400/20',
      animate: 'animate-spin',
    },
    done: {
      icon: CheckCircle2,
      label: 'Makima completó la tarea. Ver detalles',
      classes: 'bg-emerald-400/10 border-emerald-400/25 text-emerald-400 hover:bg-emerald-400/20',
      animate: '',
    },
    error: {
      icon: XCircle,
      label: 'Makima falló. Ver detalles',
      classes: 'bg-red-400/10 border-red-400/25 text-red-400 hover:bg-red-400/20',
      animate: '',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(jobId)}
      className={`mt-3 mb-1 inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${config.classes}`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.animate}`} />
      <span className="font-medium text-sm">{config.label}</span>
    </button>
  );
}

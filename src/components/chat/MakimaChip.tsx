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
      dot: 'bg-yellow-400/60',
      animate: 'animate-pulse',
    },
    running: {
      icon: Loader2,
      label: 'Makima está trabajando...',
      dot: 'bg-orange-400/60',
      animate: 'animate-spin',
    },
    done: {
      icon: CheckCircle2,
      label: 'Makima completó la tarea. Ver detalles',
      dot: 'bg-emerald-400/60',
      animate: '',
    },
    error: {
      icon: XCircle,
      label: 'Makima falló. Ver detalles',
      dot: 'bg-red-400/60',
      animate: '',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(jobId)}
      className="mt-3 mb-1 inline-flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/40 bg-surface/40 text-muted-foreground transition-all duration-200 hover:bg-surface/70 hover:text-foreground active:scale-[0.98]"
    >
      <img
        src="/makima_profile_picture (1).png"
        alt="Makima"
        className="h-[18px] w-[18px] rounded-full object-cover border border-border/30"
      />
      <Icon className={`h-3 w-3 ${config.animate}`} />
      <span className="text-xs font-medium">{config.label}</span>
      <span className={`ml-auto h-1.5 w-1.5 rounded-full ${config.dot}`} />
    </button>
  );
}

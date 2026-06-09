import { ArrowUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SendButtonProps {
  isDisabled: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function SendButton({ isDisabled, isLoading, onClick }: SendButtonProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground/40 hidden sm:block">Enter para enviar</span>
      <Button
        size="icon"
        disabled={isDisabled}
        onClick={onClick}
        className={`h-8 w-8 rounded-full transition-all duration-150 ${
          isDisabled
            ? 'opacity-40 cursor-not-allowed bg-primary/50 text-black'
            : 'bg-primary hover:bg-primary/90 text-black hover:scale-105'
        }`}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
      </Button>
    </div>
  );
}

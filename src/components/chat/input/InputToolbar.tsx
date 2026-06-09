import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InputToolbarProps {
  thinkingActive: boolean;
  onToggleThinking: () => void;
  disabled?: boolean;
}

export function InputToolbar({ thinkingActive, onToggleThinking, disabled }: InputToolbarProps) {
  const getButtonClasses = (isActive: boolean) => {
    if (isActive) {
      return 'h-8 w-8 rounded-lg bg-primary/20 text-primary border border-primary/40 ring-1 ring-primary/50 animate-pulse';
    }
    return 'h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-150';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={getButtonClasses(thinkingActive)}
          onClick={onToggleThinking}
          disabled={disabled}
        >
          <Brain className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>Thinking</p>
      </TooltipContent>
    </Tooltip>
  );
}

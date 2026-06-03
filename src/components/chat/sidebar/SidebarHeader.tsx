import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarHeaderProps {
  isCreating: boolean;
  onNewChat: () => void;
}

export function SidebarHeader({ isCreating, onNewChat }: SidebarHeaderProps) {
  return (
    <div className="shrink-0 p-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-black font-bold text-sm">A</span>
          </div>
          <span className="font-semibold text-foreground">Aki</span>
        </div>
      </div>

      <Button
        variant="outline"
        className={`w-full gap-2 border-border text-foreground hover:border-primary hover:text-primary transition-colors duration-150 ${
          isCreating ? 'pointer-events-none opacity-70' : ''
        }`}
        onClick={onNewChat}
        disabled={isCreating}
      >
        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Nuevo chat
      </Button>
    </div>
  );
}

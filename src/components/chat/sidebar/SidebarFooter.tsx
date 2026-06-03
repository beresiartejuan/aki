import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from './types';

interface SidebarFooterProps {
  user: User | null;
  isLoggingOut: boolean;
  onLogout: () => Promise<boolean>;
}

export function SidebarFooter({ user, isLoggingOut, onLogout }: SidebarFooterProps) {
  return (
    <div className="shrink-0 border-t border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{user?.name || 'Usuario'}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.plan || 'Free'} Plan</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onLogout}
          disabled={isLoggingOut}
          title="Cerrar sesión"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}

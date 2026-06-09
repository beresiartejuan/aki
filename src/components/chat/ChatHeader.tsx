import { Download, MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  chatTitle: string;
  projectTag: string | null;
  isDeleting: boolean;
  isRenaming: boolean;
  isExporting: boolean;
  onRename: () => void;
  onExport: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function ChatHeader({
  chatTitle,
  projectTag,
  onRename,
  onExport,
  onShare,
  onDelete,
}: ChatHeaderProps) {
  return (
    <div className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-border shadow-[0_1px_0_0_#222222]">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground">{chatTitle}</h1>
        {projectTag && (
          <Badge
            variant="outline"
            className="bg-primary/15 text-primary border-primary/30 text-xs font-medium rounded-full px-2.5 py-0.5"
          >
            {projectTag}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-150"
        >
          <Share2 className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors duration-150"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>Renombrar chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              <span>Exportar conversación</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>Compartir</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Eliminar chat</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

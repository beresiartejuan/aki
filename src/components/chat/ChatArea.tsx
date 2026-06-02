import { useState, useEffect } from "react";
import { Share2, MoreHorizontal, Pencil, Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

const DEFAULT_CHAT_ID = 'default-chat-id'; // This will be replaced when chat selection is wired up

export default function ChatArea() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatTitle, setChatTitle] = useState("Nueva conversación");
  const [projectTag, setProjectTag] = useState<string | null>(null);

  const handleTopBarAction = (action: string) => {
    console.log('topbar action:', action);
  };

  const handleMessageSent = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Fetch chat details
  useEffect(() => {
    const fetchChatDetails = async () => {
      try {
        const response = await fetch(`/api/chats/${DEFAULT_CHAT_ID}`);
        const data = await response.json();
        
        if (response.ok) {
          setChatTitle(data.title);
          setProjectTag(data.projectTag || null);
        }
      } catch (error) {
        console.error('Error fetching chat details:', error);
      }
    };

    fetchChatDetails();
  }, [refreshKey]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-border shadow-[0_1px_0_0_#222222]">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">
            {chatTitle}
          </h1>
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
          
          {/* Top bar dropdown menu */}
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
              <DropdownMenuItem onClick={() => handleTopBarAction('rename')}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Renombrar chat</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTopBarAction('export')}>
                <Download className="mr-2 h-4 w-4" />
                <span>Exportar conversación</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTopBarAction('share')}>
                <Share2 className="mr-2 h-4 w-4" />
                <span>Compartir</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleTopBarAction('delete')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Eliminar chat</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Message List */}
      <MessageList chatId={DEFAULT_CHAT_ID} refreshKey={refreshKey} />

      {/* Chat Input */}
      <ChatInput chatId={DEFAULT_CHAT_ID} onMessageSent={handleMessageSent} />
    </div>
  );
}

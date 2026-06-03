export interface ChatItem {
  id: string;
  userId: string;
  agentConfigId: string;
  title: string;
  projectTag: string | null;
  isPinned: number;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  plan: string;
}

export interface SidebarProps {
  onSelectChat?: (chatId: string) => void;
  activeChatId?: string;
  onNewChat?: (chatId: string) => void;
}

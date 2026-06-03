import { useState } from 'react';
import ChatArea from './chat/ChatArea';
import Sidebar from './chat/Sidebar';

export default function ChatApp() {
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);

  return (
    <div className="flex h-full w-full">
      <Sidebar
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={setActiveChatId}
      />
      <div className="flex-1 min-w-0">
        <ChatArea chatId={activeChatId} />
      </div>
    </div>
  );
}

import * as React from 'react';
import { useState } from 'react';
import ChatArea from './ChatArea';
import Sidebar from './Sidebar';

export default function ChatApp() {
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);

  return (
    <div className="flex h-full">
      <Sidebar
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={setActiveChatId}
      />
      <div className="flex-1">
        <ChatArea chatId={activeChatId} />
      </div>
    </div>
  );
}

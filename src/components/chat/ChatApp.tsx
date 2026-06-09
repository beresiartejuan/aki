import { useState } from 'react';
import MakimaPanel from '@/components/makima/MakimaPanel';
import ChatArea from './ChatArea';
import Sidebar from './Sidebar';

export default function ChatApp() {
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);
  const [makimaPanelOpen, setMakimaPanelOpen] = useState(false);
  const [focusedMakimaJobId, setFocusedMakimaJobId] = useState<string | null>(null);

  const handleOpenMakimaPanel = (jobId: string) => {
    setFocusedMakimaJobId(jobId);
    setMakimaPanelOpen(true);
  };

  return (
    <div className="flex h-full w-full">
      <Sidebar
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={setActiveChatId}
      />
      <div className="flex-1 min-w-0 flex">
        <div className="flex-1 min-w-0">
          <ChatArea chatId={activeChatId} onOpenMakimaPanel={handleOpenMakimaPanel} />
        </div>
        <MakimaPanel
          isOpen={makimaPanelOpen}
          chatId={activeChatId ?? ''}
          focusedJobId={focusedMakimaJobId}
          onClose={() => setMakimaPanelOpen(false)}
        />
      </div>
    </div>
  );
}

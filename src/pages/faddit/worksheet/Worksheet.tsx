import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import WorksheetTopBar from './WorksheetTopBar';
import WorksheetLeftSidebar from './WorksheetLeftSidebar';
import WorksheetToolbox from './WorksheetToolbox';
import WorksheetContentPanel from './WorksheetContentPanel';
import { CanvasProvider } from './CanvasProvider';

const Worksheet: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className='flex h-screen w-screen flex-col gap-2 overflow-hidden bg-[#f9f9f9] p-2'>
      <WorksheetTopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className='flex min-h-0 min-w-0 flex-1 gap-2'>
        <WorksheetLeftSidebar open={sidebarOpen} />
        <CanvasProvider>
          <WorksheetToolbox />
          <main className='flex min-h-0 min-w-0 flex-1'>
            <WorksheetContentPanel />
          </main>
        </CanvasProvider>
      </div>
    </div>
  );
};

export default Worksheet;

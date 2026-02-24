import React from 'react';
import WorksheetTemplateSidebar from '../worksheet/WorksheetTemplateSidebar';
import WorksheetV2Header from './WorksheetV2Header';
import WorksheetV2GridContent from './WorksheetV2GridContent';

const WorksheetV2: React.FC = () => {
  return (
    <div className='flex h-screen w-screen gap-2 overflow-hidden bg-[#f9f9f9] p-2'>
      <aside className='shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white'>
        <WorksheetTemplateSidebar collapsible />
      </aside>
      <main className='flex min-w-0 flex-1 flex-col gap-2'>
        <WorksheetV2Header />
        <WorksheetV2GridContent />
      </main>
    </div>
  );
};

export default WorksheetV2;

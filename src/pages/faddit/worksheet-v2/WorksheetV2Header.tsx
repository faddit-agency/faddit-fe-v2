import React from 'react';
import { Play } from 'lucide-react';
import { useWorksheetV2Store } from './useWorksheetV2Store';
import { MENU_TABS } from './worksheetV2Constants';
import WorksheetV2ScreenEditor from './WorksheetV2ScreenEditor';

export default function WorksheetV2Header() {
  const activeTab = useWorksheetV2Store((s) => s.activeTab);
  const setActiveTab = useWorksheetV2Store((s) => s.setActiveTab);
  const worksheetTitle = useWorksheetV2Store((s) => s.worksheetTitle);
  const isLoadingWorksheet = useWorksheetV2Store((s) => s.isLoadingWorksheet);
  const worksheetLoadError = useWorksheetV2Store((s) => s.worksheetLoadError);

  return (
    <header className='flex shrink-0 items-center justify-between rounded-lg bg-white px-4 py-2'>
      <div className='flex items-center gap-x-6'>
        <h1 className='text-base font-semibold text-gray-800'>
          {isLoadingWorksheet ? '불러오는 중...' : worksheetTitle}
        </h1>
        {worksheetLoadError ? (
          <span className='rounded bg-red-50 px-2 py-1 text-xs text-red-500'>{worksheetLoadError}</span>
        ) : null}

        <nav className='flex items-center gap-x-1'>
          {MENU_TABS.map((tab) => (
            <button
              key={tab.key}
              type='button'
              onClick={() => setActiveTab(tab.key)}
              className={`cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className='flex items-center gap-x-3'>
        <WorksheetV2ScreenEditor />
        <button
          type='button'
          className='flex cursor-pointer items-center justify-center gap-x-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50'
        >
          <Play size={14} fill='currentColor' />
          Play
        </button>
        <button
          type='button'
          className='flex cursor-pointer items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-gray-600'
        >
          Share
        </button>
      </div>
    </header>
  );
}

import { Play } from 'lucide-react';
import { useWorksheetV2Store } from './useWorksheetV2Store';
import { MENU_TABS } from './worksheetV2Constants';

export default function WorksheetV2Header() {
  const activeTab = useWorksheetV2Store((s) => s.activeTab);
  const setActiveTab = useWorksheetV2Store((s) => s.setActiveTab);
  const worksheetTitle = useWorksheetV2Store((s) => s.worksheetTitle);
  const isLoadingWorksheet = useWorksheetV2Store((s) => s.isLoadingWorksheet);
  const worksheetLoadError = useWorksheetV2Store((s) => s.worksheetLoadError);

  return (
    <header className='flex shrink-0 flex-col p-2 pr-5'>
      <div className='flex items-start justify-between'>
        <div className='min-w-0'>
          <h1 className='truncate text-[18px] leading-[1.15] font-semibold tracking-[-0.02em] text-gray-800'>
            {isLoadingWorksheet ? '불러오는 중...' : worksheetTitle}
          </h1>
          {worksheetLoadError ? (
            <span className='mt-1 inline-flex rounded bg-red-50 px-2 py-1 text-xs text-red-500'>
              {worksheetLoadError}
            </span>
          ) : null}
        </div>
      </div>

      <div className='flex items-end justify-between'>
        <nav className='flex items-center gap-x-6'>
          {MENU_TABS.map((tab) => (
            <button
              key={tab.key}
              type='button'
              onClick={() => setActiveTab(tab.key)}
              className={`cursor-pointer border-b-2 text-[14px] font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-faddit text-faddit'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className='flex items-center gap-x-2'>
          <button
            type='button'
            className='border-faddit inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-violet-50'
          >
            <Play size={13} fill='currentColor' />
            Play
          </button>
          <button
            type='button'
            className='bg-faddit inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90'
          >
            Share
          </button>
        </div>
      </div>
    </header>
  );
}

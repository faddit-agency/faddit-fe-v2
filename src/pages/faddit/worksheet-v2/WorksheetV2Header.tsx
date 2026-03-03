import { CloudCheck, CloudOff, Loader2, Play } from 'lucide-react';
import WorksheetTopBar from '../worksheet/WorksheetTopBar';
import { useWorksheetV2Store } from './useWorksheetV2Store';
import { MENU_TABS } from './worksheetV2Constants';

type WorksheetV2HeaderProps = {
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  saveSuccessAt: number | null;
};

export default function WorksheetV2Header({
  onSave,
  isSaving,
  hasUnsavedChanges,
  saveError,
  saveSuccessAt,
}: WorksheetV2HeaderProps) {
  const activeTab = useWorksheetV2Store((s) => s.activeTab);
  const setActiveTab = useWorksheetV2Store((s) => s.setActiveTab);
  const worksheetTitle = useWorksheetV2Store((s) => s.worksheetTitle);
  const isLoadingWorksheet = useWorksheetV2Store((s) => s.isLoadingWorksheet);
  const worksheetLoadError = useWorksheetV2Store((s) => s.worksheetLoadError);

  const saveStatus = isSaving
    ? {
        label: '드라이브에 저장 중',
        icon: <Loader2 size={15} className='animate-spin text-gray-400' />,
        className: 'text-gray-500',
      }
    : saveError
      ? {
          label: '드라이브 저장 실패',
          icon: <CloudOff size={15} className='text-rose-500' />,
          className: 'text-rose-500',
        }
      : hasUnsavedChanges
        ? {
            label: '저장되지 않음',
            icon: <CloudOff size={15} className='text-amber-500' />,
            className: 'text-amber-600',
          }
        : {
            label: '드라이브에 저장됨',
            icon: <CloudCheck size={15} className='text-gray-400' />,
            className: 'text-gray-500',
          };

  const savedAtLabel = saveSuccessAt ? new Date(saveSuccessAt).toLocaleTimeString('ko-KR') : null;

  return (
    <header className='flex shrink-0 flex-col'>
      <div className='flex items-start justify-between'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <h1 className='truncate text-[18px] leading-[1.15] font-semibold tracking-[-0.02em] text-gray-800'>
              {isLoadingWorksheet ? '불러오는 중...' : worksheetTitle}
            </h1>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-medium ${saveStatus.className}`}
              title={savedAtLabel && !isSaving && !hasUnsavedChanges ? `마지막 저장 ${savedAtLabel}` : undefined}
            >
              {saveStatus.icon}
              {saveStatus.label}
            </span>
          </div>
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
            className='border-faddit inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-violet-50'
          >
            <Play size={14} fill='currentColor' className='shrink-0 translate-y-[0.5px]' />
            Play
          </button>
          <button
            type='button'
            className='bg-faddit inline-flex h-9 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90'
          >
            Share
          </button>
          <WorksheetTopBar onSave={onSave} isSaving={isSaving} hasUnsavedChanges={hasUnsavedChanges} inline />
        </div>
      </div>
    </header>
  );
}

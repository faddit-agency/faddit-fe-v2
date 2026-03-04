import React, { useEffect, useRef, useState } from 'react';
import { Check, CloudCheck, CloudOff, Loader2, Pencil, Play } from 'lucide-react';
import WorksheetTopBar from './WorksheetTopBar';
import { useWorksheetStore } from './useWorksheetStore';
import { MENU_TABS } from './worksheetConstants';

type WorksheetHeaderProps = {
  onSave: () => void;
  onRenameTitle: (nextTitle: string) => Promise<boolean>;
  canRenameTitle: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  saveSuccessAt: number | null;
};

export default function WorksheetHeader({
  onSave,
  onRenameTitle,
  canRenameTitle,
  isSaving,
  hasUnsavedChanges,
  saveError,
  saveSuccessAt,
}: WorksheetHeaderProps) {
  const activeTab = useWorksheetStore((s) => s.activeTab);
  const setActiveTab = useWorksheetStore((s) => s.setActiveTab);
  const worksheetTitle = useWorksheetStore((s) => s.worksheetTitle);
  const isLoadingWorksheet = useWorksheetStore((s) => s.isLoadingWorksheet);
  const worksheetLoadError = useWorksheetStore((s) => s.worksheetLoadError);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(worksheetTitle);
  const [isTitleSaving, setIsTitleSaving] = useState(false);
  const [titleSaveError, setTitleSaveError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isTitleEditing) {
      setTitleDraft(worksheetTitle);
    }
  }, [worksheetTitle, isTitleEditing]);

  useEffect(() => {
    if (!isTitleEditing) {
      return;
    }

    const input = titleInputRef.current;
    if (!input) {
      return;
    }

    input.focus();
    input.select();
  }, [isTitleEditing]);

  const beginTitleEdit = () => {
    if (!canRenameTitle || isLoadingWorksheet || isTitleSaving) {
      return;
    }

    setTitleSaveError(null);
    setTitleDraft(worksheetTitle);
    setIsTitleEditing(true);
  };

  const cancelTitleEdit = () => {
    setIsTitleEditing(false);
    setTitleDraft(worksheetTitle);
    setTitleSaveError(null);
  };

  const commitTitleEdit = async () => {
    if (isTitleSaving) {
      return;
    }

    const normalizedTitle = titleDraft.trim();
    if (!normalizedTitle) {
      setTitleSaveError('제목을 입력해 주세요.');
      return;
    }

    if (normalizedTitle === worksheetTitle) {
      setIsTitleEditing(false);
      setTitleSaveError(null);
      return;
    }

    setIsTitleSaving(true);
    setTitleSaveError(null);
    const renamed = await onRenameTitle(normalizedTitle);
    setIsTitleSaving(false);

    if (!renamed) {
      setTitleSaveError('제목 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setIsTitleEditing(false);
    setTitleSaveError(null);
  };

  const handleTitleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commitTitleEdit();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelTitleEdit();
    }
  };

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
            <div className='group flex min-w-0 items-center'>
              {isTitleEditing ? (
                <div className='flex min-w-0 items-center gap-2'>
                  <input
                    ref={titleInputRef}
                    type='text'
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onKeyDown={handleTitleInputKeyDown}
                    maxLength={80}
                    disabled={isTitleSaving}
                    className='form-input h-8 w-[220px] max-w-[40vw] text-sm'
                  />
                  <button
                    type='button'
                    onClick={() => {
                      void commitTitleEdit();
                    }}
                    aria-label='작업지시서 제목 수정 완료'
                    title='작업지시서 제목 수정 완료'
                    disabled={isTitleSaving}
                    className='inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {isTitleSaving ? (
                      <Loader2 size={14} className='shrink-0 animate-spin' />
                    ) : (
                      <Check size={14} className='shrink-0' />
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <h1 className='truncate text-[18px] leading-[1.15] font-semibold tracking-[-0.02em] text-gray-800'>
                    {isLoadingWorksheet ? '불러오는 중...' : worksheetTitle}
                  </h1>
                  {canRenameTitle ? (
                    <button
                      type='button'
                      onClick={beginTitleEdit}
                      aria-label='작업지시서 제목 수정'
                      title='작업지시서 제목 수정'
                      className='pointer-events-none ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 opacity-0 shadow-sm -translate-x-1 transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
                    >
                      <Pencil size={13} className='shrink-0' />
                    </button>
                  ) : null}
                </>
              )}
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-medium ${saveStatus.className}`}
              title={savedAtLabel && !isSaving && !hasUnsavedChanges ? `마지막 저장 ${savedAtLabel}` : undefined}
            >
              {saveStatus.icon}
              {saveStatus.label}
            </span>
          </div>
          {worksheetLoadError || titleSaveError ? (
            <div className='mt-1 flex flex-col gap-1'>
              {worksheetLoadError ? (
                <span className='inline-flex rounded bg-red-50 px-2 py-1 text-xs text-red-500'>
                  {worksheetLoadError}
                </span>
              ) : null}
              {titleSaveError ? (
                <span className='inline-flex rounded bg-red-50 px-2 py-1 text-xs text-red-500'>
                  {titleSaveError}
                </span>
              ) : null}
            </div>
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

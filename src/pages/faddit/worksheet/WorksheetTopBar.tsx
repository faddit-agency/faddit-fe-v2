import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Loader2, Redo2, Save, Undo2 } from 'lucide-react';

const ICON_BUTTON_CLASS =
  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-all duration-300 hover:bg-gray-100 hover:text-gray-800';

interface WorksheetTopBarProps {
  onExit?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
}

export default function WorksheetTopBar({
  onExit,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
}: WorksheetTopBarProps) {
  const MIN_SPIN_MS = 1000;
  const SAVED_BADGE_MS = 900;
  const [visualState, setVisualState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveButtonWidth, setSaveButtonWidth] = useState<number>(0);
  const saveStartRef = useRef<number>(0);
  const saveContentRef = useRef<HTMLSpanElement | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
      }
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isSaving) {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      saveStartRef.current = Date.now();
      setVisualState('saving');
      return;
    }

    if (visualState !== 'saving') {
      return;
    }

    const elapsed = Date.now() - saveStartRef.current;
    const remaining = Math.max(0, MIN_SPIN_MS - elapsed);

    finishTimerRef.current = window.setTimeout(() => {
      setVisualState('saved');
      resetTimerRef.current = window.setTimeout(() => {
        setVisualState('idle');
      }, SAVED_BADGE_MS);
    }, remaining);

    return () => {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };
  }, [isSaving, visualState]);

  const saveLabel =
    visualState === 'saving'
      ? 'Saving...'
      : visualState === 'saved'
        ? 'Saved'
        : hasUnsavedChanges
          ? 'Save*'
          : 'Save';

  const isSaveDisabled = !onSave || visualState === 'saving';

  useLayoutEffect(() => {
    if (!saveContentRef.current) return;
    const contentWidth = Math.ceil(saveContentRef.current.getBoundingClientRect().width);
    const horizontalPadding = 22;
    setSaveButtonWidth(contentWidth + horizontalPadding);
  }, [saveLabel, visualState]);

  return (
    <header className='flex h-14 items-center justify-between rounded-xl bg-white px-3'>
      <div className='flex h-full items-center gap-x-1'>
        <button type='button' className={ICON_BUTTON_CLASS} aria-label='실행 취소'>
          <Undo2 size={18} />
        </button>
        <button type='button' className={ICON_BUTTON_CLASS} aria-label='다시 실행'>
          <Redo2 size={18} />
        </button>
      </div>
      <div className='flex h-full items-center gap-x-3'>
        <button
          type='button'
          onClick={onExit}
          className='flex h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-all duration-300 ease-out hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900'
        >
          <ArrowLeft size={14} />
          나가기
        </button>

        <button
          type='button'
          onClick={onSave}
          disabled={isSaveDisabled}
          className={`relative flex h-9 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-lg px-4 text-sm font-medium text-white transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${
            visualState === 'saving'
              ? 'bg-zinc-700'
              : visualState === 'saved'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : hasUnsavedChanges
                ? 'bg-zinc-900 hover:bg-zinc-700'
                : 'bg-zinc-800 hover:bg-zinc-700'
          }`}
          style={{ width: saveButtonWidth > 0 ? `${saveButtonWidth}px` : undefined }}
        >
          <span
            className={`absolute inset-x-0 bottom-0 h-[2px] transition-opacity duration-300 ease-out ${
              visualState === 'saving' || visualState === 'saved' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span
              className={`block h-full bg-white/70 transition-[width,opacity] duration-300 ease-out ${
                visualState === 'saving'
                  ? 'w-full opacity-100'
                  : visualState === 'saved'
                    ? 'w-full opacity-100'
                    : 'w-0 opacity-0'
              }`}
            />
          </span>

          <span ref={saveContentRef} className='relative z-10 flex items-center gap-1'>
            {visualState === 'saving' ? (
              <Loader2 size={14} className='animate-spin' />
            ) : visualState === 'saved' ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            <span className='whitespace-nowrap text-left transition-all duration-300 ease-out'>
              {saveLabel}
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}

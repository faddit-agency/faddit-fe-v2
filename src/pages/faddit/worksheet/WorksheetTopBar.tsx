import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Loader2, Save } from 'lucide-react';

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
  const saveStartRef = useRef<number>(0);
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

  return (
    <div className='pointer-events-none absolute top-6 right-11 z-[180] flex items-center gap-x-2'>
      <button
        type='button'
        onClick={onExit}
        className='pointer-events-auto inline-flex h-10 w-[116px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-violet-50'
      >
        <ArrowLeft size={14} />
        나가기
      </button>

      <button
        type='button'
        onClick={onSave}
        disabled={isSaveDisabled}
        className={`pointer-events-auto relative inline-flex h-10 w-[116px] cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          visualState === 'saving' ? 'bg-zinc-700' : 'bg-zinc-900 hover:bg-zinc-700'
        }`}
      >
        <span className='relative z-10 flex items-center gap-1.5'>
          {visualState === 'saving' ? (
            <Loader2 size={14} className='animate-spin' />
          ) : visualState === 'saved' ? (
            <Check size={14} />
          ) : (
            <Save size={14} />
          )}
          <span className='text-left whitespace-nowrap'>{saveLabel}</span>
        </span>
      </button>
    </div>
  );
}

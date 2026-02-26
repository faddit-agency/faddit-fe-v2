import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const [saveButtonWidth, setSaveButtonWidth] = useState<number>(0);
  const [shareBaseWidth, setShareBaseWidth] = useState<number>(0);
  const saveStartRef = useRef<number>(0);
  const finishTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const shareMeasureRef = useRef<HTMLSpanElement | null>(null);
  const saveMeasureRef = useRef<HTMLSpanElement | null>(null);

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

  const showStatusIcon = visualState !== 'idle';

  useLayoutEffect(() => {
    if (!shareMeasureRef.current) return;
    const baseLabelWidth = Math.ceil(shareMeasureRef.current.getBoundingClientRect().width);
    const horizontalPadding = 32;
    setShareBaseWidth(baseLabelWidth + horizontalPadding);
  }, []);

  useLayoutEffect(() => {
    if (!saveMeasureRef.current) return;
    const contentWidth = Math.ceil(saveMeasureRef.current.getBoundingClientRect().width);
    const horizontalPadding = 32;
    const minWidth = shareBaseWidth > 0 ? shareBaseWidth : 0;
    setSaveButtonWidth(Math.max(minWidth, contentWidth + horizontalPadding));
  }, [saveLabel, showStatusIcon, shareBaseWidth]);

  const isSaveDisabled = !onSave || visualState === 'saving';

  return (
    <div className='pointer-events-none absolute top-11 right-6 z-[180] flex items-center gap-x-2'>
      <button
        type='button'
        onClick={onExit}
        className='pointer-events-auto inline-flex h-9 w-[116px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-violet-50'
      >
        <ArrowLeft size={14} />
        나가기
      </button>

      <button
        type='button'
        onClick={onSave}
        disabled={isSaveDisabled}
        className={`pointer-events-auto relative inline-flex h-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg px-4 text-sm font-semibold text-white transition-[width,background-color,box-shadow,transform] duration-250 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${
          visualState === 'saving'
            ? 'bg-zinc-700 shadow-[0_0_0_2px_rgba(113,113,122,0.28)]'
            : visualState === 'saved'
              ? 'bg-emerald-600 shadow-[0_0_0_2px_rgba(16,185,129,0.28)]'
              : 'bg-zinc-900 hover:bg-zinc-700'
        }`}
        style={saveButtonWidth > 0 ? { width: `${saveButtonWidth}px` } : undefined}
      >
        <span
          className={`absolute inset-x-0 bottom-0 h-[2px] bg-white/75 transition-[width,opacity] duration-300 ease-out ${
            visualState === 'saving'
              ? 'w-full opacity-100'
              : visualState === 'saved'
                ? 'w-full opacity-35'
                : 'w-0 opacity-0'
          }`}
        />
        <span className='relative z-10 flex items-center gap-1.5'>
          {visualState === 'saving' ? (
            <Loader2 size={14} className='animate-spin' />
          ) : visualState === 'saved' ? (
            <Check size={14} className='scale-100 transition-transform duration-200 ease-out' />
          ) : showStatusIcon ? (
            <Save size={14} />
          ) : null}
          <span className='text-left whitespace-nowrap transition-all duration-200 ease-out'>{saveLabel}</span>
        </span>
      </button>

      <div className='pointer-events-none absolute -z-10 opacity-0'>
        <span ref={shareMeasureRef} className='text-sm font-semibold'>
          Share
        </span>
        <span ref={saveMeasureRef} className='inline-flex items-center gap-1.5 text-sm font-semibold'>
          {showStatusIcon ? <span className='h-[14px] w-[14px]' /> : null}
          <span className='whitespace-nowrap'>{saveLabel}</span>
        </span>
      </div>
    </div>
  );
}

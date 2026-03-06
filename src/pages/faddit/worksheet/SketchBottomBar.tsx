import React, { useRef } from 'react';
import {
  Grid3X3,
  ImageUp,
  MousePointer2,
  Redo2,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { useCanvas } from './CanvasProvider';

interface ToolButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolButton({ active, onClick, title, children, disabled }: ToolButtonProps) {
  return (
    <div className='group relative'>
      <button
        type='button'
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={title}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          active
            ? 'bg-gray-800 text-white dark:bg-violet-600'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
        }`}
      >
        {children}
      </button>
      {!disabled && (
        <div className='pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-[11px] whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100'>
          {title}
        </div>
      )}
    </div>
  );
}

interface SketchBottomBarProps {
  onZoomReset: () => void;
}

export default function SketchBottomBar({ onZoomReset }: SketchBottomBarProps) {
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    fillColor,
    strokeWidth,
    setStrokeWidth,
    cornerRadius,
    setCornerRadius,
    selectedType,
    showGrid,
    toggleGrid,
    canUndo,
    canRedo,
    undo,
    redo,
    uploadToCanvas,
  } = useCanvas();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isShapeSelection = ['rect', 'ellipse', 'triangle', 'line', 'path'].includes(
    selectedType ?? '',
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadToCanvas(file);
      e.target.value = '';
    }
  };

  const openColorPanel = (target: 'fill' | 'stroke') => {
    if (typeof window === 'undefined') {
      return;
    }
    window.dispatchEvent(
      new CustomEvent('faddit:open-side-panel', {
        detail: {
          panel: 'color',
          target,
        },
      }),
    );
  };

  return (
    <div className='pointer-events-none absolute inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2'>
      {isShapeSelection && (
        <div className='pointer-events-auto flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 ring-1 shadow-lg ring-gray-200 dark:bg-gray-900 dark:ring-gray-700'>
          <div className='flex items-center gap-1.5'>
            <span className='text-[11px] text-gray-500 dark:text-gray-400'>선 굵기</span>
            <input
              type='range'
              min={1}
              max={50}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className='h-1.5 w-24 cursor-pointer accent-gray-800 dark:accent-violet-400'
            />
            <span className='w-8 text-right font-mono text-[11px] text-gray-700 dark:text-gray-200'>
              {strokeWidth}px
            </span>
          </div>
          <div className='h-5 w-px bg-gray-200 dark:bg-gray-700' />
          <div className='flex items-center gap-1.5'>
            <span className='text-[11px] text-gray-500 dark:text-gray-400'>둥글기</span>
            <input
              type='range'
              min={0}
              max={40}
              value={cornerRadius}
              onChange={(e) => setCornerRadius(Number(e.target.value))}
              className='h-1.5 w-24 cursor-pointer accent-gray-800 dark:accent-violet-400'
            />
            <span className='w-7 text-right font-mono text-[11px] text-gray-700 dark:text-gray-200'>
              {cornerRadius}
            </span>
          </div>
        </div>
      )}

      <div className='pointer-events-auto relative flex items-center gap-1 rounded-xl bg-white px-2 py-1.5 ring-1 shadow-lg ring-gray-200 dark:bg-gray-900 dark:ring-gray-700'>
        <ToolButton
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
          title='선택 (V)'
        >
          <MousePointer2 size={16} strokeWidth={1.5} />
        </ToolButton>

        <div className='mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700' />

        <ToolButton onClick={undo} disabled={!canUndo} title='실행 취소 (Cmd/Ctrl+Z)'>
          <Undo2 size={16} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={redo} disabled={!canRedo} title='다시 실행 (Cmd/Ctrl+Y)'>
          <Redo2 size={16} strokeWidth={1.5} />
        </ToolButton>

        <div className='mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700' />

        <div className='flex h-8 items-center gap-0.5 rounded-md px-1 text-gray-600 dark:text-gray-300'>
          <ToolButton onClick={() => openColorPanel('fill')} title='채우기 색상 열기'>
            <span
              className='block h-4 w-4 rounded border border-gray-300 dark:border-gray-600'
              style={{ background: fillColor }}
            />
          </ToolButton>
          <ToolButton onClick={() => openColorPanel('stroke')} title='선 색상 열기'>
            <span
              className='block h-4 w-4 rounded border-2'
              style={{ borderColor: strokeColor, background: 'transparent' }}
            />
          </ToolButton>
        </div>

        <div className='mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700' />

        <ToolButton onClick={() => fileInputRef.current?.click()} title='이미지 업로드'>
          <ImageUp size={16} strokeWidth={1.5} />
        </ToolButton>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*,.svg'
          className='hidden'
          onChange={handleFileUpload}
        />

        <ToolButton active={showGrid} onClick={toggleGrid} title='그리드 토글'>
          <Grid3X3 size={16} strokeWidth={1.5} />
        </ToolButton>

        <div className='mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700' />

        <ToolButton onClick={onZoomReset} title='줌 리셋 (100%)'>
          <RefreshCw size={16} strokeWidth={1.5} />
        </ToolButton>
      </div>
    </div>
  );
}

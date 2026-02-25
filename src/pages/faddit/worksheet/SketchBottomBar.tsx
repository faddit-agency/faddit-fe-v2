import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Circle,
  Copy,
  Grid3X3,
  Group,
  ImageUp,
  Minus,
  MousePointer2,
  Paintbrush,
  PenTool,
  Redo2,
  RefreshCw,
  Square,
  Triangle,
  Type,
  Undo2,
  Ungroup,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCanvas, type ToolType } from './CanvasProvider';
import SketchColorPicker from './SketchColorPicker';

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
  '나눔고딕',
  '맑은 고딕',
];

type ShapeTool = Extract<ToolType, 'rect' | 'ellipse' | 'triangle' | 'line' | 'arrow'>;

const SHAPE_OPTIONS: { tool: ShapeTool; label: string; icon: React.ReactNode }[] = [
  { tool: 'rect', label: 'Rectangle', icon: <Square size={14} strokeWidth={1.5} /> },
  { tool: 'line', label: 'Line', icon: <Minus size={14} strokeWidth={1.5} /> },
  { tool: 'arrow', label: 'Arrow', icon: <ArrowRight size={14} strokeWidth={1.5} /> },
  { tool: 'ellipse', label: 'Ellipse', icon: <Circle size={14} strokeWidth={1.5} /> },
  { tool: 'triangle', label: 'Triangle', icon: <Triangle size={14} strokeWidth={1.5} /> },
];

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
          active ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
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
  zoom: number;
  onZoomChange: (z: number) => void;
}

export default function SketchBottomBar({ zoom, onZoomChange }: SketchBottomBarProps) {
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    fontWeight,
    setFontWeight,
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
    activeLayerId,
    moveLayerUp,
    moveLayerDown,
    groupSelected,
    ungroupSelected,
    duplicateSelected,
  } = useCanvas();

  const [shapePopupOpen, setShapePopupOpen] = useState(false);
  const [colorPopupOpen, setColorPopupOpen] = useState(false);
  const [colorTab, setColorTab] = useState<'fill' | 'stroke'>('fill');

  const shapePopupRef = useRef<HTMLDivElement>(null);
  const colorPopupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shapePopupRef.current && !shapePopupRef.current.contains(e.target as Node)) {
        setShapePopupOpen(false);
      }
      if (colorPopupRef.current && !colorPopupRef.current.contains(e.target as Node)) {
        setColorPopupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isShapeTool = ['rect', 'ellipse', 'triangle', 'line', 'arrow'].includes(activeTool);
  const isShapeSelection = ['rect', 'ellipse', 'triangle', 'line', 'path'].includes(
    selectedType ?? '',
  );

  const currentShapeOption = SHAPE_OPTIONS.find((o) => o.tool === activeTool) ?? SHAPE_OPTIONS[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadToCanvas(file);
      e.target.value = '';
    }
  };

  return (
    <div className='pointer-events-none absolute inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2'>
      {selectedType === 'i-text' && (
        <div className='pointer-events-auto flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 ring-1 shadow-lg ring-gray-200'>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className='h-7 cursor-pointer rounded-md border border-gray-200 px-1.5 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-gray-400'
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <div className='h-5 w-px bg-gray-200' />
          <button
            type='button'
            onClick={() => setFontSize(Math.max(8, fontSize - 2))}
            className='flex h-6 w-6 cursor-pointer items-center justify-center rounded text-gray-600 hover:bg-gray-100'
          >
            −
          </button>
          <input
            type='number'
            value={fontSize}
            min={8}
            max={200}
            onChange={(e) => setFontSize(Math.max(8, Math.min(200, Number(e.target.value))))}
            className='h-7 w-12 rounded-md border border-gray-200 text-center text-xs text-gray-700 outline-none focus:ring-1 focus:ring-gray-400'
          />
          <button
            type='button'
            onClick={() => setFontSize(Math.min(200, fontSize + 2))}
            className='flex h-6 w-6 cursor-pointer items-center justify-center rounded text-gray-600 hover:bg-gray-100'
          >
            +
          </button>
          <div className='h-5 w-px bg-gray-200' />
          <button
            type='button'
            onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
            className={`flex h-7 min-w-7 cursor-pointer items-center justify-center rounded px-1 text-xs font-bold transition-colors ${
              fontWeight === 'bold' ? 'bg-gray-800 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
            title='굵게'
          >
            B
          </button>
        </div>
      )}

      {isShapeSelection && (
        <div className='pointer-events-auto flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 ring-1 shadow-lg ring-gray-200'>
          <div className='flex items-center gap-1.5'>
            <span className='text-[11px] text-gray-500'>선 굵기</span>
            <input
              type='range'
              min={1}
              max={50}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className='h-1.5 w-24 cursor-pointer accent-gray-800'
            />
            <span className='w-8 text-right font-mono text-[11px] text-gray-700'>
              {strokeWidth}px
            </span>
          </div>
          <div className='h-5 w-px bg-gray-200' />
          <div className='flex items-center gap-1.5'>
            <span className='text-[11px] text-gray-500'>둥글기</span>
            <input
              type='range'
              min={0}
              max={40}
              value={cornerRadius}
              onChange={(e) => setCornerRadius(Number(e.target.value))}
              className='h-1.5 w-24 cursor-pointer accent-gray-800'
            />
            <span className='w-7 text-right font-mono text-[11px] text-gray-700'>
              {cornerRadius}
            </span>
          </div>
        </div>
      )}

      <div className='pointer-events-auto relative flex items-center gap-1 rounded-xl bg-white px-2 py-1.5 ring-1 shadow-lg ring-gray-200'>
        <ToolButton
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
          title='선택 (V)'
        >
          <MousePointer2 size={16} strokeWidth={1.5} />
        </ToolButton>

        <div className='mx-1 h-5 w-px bg-gray-200' />

        <ToolButton onClick={undo} disabled={!canUndo} title='실행 취소 (Cmd/Ctrl+Z)'>
          <Undo2 size={16} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={redo} disabled={!canRedo} title='다시 실행 (Cmd/Ctrl+Y)'>
          <Redo2 size={16} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={duplicateSelected} title='복제'>
          <Copy size={16} strokeWidth={1.5} />
        </ToolButton>

        <div className='mx-1 h-5 w-px bg-gray-200' />

        <ToolButton onClick={groupSelected} title='그룹화 (Cmd/Ctrl+G)'>
          <Group size={16} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={ungroupSelected} title='그룹 해제 (Cmd/Ctrl+Alt+G)'>
          <Ungroup size={16} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton
          onClick={() => {
            if (activeLayerId) moveLayerUp(activeLayerId);
          }}
          title='앞으로'
          disabled={!activeLayerId}
        >
          <ArrowUp size={16} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton
          onClick={() => {
            if (activeLayerId) moveLayerDown(activeLayerId);
          }}
          title='뒤로'
          disabled={!activeLayerId}
        >
          <ArrowDown size={16} strokeWidth={1.5} />
        </ToolButton>

        <div className='mx-1 h-5 w-px bg-gray-200' />

        <ToolButton
          active={activeTool === 'draw'}
          onClick={() => setActiveTool('draw')}
          title='브러쉬 (B)'
        >
          <Paintbrush size={16} strokeWidth={1.5} />
        </ToolButton>

        <ToolButton
          active={activeTool === 'pen'}
          onClick={() => setActiveTool('pen')}
          title='펜 (P)'
        >
          <PenTool size={16} strokeWidth={1.5} />
        </ToolButton>

        <ToolButton
          active={activeTool === 'text'}
          onClick={() => setActiveTool('text')}
          title='텍스트 (T)'
        >
          <Type size={16} strokeWidth={1.5} />
        </ToolButton>

        <div ref={shapePopupRef} className='relative'>
          <ToolButton
            active={isShapeTool}
            onClick={() => setShapePopupOpen((v) => !v)}
            title='도형'
          >
            {isShapeTool ? currentShapeOption.icon : <Square size={16} strokeWidth={1.5} />}
          </ToolButton>

          {shapePopupOpen && (
            <div className='absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 rounded-xl bg-white p-3 ring-1 shadow-lg ring-gray-200'>
              <div className='mb-3 flex flex-col gap-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-[11px] font-medium text-gray-500'>선 굵기</span>
                  <span className='font-mono text-[11px] text-gray-700'>{strokeWidth}px</span>
                </div>
                <input
                  type='range'
                  min={1}
                  max={50}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className='h-1.5 w-full cursor-pointer accent-gray-800'
                />
              </div>

              <div className='flex flex-col gap-0.5'>
                {SHAPE_OPTIONS.map(({ tool, label, icon }) => (
                  <button
                    key={tool}
                    type='button'
                    onClick={() => {
                      setActiveTool(tool);
                      setShapePopupOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                      activeTool === tool
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={colorPopupRef} className='relative'>
          <button
            type='button'
            onClick={() => setColorPopupOpen((v) => !v)}
            title='색상'
            className='flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-gray-600 transition-colors hover:bg-gray-100'
          >
            <div
              className='h-4 w-4 rounded border border-gray-300'
              style={{ background: fillColor }}
              title='채우기 색상'
            />
            <div
              className='h-4 w-4 rounded border-2'
              style={{ borderColor: strokeColor, background: 'transparent' }}
              title='선 색상'
            />
          </button>

          {colorPopupOpen && (
            <div className='absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-xl bg-white ring-1 shadow-lg ring-gray-200'>
              <div className='flex border-b border-gray-100'>
                <button
                  type='button'
                  onClick={() => setColorTab('fill')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    colorTab === 'fill'
                      ? 'border-b-2 border-gray-800 text-gray-800'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  채우기
                </button>
                <button
                  type='button'
                  onClick={() => setColorTab('stroke')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    colorTab === 'stroke'
                      ? 'border-b-2 border-gray-800 text-gray-800'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  선
                </button>
              </div>
              {colorTab === 'fill' ? (
                <SketchColorPicker color={fillColor} onChange={setFillColor} label='채우기 색상' />
              ) : (
                <SketchColorPicker color={strokeColor} onChange={setStrokeColor} label='선 색상' />
              )}
            </div>
          )}
        </div>

        <div className='mx-1 h-5 w-px bg-gray-200' />

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

        <div className='mx-1 h-5 w-px bg-gray-200' />

        <ToolButton onClick={() => onZoomChange(Math.min(zoom + 10, 300))} title='확대'>
          <ZoomIn size={16} strokeWidth={1.5} />
        </ToolButton>
        <button
          type='button'
          className='min-w-[3rem] rounded-md px-1 py-1 text-center font-mono text-xs text-gray-700 hover:bg-gray-100'
          onClick={() => onZoomChange(100)}
          title='줌 리셋'
        >
          {zoom}%
        </button>
        <ToolButton onClick={() => onZoomChange(Math.max(zoom - 10, 10))} title='축소'>
          <ZoomOut size={16} strokeWidth={1.5} />
        </ToolButton>

        <div className='mx-1 h-5 w-px bg-gray-200' />

        <ToolButton onClick={() => onZoomChange(100)} title='뷰 리셋'>
          <RefreshCw size={16} strokeWidth={1.5} />
        </ToolButton>
      </div>
    </div>
  );
}

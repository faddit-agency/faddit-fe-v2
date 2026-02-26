import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Check,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Lock,
  Minus,
  Paintbrush,
  PenTool,
  Pencil,
  Scissors,
  Square,
  Trash2,
  Triangle,
  Type,
  Ungroup,
  Unlock,
  Wrench,
} from 'lucide-react';
import { useCanvas, type AlignType, type ToolType } from './CanvasProvider';
import type { PathfinderOp } from './pathfinder';

const CONTENT_PANEL_WIDTH = 224;
const GAP_X = 12;

const TOOL_ITEMS = [
  { key: 'template', label: '템플릿', icon: LayoutGrid },
  { key: 'brush', label: '브러쉬', icon: Paintbrush },
  { key: 'sewing', label: '봉제', icon: Scissors },
  { key: 'text', label: '텍스트', icon: Type },
  { key: 'tools', label: '도구', icon: Wrench },
  { key: 'layer', label: '레이어', icon: Layers },
];

const ALIGN_BUTTONS: { type: AlignType; icon: React.ReactNode; title: string }[] = [
  { type: 'left', icon: <AlignStartVertical size={14} strokeWidth={1.5} />, title: '왼쪽 정렬' },
  {
    type: 'centerH',
    icon: <AlignCenterVertical size={14} strokeWidth={1.5} />,
    title: '수평 중앙 정렬',
  },
  { type: 'right', icon: <AlignEndVertical size={14} strokeWidth={1.5} />, title: '오른쪽 정렬' },
  { type: 'top', icon: <AlignStartHorizontal size={14} strokeWidth={1.5} />, title: '위 정렬' },
  {
    type: 'centerV',
    icon: <AlignCenterHorizontal size={14} strokeWidth={1.5} />,
    title: '수직 중앙 정렬',
  },
  { type: 'bottom', icon: <AlignEndHorizontal size={14} strokeWidth={1.5} />, title: '아래 정렬' },
];
const PATHFINDER_BUTTONS: { op: PathfinderOp; title: string }[] = [
  { op: 'unite', title: '합치기' },
  { op: 'minusFront', title: '앞면 제외' },
  { op: 'intersect', title: '교차 영역' },
  { op: 'exclude', title: '교차 영역 제외' },
  { op: 'divide', title: '나누기' },
  { op: 'trim', title: '동색 오브젝트 분리' },
  { op: 'merge', title: '병합' },
  { op: 'crop', title: '자르기' },
  { op: 'outline', title: '윤곽선' },
  { op: 'minusBack', title: '이면 오브젝트 제외' },
];

function PathfinderGlyph({ op }: { op: PathfinderOp }) {
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const glyphClass = 'h-[20px] w-[20px] text-current';
  const back = { x: 2.5, y: 2.5, w: 7, h: 7 };
  const front = { x: 6.5, y: 6.5, w: 7, h: 7 };
  const overlap = { x: 6.5, y: 6.5, w: 3, h: 3 };

  if (op === 'unite') {
    return (
      <svg viewBox='0 0 16 16' className={glyphClass}>
        <rect x={back.x} y={back.y} width={back.w} height={back.h} rx='0.8' fill='currentColor' opacity='0.58' />
        <rect x={front.x} y={front.y} width={front.w} height={front.h} rx='0.8' fill='currentColor' opacity='0.98' />
      </svg>
    );
  }

  if (op === 'minusFront') {
    return (
      <svg viewBox='0 0 16 16' className={glyphClass}>
        <rect x={back.x} y={back.y} width={back.w} height={back.h} rx='0.8' fill='currentColor' opacity='0.98' />
        <rect x={front.x} y={front.y} width={front.w} height={front.h} rx='0.8' {...stroke} />
        <rect x={overlap.x} y={overlap.y} width={overlap.w} height={overlap.h} fill='white' />
      </svg>
    );
  }

  if (op === 'intersect') {
    return (
      <svg viewBox='0 0 16 16' className={glyphClass}>
        <rect x={back.x} y={back.y} width={back.w} height={back.h} rx='0.8' {...stroke} />
        <rect x={front.x} y={front.y} width={front.w} height={front.h} rx='0.8' {...stroke} />
        <rect x={overlap.x} y={overlap.y} width={overlap.w} height={overlap.h} rx='0.25' fill='currentColor' opacity='0.98' />
      </svg>
    );
  }

  if (op === 'exclude') {
    return (
      <svg viewBox='0 0 16 16' className={glyphClass}>
        <rect x={back.x} y={back.y} width={back.w} height={back.h} rx='0.8' fill='currentColor' opacity='0.98' />
        <rect x={front.x} y={front.y} width={front.w} height={front.h} rx='0.8' fill='currentColor' opacity='0.98' />
        <rect x={overlap.x} y={overlap.y} width={overlap.w} height={overlap.h} fill='white' />
      </svg>
    );
  }

  if (op === 'divide') {
    return (
      <svg viewBox='0 0 16 16' className={glyphClass}>
        <rect x={back.x} y={back.y} width={back.w} height={back.h} rx='0.8' {...stroke} />
        <rect x={front.x} y={front.y} width={front.w} height={front.h} rx='0.8' {...stroke} />
        <path d='M6.9 9.1 9.1 6.9M6.9 6.9 9.1 9.1' {...stroke} />
      </svg>
    );
  }

  if (op === 'trim') {
    return (
      <svg viewBox='0 0 16 16' className={glyphClass}>
        <rect x={back.x} y={back.y} width={back.w} height={back.h} rx='0.8' fill='currentColor' opacity='0.98' />
        <rect x={front.x} y={front.y} width={front.w} height={front.h} rx='0.8' fill='currentColor' opacity='0.98' />
        <rect x={overlap.x} y={overlap.y} width={overlap.w} height={overlap.h} fill='white' />
        <rect x='10.5' y='10.5' width='2.2' height='2.2' fill='currentColor' opacity='0.98' />
      </svg>
    );
  }

  if (op === 'merge') {
    return (
      <svg viewBox='0 0 16 16' className={glyphClass}>
        <path d='M2.5 2.5h7v4h4v7h-7v-4h-4z' fill='currentColor' opacity='0.98' />
      </svg>
    );
  }

  if (op === 'crop') {
    return (
      <svg viewBox='0 0 16 16' className={glyphClass}>
        <path d='M4 2.5v8h8M2.5 4h8v8' {...stroke} />
        <rect x='7' y='7' width='3.3' height='3.3' fill='currentColor' opacity='0.98' />
      </svg>
    );
  }

  if (op === 'outline') {
    return (
      <svg viewBox='0 0 16 16' className={glyphClass}>
        <rect x={back.x} y={back.y} width={back.w} height={back.h} rx='0.8' {...stroke} />
        <rect x={front.x} y={front.y} width={front.w} height={front.h} rx='0.8' {...stroke} />
      </svg>
    );
  }

  return (
    <svg viewBox='0 0 16 16' className={glyphClass}>
      <rect x={front.x} y={front.y} width={front.w} height={front.h} rx='0.8' fill='currentColor' opacity='0.98' />
      <rect x={back.x} y={back.y} width={back.w} height={back.h} rx='0.8' {...stroke} />
      <rect x={overlap.x} y={overlap.y} width={overlap.w} height={overlap.h} fill='white' />
    </svg>
  );
}

function SidePanelTooltip({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setTooltipPos({
        left: rect.left + rect.width / 2,
        top: rect.top - 6,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open
        ? createPortal(
            <span
              role='tooltip'
              className='pointer-events-none fixed z-[500] rounded-md bg-gray-900 px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-sm'
              style={{
                left: tooltipPos.left,
                top: tooltipPos.top,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {title}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

function IconGridTooltipButton({
  title,
  onClick,
  children,
  className,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SidePanelTooltip title={title} className='w-full'>
      <button
        type='button'
        onClick={onClick}
        title={title}
        aria-label={title}
        className={`flex h-8 w-full cursor-pointer items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 ${className ?? ''}`}
      >
        {children}
      </button>
    </SidePanelTooltip>
  );
}

const RECOMMENDED_SECTIONS_COUNT = 3;
const PLACEHOLDERS_PER_SECTION = 4;

const SHAPE_ITEMS: { tool: ToolType; label: string; icon: React.ReactNode }[] = [
  { tool: 'rect', label: '사각형 (R)', icon: <Square size={18} strokeWidth={1.5} /> },
  { tool: 'ellipse', label: '원 (O)', icon: <Circle size={18} strokeWidth={1.5} /> },
  { tool: 'triangle', label: '삼각형 (Y)', icon: <Triangle size={18} strokeWidth={1.5} /> },
  { tool: 'line', label: '선 (L)', icon: <Minus size={18} strokeWidth={1.5} /> },
  { tool: 'arrow', label: '화살표', icon: <ArrowRight size={18} strokeWidth={1.5} /> },
  { tool: 'draw', label: '브러쉬 (B)', icon: <Paintbrush size={18} strokeWidth={1.5} /> },
  { tool: 'pen', label: '펜 (P)', icon: <PenTool size={18} strokeWidth={1.5} /> },
  { tool: 'text', label: '텍스트 (T)', icon: <Type size={18} strokeWidth={1.5} /> },
];

export default function WorksheetToolbox() {
  const [activePanelKey, setActivePanelKey] = useState('template');
  const [contentOpen, setContentOpen] = useState(true);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const touchActionLockRef = useRef(false);

  const {
    layers,
    alignSelected,
    applyPathfinder,
    toggleLayerVisibility,
    toggleLayerLock,
    toggleLayerExpanded,
    activeTool,
    setActiveTool,
    activeLayerId,
    selectLayer,
    renameLayer,
    deleteSelected,
    groupSelected,
    ungroupSelected,
  } = useCanvas();

  const beginLayerRename = (layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditingLayerName(currentName);
  };

  const commitLayerRename = () => {
    if (!editingLayerId) return;
    renameLayer(editingLayerId, editingLayerName);
    setEditingLayerId(null);
    setEditingLayerName('');
  };

  const handleFastPress = (
    event: React.PointerEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    if (event.pointerType !== 'touch') {
      return;
    }

    event.preventDefault();
    touchActionLockRef.current = true;
    action();
  };

  const runClickAction = (action: () => void) => {
    if (touchActionLockRef.current) {
      touchActionLockRef.current = false;
      return;
    }

    action();
  };

  const handleToolTabClick = (tab: string) => {
    setActivePanelKey(tab);
    setContentOpen(true);
  };

  return (
    <div className='flex h-full shrink-0 overflow-hidden rounded-lg bg-white p-3 shadow-sm'>
      <div className='flex min-h-0 min-w-0 flex-1'>
        <nav className='flex w-14 shrink-0 flex-col gap-y-2'>
          {TOOL_ITEMS.map(({ key, label, icon: Icon }) => (
            <SidePanelTooltip key={key} title={label}>
              <button
                type='button'
                onPointerDown={(event) => handleFastPress(event, () => handleToolTabClick(key))}
                onClick={() => runClickAction(() => handleToolTabClick(key))}
                title={label}
                aria-label={label}
                className={`flex touch-manipulation aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md p-2 text-[10px] transition-colors ${
                  activePanelKey === key
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
                {label}
              </button>
            </SidePanelTooltip>
          ))}
          <div className='mt-auto flex justify-center py-2'>
            <SidePanelTooltip title={contentOpen ? '도구모음 접기' : '도구모음 펼치기'}>
              <button
                type='button'
                onPointerDown={(event) =>
                  handleFastPress(event, () => setContentOpen((open) => !open))
                }
                onClick={() => runClickAction(() => setContentOpen((open) => !open))}
                className='touch-manipulation cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                title={contentOpen ? '도구모음 접기' : '도구모음 펼치기'}
                aria-label={contentOpen ? '도구모음 접기' : '도구모음 펼치기'}
              >
                {contentOpen ? (
                  <ChevronsLeft size={18} strokeWidth={1.5} />
                ) : (
                  <ChevronsRight size={18} strokeWidth={1.5} />
                )}
              </button>
            </SidePanelTooltip>
          </div>
        </nav>

        <div
          className='flex shrink-0 flex-col overflow-hidden transition-[width] duration-150 ease-out'
          style={{ width: contentOpen ? CONTENT_PANEL_WIDTH + GAP_X : 0 }}
        >
          <div
            className='flex min-h-0 min-w-56 flex-1 flex-col gap-y-2 pl-3 transition-opacity duration-150 ease-out'
            style={{ opacity: contentOpen ? 1 : 0 }}
          >
            {activePanelKey === 'tools' ? (
              <div className='flex min-h-0 flex-1 flex-col gap-y-3 overflow-y-auto'>
                <p className='shrink-0 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                  도구
                </p>
                <div className='grid grid-cols-3 gap-2'>
                  {SHAPE_ITEMS.map(({ tool, label, icon }) => (
                    <SidePanelTooltip key={tool} title={label} className='w-full'>
                      <button
                        type='button'
                        onPointerDown={(event) => handleFastPress(event, () => setActiveTool(tool))}
                        onClick={() => runClickAction(() => setActiveTool(tool))}
                        title={label}
                        aria-label={label}
                        className={`flex w-full touch-manipulation flex-col items-center gap-1 rounded-lg px-2 py-3 text-[10px] transition-colors ${
                          activeTool === tool
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        }`}
                      >
                        {icon}
                        {label}
                      </button>
                    </SidePanelTooltip>
                  ))}
                </div>
              </div>
            ) : activePanelKey === 'layer' ? (
              <div className='flex min-h-0 flex-1 flex-col gap-y-3 overflow-hidden'>
                <div className='shrink-0'>
                  <p className='mb-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                    Position
                  </p>
                  <div className='grid grid-cols-6 gap-1'>
                    {ALIGN_BUTTONS.map(({ type, icon, title }) => (
                      <IconGridTooltipButton
                        key={type}
                        onClick={() => alignSelected(type)}
                        title={title}
                      >
                        {icon}
                      </IconGridTooltipButton>
                    ))}
                  </div>
                </div>

                <div className='shrink-0'>
                  <p className='mb-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                    Pathfinder
                  </p>
                  <div className='grid grid-cols-5 gap-1'>
                    {PATHFINDER_BUTTONS.map(({ op, title }) => (
                      <IconGridTooltipButton
                        key={op}
                        onClick={() => applyPathfinder(op)}
                        title={title}
                        className='h-9'
                      >
                        <PathfinderGlyph op={op} />
                      </IconGridTooltipButton>
                    ))}
                  </div>
                </div>

                <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                  <div className='mb-1.5 flex shrink-0 items-center gap-1'>
                    <p className='flex-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'>
                      Layers
                    </p>
                    <SidePanelTooltip title='그룹화 (Cmd/Ctrl+G)'>
                      <button
                        type='button'
                        onClick={groupSelected}
                        title='그룹화 (Cmd/Ctrl+G)'
                        className='cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                      >
                        <Layers size={13} strokeWidth={1.5} />
                      </button>
                    </SidePanelTooltip>
                    <SidePanelTooltip title='그룹 해제 (Cmd/Ctrl+Alt+G)'>
                      <button
                        type='button'
                        onClick={ungroupSelected}
                        title='그룹 해제 (Cmd/Ctrl+Alt+G)'
                        className='cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                      >
                        <Ungroup size={13} strokeWidth={1.5} />
                      </button>
                    </SidePanelTooltip>
                    <SidePanelTooltip title='삭제 (Delete)'>
                      <button
                        type='button'
                        onClick={deleteSelected}
                        title='삭제 (Delete)'
                        className='cursor-pointer rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500'
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </SidePanelTooltip>
                  </div>
                  <div className='flex min-h-0 flex-1 flex-col gap-y-0.5 overflow-y-auto'>
                    {layers.length === 0 && (
                      <p className='py-4 text-center text-xs text-gray-400'>
                        캔버스가 비어 있습니다
                      </p>
                    )}
                    {layers.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => selectLayer(layer.id)}
                        className={`flex cursor-pointer items-center gap-1 rounded-md py-1 pr-1 ${
                          activeLayerId === layer.id
                            ? 'bg-blue-50 ring-1 ring-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                        style={{ paddingLeft: `${4 + layer.depth * 12}px` }}
                      >
                        {layer.isGroup ? (
                          <SidePanelTooltip title={layer.isExpanded ? '그룹 접기' : '그룹 펼치기'}>
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLayerExpanded(layer.id);
                              }}
                              title={layer.isExpanded ? '그룹 접기' : '그룹 펼치기'}
                              className='shrink-0 cursor-pointer text-gray-400 hover:text-gray-700'
                            >
                              {layer.isExpanded ? (
                                <ChevronDown size={12} strokeWidth={1.5} />
                              ) : (
                                <ChevronRight size={12} strokeWidth={1.5} />
                              )}
                            </button>
                          </SidePanelTooltip>
                        ) : (
                          <span className='w-3 shrink-0' />
                        )}

                        <SidePanelTooltip title={layer.visible ? '숨기기' : '표시'}>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerVisibility(layer.id);
                            }}
                            title={layer.visible ? '숨기기' : '표시'}
                            className='shrink-0 cursor-pointer text-gray-400 hover:text-gray-700'
                          >
                            {layer.visible ? (
                              <Eye size={13} strokeWidth={1.5} />
                            ) : (
                              <EyeOff size={13} strokeWidth={1.5} />
                            )}
                          </button>
                        </SidePanelTooltip>

                        <div
                          className='h-3 w-3 shrink-0 rounded-sm border border-gray-200'
                          style={{ background: layer.previewColor }}
                          title={layer.previewColor}
                        />

                        {editingLayerId === layer.id ? (
                          <input
                            value={editingLayerName}
                            onChange={(e) => setEditingLayerName(e.target.value)}
                            onBlur={commitLayerRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitLayerRename();
                              }
                              if (e.key === 'Escape') {
                                setEditingLayerId(null);
                                setEditingLayerName('');
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className='form-input h-6 min-w-0 flex-1 px-1 text-xs'
                            autoFocus
                          />
                        ) : (
                          <span
                            className='min-w-0 flex-1 truncate text-xs text-gray-700'
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              beginLayerRename(layer.id, layer.name);
                            }}
                          >
                            {layer.name}
                          </span>
                        )}

                        <SidePanelTooltip title={editingLayerId === layer.id ? '수정 완료' : '이름 수정'}>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              if (editingLayerId === layer.id) {
                                commitLayerRename();
                                return;
                              }
                              beginLayerRename(layer.id, layer.name);
                            }}
                            title={editingLayerId === layer.id ? '수정 완료' : '이름 수정'}
                            className='shrink-0 cursor-pointer text-gray-400 hover:text-gray-700'
                          >
                            {editingLayerId === layer.id ? (
                              <Check size={13} strokeWidth={1.7} />
                            ) : (
                              <Pencil size={13} strokeWidth={1.7} />
                            )}
                          </button>
                        </SidePanelTooltip>

                        <SidePanelTooltip title={layer.locked ? '잠금 해제' : '잠금'}>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerLock(layer.id);
                            }}
                            title={layer.locked ? '잠금 해제' : '잠금'}
                            className='shrink-0 cursor-pointer text-gray-400 hover:text-gray-700'
                          >
                            {layer.locked ? (
                              <Lock size={13} strokeWidth={1.5} />
                            ) : (
                              <Unlock size={13} strokeWidth={1.5} />
                            )}
                          </button>
                        </SidePanelTooltip>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className='shrink-0 border-b border-gray-100'>
                  <div className='relative flex items-center gap-1 rounded-lg border border-gray-200 bg-white'>
                    <textarea
                      placeholder='템플릿 검색 (예: 카라가 있는 티셔츠)'
                      className='form-input min-w-0 flex-1 resize-none rounded-l-lg border-0 px-2 py-1 pb-9 text-sm text-[13px] outline-none focus:ring-0'
                    />
                    <SidePanelTooltip title='검색'>
                      <button
                        type='button'
                        className='absolute right-2 bottom-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700'
                        title='검색'
                        aria-label='검색'
                      >
                        <ArrowRight size={14} strokeWidth={2} />
                      </button>
                    </SidePanelTooltip>
                  </div>
                </div>
                <div className='flex min-h-0 flex-1 flex-col gap-y-4 overflow-y-auto'>
                  {Array.from({ length: RECOMMENDED_SECTIONS_COUNT }).map((_, sectionIndex) => (
                    <div key={sectionIndex} className='flex flex-col gap-y-2'>
                      <p className='text-xs font-semibold text-gray-700'>추천 템플릿</p>
                      <div className='grid grid-cols-2 gap-2'>
                        {Array.from({ length: PLACEHOLDERS_PER_SECTION }).map((_, i) => (
                          <div key={i} className='aspect-square rounded-lg bg-gray-100' />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Rows3, X, ChevronLeft, ArrowRight, LayoutGrid, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WorksheetTopBar from './WorksheetTopBar';
import WorksheetSizeSpecView from './WorksheetSizeSpecView';
import type { SizeSpecDisplayUnit } from './WorksheetSizeSpecView';
import WorksheetNoticeEditor from './WorksheetNoticeEditor';
import DropdownButton from '../../../components/atoms/DropdownButton';

type DragState =
  | { type: 'sidebar'; startX: number; startWidth: number }
  | { type: 'column'; index: number; startX: number; leftStart: number; rightStart: number }
  | {
      type: 'row';
      columnIndex: number;
      rowIndex: number;
      startY: number;
      topStart: number;
      bottomStart: number;
    }
  | {
      type: 'cell';
      columnIndex: number;
      rowIndex: number;
      startX: number;
      startY: number;
      colStart: number;
      rowStart: number;
      colRightStart: number;
      rowBottomStart: number;
    };

type PanelSpec = { title: string; content: string };

const MIN_SIDEBAR = 220;
const MAX_SIDEBAR = 420;
const MIN_COL = 16;
const MIN_ROW = 14;

const PANEL_DATA: PanelSpec[][] = [
  [
    { title: '도식화', content: '앞/뒤 도식화 및 디테일 뷰' },
    { title: '패턴', content: '패턴 도면 뷰어' },
  ],
  [
    { title: '작업 시 주의사항', content: '봉제/시접/단추 규칙 메모' },
    { title: '라벨', content: '라벨/부자재 규격 테이블' },
    { title: '부자재', content: 'YKK ZIP / 단추 / 케어라벨' },
  ],
  [
    { title: 'Size Spec', content: '사이즈별 실측 표' },
    { title: '색상/사이즈 별 수량', content: '발주 수량 및 합계' },
    { title: '원단 정보', content: '원단 / 혼용률 / 폭 / 요척' },
  ],
];

const SIZE_UNIT_OPTIONS = [
  { id: 1, period: 'cm/단면' },
  { id: 2, period: 'inch/단면' },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function normalize(values: number[]) {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values;
  return values.map((v) => (v / sum) * 100);
}

function getHandleFill(isHovered: boolean, isActive: boolean): string {
  if (isActive) return 'rgba(37, 99, 235, 0.2)';
  if (isHovered) return 'rgba(100, 116, 139, 0.12)';
  return 'transparent';
}

function getHandleStroke(isHovered: boolean, isActive: boolean): string {
  if (isActive) return 'rgb(37 99 235)';
  if (isHovered) return 'rgb(100 116 139)';
  return 'rgba(148, 163, 184, 0.28)';
}

function getHandleGlow(isHovered: boolean, isActive: boolean): string {
  if (isActive) return '0 0 0 1px rgba(37, 99, 235, 0.35), 0 0 14px rgba(37, 99, 235, 0.2)';
  if (isHovered) return '0 0 0 1px rgba(100, 116, 139, 0.22), 0 0 10px rgba(100, 116, 139, 0.14)';
  return 'none';
}

const CATEGORY_ROW1 = ['전체', '남성', '여성', '아동'] as const;
const CATEGORY_ROW2 = ['반팔', '긴팔', '긴바지', '원피스', '반바지'] as const;
const MOCK_TEMPLATES = [0, 1, 2, 3, 4, 5];
const MOCK_RECOMMENDED = [0, 1, 2, 3];

type SidebarTab = 'template' | 'item';

function TemplateSidebar() {
  const [tab, setTab] = useState<SidebarTab>('template');
  const [cat1, setCat1] = useState('전체');
  const [cat2, setCat2] = useState('');
  const [query, setQuery] = useState('');

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex gap-1 px-2 pt-2'>
        <button
          type='button'
          onClick={() => setTab('template')}
          className={`flex flex-col items-center gap-0.5 rounded px-2 py-1.5 transition-colors ${tab === 'template' ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
        >
          <LayoutGrid size={15} strokeWidth={1.8} />
          <span className='text-[10px] leading-none font-medium'>템플릿</span>
        </button>
        <button
          type='button'
          onClick={() => setTab('item')}
          className={`flex flex-col items-center gap-0.5 rounded px-2 py-1.5 transition-colors ${tab === 'item' ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
        >
          <Package size={15} strokeWidth={1.8} />
          <span className='text-[10px] leading-none font-medium'>요소</span>
        </button>
      </div>

      <div className='px-2 pt-2 pb-1'>
        <div className='flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 focus-within:border-gray-300 focus-within:bg-white'>
          <input
            className='min-w-0 flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400'
            placeholder='템플릿 검색 (예: 카라가 있는 티셔츠)'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type='button'
            className='shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600'
          >
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto px-2 pb-2'>
        <p className='mt-1 mb-1.5 text-xs font-semibold text-gray-700'>추천 템플릿</p>
        <div className='mb-3 grid grid-cols-2 gap-1.5'>
          {MOCK_RECOMMENDED.map((i) => (
            <div
              key={i}
              className='aspect-[4/3] cursor-pointer rounded-md border border-gray-200 bg-[#f6f6f7] transition-colors hover:border-gray-300'
            />
          ))}
        </div>

        <p className='mb-1.5 text-xs font-semibold text-gray-700'>템플릿</p>
        <div className='mb-1.5 flex flex-wrap gap-1'>
          {CATEGORY_ROW1.map((c) => (
            <button
              key={c}
              type='button'
              onClick={() => setCat1(c)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${cat1 === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className='mb-3 flex flex-wrap gap-1'>
          {CATEGORY_ROW2.map((c) => (
            <button
              key={c}
              type='button'
              onClick={() => setCat2((prev) => (prev === c ? '' : c))}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${cat2 === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className='grid grid-cols-2 gap-1.5'>
          {MOCK_TEMPLATES.map((i) => (
            <div key={i} className='group cursor-pointer'>
              <div className='mb-1 aspect-[4/3] rounded-md border border-gray-200 bg-[#f6f6f7] transition-colors group-hover:border-violet-300' />
              <p className='truncate text-[10px] text-gray-500'>템플릿 {i + 1}</p>
            </div>
          ))}
        </div>
      </div>

      <div className='border-t border-gray-100 px-2 py-1.5'>
        <button
          type='button'
          className='flex items-center gap-0 rounded px-1 py-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600'
        >
          <ChevronLeft size={13} strokeWidth={2} />
          <ChevronLeft size={13} strokeWidth={2} className='-ml-2' />
        </button>
      </div>
    </div>
  );
}

function Panel({
  title,
  content,
  onResizeStart,
  isResizable,
  onResizeHandleEnter,
  onResizeHandleLeave,
  resizeHandleHovered,
  resizeHandleActive,
  body,
  headerExtra,
}: PanelSpec & {
  onResizeStart?: (e: React.MouseEvent) => void;
  isResizable?: boolean;
  onResizeHandleEnter?: () => void;
  onResizeHandleLeave?: () => void;
  resizeHandleHovered?: boolean;
  resizeHandleActive?: boolean;
  body?: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <section className='relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border border-gray-200 bg-white'>
      <header className='relative z-[260] flex items-center justify-between border-b border-gray-200 px-3 py-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <h3 className='text-[13px] font-semibold text-gray-700'>{title}</h3>
          {headerExtra}
        </div>
        <button
          type='button'
          className='rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
        >
          <X size={13} strokeWidth={2} />
        </button>
      </header>
      {body ? (
        <div className='min-h-0 flex-1 overflow-hidden'>{body}</div>
      ) : (
        <div className='flex-1 bg-[#f6f6f7] px-3 py-2'>
          <p className='text-xs text-gray-500'>{content}</p>
        </div>
      )}
      {isResizable && onResizeStart && (
        <div
          className='absolute right-0.5 bottom-0.5 z-[220] flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded transition-all duration-150 ease-out'
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(e);
          }}
          onMouseEnter={onResizeHandleEnter}
          onMouseLeave={onResizeHandleLeave}
          style={{
            backgroundColor: getHandleFill(Boolean(resizeHandleHovered), Boolean(resizeHandleActive)),
            boxShadow: getHandleGlow(Boolean(resizeHandleHovered), Boolean(resizeHandleActive)),
            transform: resizeHandleActive
              ? 'scale(1.08)'
              : resizeHandleHovered
                ? 'scale(1.04)'
                : 'scale(1)',
          }}
        >
          <svg viewBox='0 0 12 12' className='h-3 w-3' aria-hidden>
            <path
              d='M4.5 11L11 4.5M7.5 11L11 7.5'
              stroke={getHandleStroke(Boolean(resizeHandleHovered), Boolean(resizeHandleActive))}
              strokeWidth='1.2'
              strokeLinecap='round'
            />
          </svg>
        </div>
      )}
    </section>
  );
}

export default function WorksheetLayoutDemo() {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement>(null);

  const [sidebarWidth, setSidebarWidth] = useState(290);
  const [colWidths, setColWidths] = useState([42, 30, 28]);
  const [rowHeights, setRowHeights] = useState<number[][]>([
    [60, 40],
    [40, 30, 30],
    [33, 33, 34],
  ]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [sizeSpecUnit, setSizeSpecUnit] = useState<SizeSpecDisplayUnit>('cm');
  const sizeSpecUnitLabel = sizeSpecUnit === 'inch' ? 'inch/단면' : 'cm/단면';

  const colOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    colWidths.forEach((w) => {
      offsets.push(acc);
      acc += w;
    });
    return offsets;
  }, [colWidths]);

  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: MouseEvent) => {
      if (dragState.type === 'sidebar') {
        const next = clamp(
          dragState.startWidth + (e.clientX - dragState.startX),
          MIN_SIDEBAR,
          MAX_SIDEBAR,
        );
        setSidebarWidth(next);
        return;
      }

      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const boardW = Math.max(1, rect.width);
      const boardH = Math.max(1, rect.height);

      if (dragState.type === 'column') {
        const deltaPct = ((e.clientX - dragState.startX) / boardW) * 100;
        const pair = dragState.leftStart + dragState.rightStart;
        const left = clamp(dragState.leftStart + deltaPct, MIN_COL, pair - MIN_COL);
        const right = pair - left;
        setColWidths((prev) =>
          prev.map((v, i) =>
            i === dragState.index ? left : i === dragState.index + 1 ? right : v,
          ),
        );
        return;
      }

      if (dragState.type === 'cell') {
        const deltaColPct = ((e.clientX - dragState.startX) / boardW) * 100;
        const deltaRowPct = ((e.clientY - dragState.startY) / boardH) * 100;

        const colPair = dragState.colStart + dragState.colRightStart;
        const newCol = clamp(dragState.colStart + deltaColPct, MIN_COL, colPair - MIN_COL);
        const newColRight = colPair - newCol;

        const rowPair = dragState.rowStart + dragState.rowBottomStart;
        const newRow = clamp(dragState.rowStart + deltaRowPct, MIN_ROW, rowPair - MIN_ROW);
        const newRowBottom = rowPair - newRow;

        setColWidths((prev) =>
          prev.map((v, i) =>
            i === dragState.columnIndex
              ? newCol
              : i === dragState.columnIndex + 1
                ? newColRight
                : v,
          ),
        );
        setRowHeights((prev) =>
          prev.map((rows, ci) => {
            if (ci !== dragState.columnIndex) return rows;
            return rows.map((h, ri) =>
              ri === dragState.rowIndex
                ? newRow
                : ri === dragState.rowIndex + 1
                  ? newRowBottom
                  : h,
            );
          }),
        );
        return;
      }

      const deltaPct = ((e.clientY - dragState.startY) / boardH) * 100;
      const pair = dragState.topStart + dragState.bottomStart;
      const top = clamp(dragState.topStart + deltaPct, MIN_ROW, pair - MIN_ROW);
      const bottom = pair - top;
      setRowHeights((prev) =>
        prev.map((rows, ci) => {
          if (ci !== dragState.columnIndex) return rows;
          return rows.map((h, ri) =>
            ri === dragState.rowIndex ? top : ri === dragState.rowIndex + 1 ? bottom : h,
          );
        }),
      );
    };

    const onUp = () => {
      setColWidths((prev) => normalize(prev));
      setRowHeights((prev) => prev.map((rows) => normalize(rows)));
      setDragState(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [dragState]);

  useEffect(() => {
    if (!dragState) {
      document.body.style.cursor = '';
      return;
    }
    if (dragState.type === 'row') {
      document.body.style.cursor = 'row-resize';
    } else if (dragState.type === 'cell') {
      document.body.style.cursor = 'nwse-resize';
    } else {
      document.body.style.cursor = 'col-resize';
    }
    return () => {
      document.body.style.cursor = '';
    };
  }, [dragState]);

  return (
    <div className='flex h-screen w-screen flex-col gap-2 overflow-hidden bg-[#f9f9f9] p-2'>
      {/* Top Bar */}
      <WorksheetTopBar sidebarOpen={true} onToggleSidebar={() => {}} />

      {/* Main Content */}
      <section
        className='relative grid min-h-0 flex-1 gap-2'
        style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}
      >
        <aside className='relative col-start-1 row-start-1 h-full min-h-0 overflow-hidden rounded-lg border border-gray-200 bg-white'>
          <TemplateSidebar />
        </aside>

        <div
          onMouseDown={(e) =>
            setDragState({ type: 'sidebar', startX: e.clientX, startWidth: sidebarWidth })
          }
          onMouseEnter={() => {
            setHoveredHandle('sidebar');
            if (!dragState) document.body.style.cursor = 'col-resize';
          }}
          onMouseLeave={() => {
            setHoveredHandle((prev) => (prev === 'sidebar' ? null : prev));
            if (!dragState) document.body.style.cursor = '';
          }}
          className='pointer-events-auto absolute top-0 bottom-0 z-[120] col-start-1 row-start-1 w-4 -translate-x-1/2 cursor-col-resize'
          style={{
            left: `calc(${sidebarWidth}px + 4px)`,
            backgroundColor: getHandleFill(
              hoveredHandle === 'sidebar',
              dragState?.type === 'sidebar',
            ),
          }}
        />

        <main
          ref={boardRef}
          className='relative col-start-2 row-start-1 h-full min-h-0 rounded-lg bg-[#ebebec] p-1.5'
        >
          <div
            className='relative grid h-full gap-2'
            style={{ gridTemplateColumns: colWidths.map((w) => `${w}fr`).join(' ') }}
          >
            {colWidths.map((_, colIndex) => {
              const rows = rowHeights[colIndex];
              return (
                <div key={`col-${colIndex}`} className='relative h-full min-h-0'>
                  <div
                    className='grid h-full min-h-0 gap-2'
                    style={{ gridTemplateRows: rows.map((h) => `${h}fr`).join(' ') }}
                  >
                    {rows.map((_, rowIndex) => {
                      const panelData = PANEL_DATA[colIndex][rowIndex];
                      const canResizeCell =
                        colIndex < colWidths.length - 1 && rowIndex < rows.length - 1;
                      const cellHandleId = `cell-${colIndex}-${rowIndex}`;
                      return (
                        <div key={`col-${colIndex}-row-${rowIndex}`} className='h-full min-h-0'>
                          <Panel
                            {...panelData}
                            body={
                              panelData.title === 'Size Spec' ? (
                                <WorksheetSizeSpecView displayUnit={sizeSpecUnit} />
                              ) : panelData.title === '작업 시 주의사항' ? (
                                <WorksheetNoticeEditor />
                              ) : undefined
                            }
                            headerExtra={
                              panelData.title === 'Size Spec' ? (
                                <div className='min-w-[104px]'>
                                  <DropdownButton
                                    options={SIZE_UNIT_OPTIONS}
                                    value={sizeSpecUnitLabel}
                                    size='compact'
                                    onChange={(next) =>
                                      setSizeSpecUnit(
                                        next.startsWith('inch')
                                          ? ('inch' as SizeSpecDisplayUnit)
                                          : ('cm' as SizeSpecDisplayUnit),
                                      )
                                    }
                                  />
                                </div>
                              ) : undefined
                            }
                            isResizable={canResizeCell}
                            onResizeHandleEnter={() => {
                              setHoveredHandle(cellHandleId);
                              if (!dragState) document.body.style.cursor = 'nwse-resize';
                            }}
                            onResizeHandleLeave={() => {
                              setHoveredHandle((prev) => (prev === cellHandleId ? null : prev));
                              if (!dragState) document.body.style.cursor = '';
                            }}
                            resizeHandleHovered={hoveredHandle === cellHandleId}
                            resizeHandleActive={
                              dragState?.type === 'cell' &&
                              dragState.columnIndex === colIndex &&
                              dragState.rowIndex === rowIndex
                            }
                            onResizeStart={
                              canResizeCell
                                ? (e) =>
                                    setDragState({
                                      type: 'cell',
                                      columnIndex: colIndex,
                                      rowIndex,
                                      startX: e.clientX,
                                      startY: e.clientY,
                                      colStart: colWidths[colIndex],
                                      rowStart: rows[rowIndex],
                                      colRightStart: colWidths[colIndex + 1],
                                      rowBottomStart: rows[rowIndex + 1],
                                    })
                                : undefined
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  {rows.slice(0, -1).map((_, rowIndex) => {
                    const rowHandleId = `row-${colIndex}-${rowIndex}`;
                    const rowActive =
                      dragState?.type === 'row' &&
                      dragState.columnIndex === colIndex &&
                      dragState.rowIndex === rowIndex;
                    const rowHovered = hoveredHandle === rowHandleId;
                    const boundaryTop = rows
                      .slice(0, rowIndex + 1)
                      .reduce((sum, item) => sum + item, 0);
                    return (
                      <div
                        key={`row-handle-${colIndex}-${rowIndex}`}
                        onMouseDown={(e) =>
                          setDragState({
                            type: 'row',
                            columnIndex: colIndex,
                            rowIndex,
                            startY: e.clientY,
                            topStart: rows[rowIndex],
                            bottomStart: rows[rowIndex + 1],
                          })
                        }
                        onMouseEnter={() => {
                          setHoveredHandle(rowHandleId);
                          if (!dragState) document.body.style.cursor = 'row-resize';
                        }}
                        onMouseLeave={() => {
                          setHoveredHandle((prev) => (prev === rowHandleId ? null : prev));
                          if (!dragState) document.body.style.cursor = '';
                        }}
                        className='pointer-events-auto absolute right-0 left-0 z-[120] h-5 -translate-y-1/2 cursor-row-resize'
                        style={{
                          top: `${boundaryTop}%`,
                        }}
                      >
                        <div
                          className='pointer-events-none absolute top-1/2 right-1 left-1 h-px -translate-y-1/2 rounded-full'
                          style={{
                            height: rowActive ? 2 : rowHovered ? 1.5 : 1,
                            opacity: rowActive ? 1 : rowHovered ? 0.95 : 0.36,
                            backgroundColor: getHandleStroke(rowHovered, rowActive),
                            boxShadow: getHandleGlow(rowHovered, rowActive),
                            transition: 'all 150ms ease-out',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {colWidths.slice(0, -1).map((_, colIndex) => {
              const colHandleId = `col-${colIndex}`;
              const colActive = dragState?.type === 'column' && dragState.index === colIndex;
              const colHovered = hoveredHandle === colHandleId;
              const left = colOffsets[colIndex] + colWidths[colIndex];
              return (
                <div
                  key={`col-handle-${colIndex}`}
                  onMouseDown={(e) =>
                    setDragState({
                      type: 'column',
                      index: colIndex,
                      startX: e.clientX,
                      leftStart: colWidths[colIndex],
                      rightStart: colWidths[colIndex + 1],
                    })
                  }
                  onMouseEnter={() => {
                    setHoveredHandle(colHandleId);
                    if (!dragState) document.body.style.cursor = 'col-resize';
                  }}
                  onMouseLeave={() => {
                    setHoveredHandle((prev) => (prev === colHandleId ? null : prev));
                    if (!dragState) document.body.style.cursor = '';
                  }}
                  className='pointer-events-auto absolute top-0 bottom-0 z-[120] w-6 -translate-x-1/2 cursor-col-resize'
                  style={{
                    left: `${left}%`,
                  }}
                >
                  <div
                    className='pointer-events-none absolute top-1 bottom-1 left-1/2 w-px -translate-x-1/2 rounded-full'
                    style={{
                      width: colActive ? 2 : colHovered ? 1.5 : 1,
                      opacity: colActive ? 1 : colHovered ? 0.95 : 0.36,
                      backgroundColor: getHandleStroke(colHovered, colActive),
                      boxShadow: getHandleGlow(colHovered, colActive),
                      transition: 'all 150ms ease-out',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </main>
      </section>
    </div>
  );
}

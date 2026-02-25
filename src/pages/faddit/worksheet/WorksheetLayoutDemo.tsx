import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WorksheetTopBar from './WorksheetTopBar';
import WorksheetSizeSpecView from './WorksheetSizeSpecView';
import type { SizeSpecDisplayUnit } from './WorksheetSizeSpecView';
import WorksheetNoticeEditor from './WorksheetNoticeEditor';
import WorksheetFabricInfoView from './WorksheetFabricInfoView';
import WorksheetTemplateSidebar from './WorksheetTemplateSidebar';
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

const LABEL_SHEET_STATE = {
  headers: ['품명', '컬러', '규격', '수량'],
  rows: [
    ['브랜드 라벨', 'Black', '직조 / 넥 중앙', '1EA'],
    ['사이즈 라벨', 'White', '인쇄 / 브랜드 라벨 하단', '1EA'],
    ['케어 라벨', 'White', '세탁 기호 / 좌측 옆선', '1EA'],
  ],
};

const TRIM_SHEET_STATE = {
  headers: ['품명', '컬러', '규격', '수량'],
  rows: [
    ['지퍼', 'Black', 'YKK #3', '1EA'],
    ['단추', 'Navy', '18L', '6EA'],
    ['심지', 'White', 'Non-woven', '0.4M'],
  ],
};

const COLOR_SIZE_QTY_STATE = {
  headers: ['컬러', 'XS', 'S', 'M', 'L', 'XL'],
  rows: [
    ['Black', '12', '18', '24', '18', '10'],
    ['White', '8', '14', '20', '16', '9'],
    ['Navy', '10', '16', '22', '17', '11'],
  ],
};

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
  const colRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
  const [colBoundaryLefts, setColBoundaryLefts] = useState<number[]>([]);
  const [rowBoundaryTops, setRowBoundaryTops] = useState<Record<number, number[]>>({});

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

  useLayoutEffect(() => {
    const recalcHandlePositions = () => {
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const boardRect = boardEl.getBoundingClientRect();

      const nextColLefts: number[] = [];
      colWidths.slice(0, -1).forEach((_, colIndex) => {
        const colEl = colRefs.current[colIndex];
        if (!colEl) return;
        const colRect = colEl.getBoundingClientRect();
        nextColLefts.push(colRect.right - boardRect.left);
      });

      const nextRowTops: Record<number, number[]> = {};
      colWidths.forEach((_, colIndex) => {
        const colEl = colRefs.current[colIndex];
        if (!colEl) return;
        const colRect = colEl.getBoundingClientRect();
        const tops: number[] = [];
        rowHeights[colIndex].slice(0, -1).forEach((_, rowIndex) => {
          const key = `${colIndex}-${rowIndex}`;
          const rowEl = rowRefs.current[key];
          if (!rowEl) return;
          const rowRect = rowEl.getBoundingClientRect();
          tops.push(rowRect.bottom - colRect.top);
        });
        nextRowTops[colIndex] = tops;
      });

      setColBoundaryLefts(nextColLefts);
      setRowBoundaryTops(nextRowTops);
    };

    recalcHandlePositions();

    const boardEl = boardRef.current;
    if (!boardEl) return;
    const observer = new ResizeObserver(recalcHandlePositions);
    observer.observe(boardEl);
    window.addEventListener('resize', recalcHandlePositions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalcHandlePositions);
    };
  }, [colWidths, rowHeights, sidebarWidth]);

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
      <WorksheetTopBar />

      {/* Main Content */}
      <section
        className='relative grid min-h-0 flex-1 gap-2'
        style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}
      >
        <aside className='relative col-start-1 row-start-1 h-full min-h-0 overflow-hidden rounded-lg border border-gray-200 bg-white'>
          <WorksheetTemplateSidebar />
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
                <div
                  key={`col-${colIndex}`}
                  ref={(el) => {
                    colRefs.current[colIndex] = el;
                  }}
                  className='relative h-full min-h-0'
                >
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
                        <div
                          key={`col-${colIndex}-row-${rowIndex}`}
                          ref={(el) => {
                            rowRefs.current[`${colIndex}-${rowIndex}`] = el;
                          }}
                          className='h-full min-h-0'
                        >
                          <Panel
                            {...panelData}
                            body={
                              panelData.title === 'Size Spec' ? (
                                <WorksheetSizeSpecView displayUnit={sizeSpecUnit} />
                              ) : panelData.title === '라벨' ? (
                                <WorksheetSizeSpecView
                                  showRowHeader={false}
                                  enableUnitConversion={false}
                                  showAddColumnButton={false}
                                  showColumnActions={false}
                                  showRowDeleteButton
                                  fillWidth
                                  initialState={LABEL_SHEET_STATE}
                                />
                              ) : panelData.title === '부자재' ? (
                                <WorksheetSizeSpecView
                                  showRowHeader={false}
                                  enableUnitConversion={false}
                                  showAddColumnButton={false}
                                  showColumnActions={false}
                                  showRowDeleteButton
                                  fillWidth
                                  initialState={TRIM_SHEET_STATE}
                                />
                              ) : panelData.title === '색상/사이즈 별 수량' ? (
                                <WorksheetSizeSpecView
                                  enableUnitConversion={false}
                                  showTotals
                                  initialState={COLOR_SIZE_QTY_STATE}
                                />
                              ) : panelData.title === '원단 정보' ? (
                                <WorksheetFabricInfoView />
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
                    const boundaryTop = rowBoundaryTops[colIndex]?.[rowIndex];
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
                          top: boundaryTop !== undefined ? `${boundaryTop}px` : undefined,
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
              const left = colBoundaryLefts[colIndex];
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
                    left: left !== undefined ? `${left}px` : undefined,
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import type { Layout, LayoutItem } from 'react-grid-layout';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-grid-layout/css/styles.css';

import { useWorksheetV2Store } from './useWorksheetV2Store';
import { CARD_DEFINITIONS, GRID_CONFIG } from './worksheetV2Constants';
import WorksheetV2GridCard from './WorksheetV2GridCard';
import WorksheetSizeSpecView from '../worksheet/WorksheetSizeSpecView';
import WorksheetNoticeEditor from '../worksheet/WorksheetNoticeEditor';
import DropdownButton from '../../../components/atoms/DropdownButton';
import {
  LABEL_SHEET_STATE,
  TRIM_SHEET_STATE,
  COLOR_SIZE_QTY_STATE,
  SIZE_UNIT_OPTIONS,
  FABRIC_INFO_STATE,
  RIB_FABRIC_INFO_STATE,
} from './worksheetV2Constants';
import type { CardDefinition } from './worksheetV2Types';

const WORKSHEET_MODULE_DRAG_TYPE = 'application/x-faddit-worksheet-card';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function cloneLayout(layout: readonly LayoutItem[]): LayoutItem[] {
  return layout.map((item) => ({ ...item }));
}

function rebalanceRowsToFillWidth(layout: readonly LayoutItem[], cols: number): LayoutItem[] {
  const nextLayout = cloneLayout(layout);
  const rowGroups = new Map<string, LayoutItem[]>();

  nextLayout.forEach((item) => {
    const key = `${item.y}:${item.h}`;
    const group = rowGroups.get(key) ?? [];
    group.push(item);
    rowGroups.set(key, group);
  });

  for (const rowItems of rowGroups.values()) {
    rowItems.sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.i.localeCompare(b.i);
    });

    let xCursor = 0;
    rowItems.forEach((item) => {
      item.x = xCursor;
      xCursor += item.w;
    });

    let delta = cols - xCursor;
    if (delta > 0) {
      rowItems[rowItems.length - 1].w += delta;
    } else if (delta < 0) {
      let overflow = -delta;
      for (let index = rowItems.length - 1; index >= 0 && overflow > 0; index -= 1) {
        const rowItem = rowItems[index];
        const minW = Math.max(1, rowItem.minW ?? 1);
        const reducible = rowItem.w - minW;
        if (reducible <= 0) continue;
        const reduceBy = Math.min(reducible, overflow);
        rowItem.w -= reduceBy;
        overflow -= reduceBy;
      }

      xCursor = 0;
      rowItems.forEach((item) => {
        item.x = xCursor;
        xCursor += item.w;
      });
    }
  }

  return nextLayout;
}

function applyCoupledHorizontalResize(
  previousLayout: readonly LayoutItem[],
  nextLayout: readonly LayoutItem[],
  cols: number,
  resizedItem?: LayoutItem,
  previousResizedItem?: LayoutItem,
): LayoutItem[] {
  const prevById = new Map(previousLayout.map((item) => [item.i, item]));
  const adjustedLayout = cloneLayout(nextLayout);
  const adjustedById = new Map(adjustedLayout.map((item) => [item.i, item]));

  const changedItems = adjustedLayout.filter((item) => {
    const prev = prevById.get(item.i);
    if (!prev) return false;
    return prev.x !== item.x || prev.w !== item.w || prev.y !== item.y || prev.h !== item.h;
  });

  const targetFromCallback = resizedItem ? adjustedById.get(resizedItem.i) : undefined;
  const target = targetFromCallback ?? changedItems.find((item) => {
    const prev = prevById.get(item.i);
    if (!prev) return false;
    return prev.x !== item.x || prev.w !== item.w;
  });

  if (!target) {
    return rebalanceRowsToFillWidth(adjustedLayout, cols);
  }

  const prevTarget = prevById.get(target.i);
  if (!prevTarget) {
    return rebalanceRowsToFillWidth(adjustedLayout, cols);
  }

  const overlapsVertically = (a: LayoutItem, b: LayoutItem) => {
    const aBottom = a.y + a.h;
    const bBottom = b.y + b.h;
    return a.y < bBottom && b.y < aBottom;
  };
  const isRightEdgeResizeFromCallback =
    previousResizedItem &&
    resizedItem &&
    previousResizedItem.x === resizedItem.x &&
    previousResizedItem.w !== resizedItem.w;

  const isLeftEdgeResizeFromCallback =
    previousResizedItem &&
    resizedItem &&
    previousResizedItem.x + previousResizedItem.w === resizedItem.x + resizedItem.w &&
    previousResizedItem.x !== resizedItem.x;

  const prevLeft = prevTarget.x;
  const prevRight = prevTarget.x + prevTarget.w;
  const nextLeft = target.x;
  const nextRight = target.x + target.w;

  if ((isRightEdgeResizeFromCallback || nextRight !== prevRight) && nextLeft === prevLeft) {
    const rightCandidates = previousLayout
      .filter(
        (item) => item.i !== target.i && overlapsVertically(item, prevTarget) && item.x >= prevRight,
      )
      .sort((a, b) => a.x - b.x);
    const prevRightNeighbor =
      rightCandidates.find((item) => item.x === prevRight) ?? rightCandidates[0];
    const rightNeighbor = prevRightNeighbor ? adjustedById.get(prevRightNeighbor.i) : undefined;

    if (prevRightNeighbor && rightNeighbor) {
      const pairSpanEnd = prevRightNeighbor.x + prevRightNeighbor.w;
      const pairTotal = pairSpanEnd - prevTarget.x;
      const minTarget = Math.max(1, target.minW ?? prevTarget.minW ?? 1);
      const minRight = Math.max(1, rightNeighbor.minW ?? prevRightNeighbor.minW ?? 1);

      const nextTargetWidth = clamp(target.w, minTarget, pairTotal - minRight);
      const nextRightX = prevTarget.x + nextTargetWidth;
      const nextRightWidth = pairSpanEnd - nextRightX;

      target.x = prevTarget.x;
      target.y = prevTarget.y;
      target.h = prevTarget.h;
      target.w = nextTargetWidth;
      rightNeighbor.x = nextRightX;
      rightNeighbor.y = prevRightNeighbor.y;
      rightNeighbor.h = prevRightNeighbor.h;
      rightNeighbor.w = nextRightWidth;
    }
  }

  if ((isLeftEdgeResizeFromCallback || nextLeft !== prevLeft) && nextRight === prevRight) {
    const leftCandidates = previousLayout
      .filter(
        (item) =>
          item.i !== target.i && overlapsVertically(item, prevTarget) && item.x + item.w <= prevLeft,
      )
      .sort((a, b) => b.x + b.w - (a.x + a.w));
    const prevLeftNeighbor =
      leftCandidates.find((item) => item.x + item.w === prevLeft) ?? leftCandidates[0];
    const leftNeighbor = prevLeftNeighbor ? adjustedById.get(prevLeftNeighbor.i) : undefined;

    if (prevLeftNeighbor && leftNeighbor) {
      const pairSpanStart = prevLeftNeighbor.x;
      const pairTotal = prevTarget.x + prevTarget.w - pairSpanStart;
      const minTarget = Math.max(1, target.minW ?? prevTarget.minW ?? 1);
      const minLeft = Math.max(1, leftNeighbor.minW ?? prevLeftNeighbor.minW ?? 1);

      const nextTargetWidth = clamp(target.w, minTarget, pairTotal - minLeft);
      const nextLeftWidth = pairTotal - nextTargetWidth;

      leftNeighbor.x = pairSpanStart;
      leftNeighbor.w = nextLeftWidth;
      leftNeighbor.y = prevLeftNeighbor.y;
      leftNeighbor.h = prevLeftNeighbor.h;
      target.x = leftNeighbor.x + leftNeighbor.w;
      target.y = prevTarget.y;
      target.h = prevTarget.h;
      target.w = nextTargetWidth;
    }
  }

  return rebalanceRowsToFillWidth(adjustedLayout, cols);
}

function DiagramPlaceholder() {
  return (
    <div className='flex h-full items-center justify-center bg-[#f6f6f7]'>
      <button
        type='button'
        className='absolute left-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-400 shadow transition-colors hover:text-gray-600'
      >
        <ChevronLeft size={18} />
      </button>
      <div className='flex flex-col items-center gap-2 text-gray-400'>
        <div className='flex h-48 w-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300'>
          <p className='text-sm'>도식화 이미지 영역</p>
        </div>
      </div>
      <button
        type='button'
        className='absolute right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-400 shadow transition-colors hover:text-gray-600'
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function CostCalcPlaceholder() {
  return (
    <div className='flex h-full flex-col items-center justify-center gap-3 bg-[#f6f6f7] p-4'>
      <div className='w-full max-w-lg overflow-hidden rounded-lg border border-gray-200 bg-white'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-gray-200 bg-gray-50'>
              <th className='px-3 py-2 text-left font-medium text-gray-600'>항목</th>
              <th className='px-3 py-2 text-right font-medium text-gray-600'>금액</th>
            </tr>
          </thead>
          <tbody>
            {['원단비', '부자재비', '가공비', '이윤', '합계'].map((item) => (
              <tr key={item} className='border-b border-gray-100 last:border-0'>
                <td className='px-3 py-2 text-gray-700'>{item}</td>
                <td className='px-3 py-2 text-right text-gray-400'>-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className='text-xs text-gray-400'>원가계산서 기능 준비 중</p>
    </div>
  );
}

function CustomWebEditorCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <WorksheetNoticeEditor
      value={value}
      onChange={onChange}
      placeholder='새 메모장 내용을 입력하세요. (예: 체크리스트, 링크, 메모)'
      initialContent=''
    />
  );
}

function SizeSpecUnitSelector() {
  const sizeSpecUnit = useWorksheetV2Store((s) => s.sizeSpecUnit);
  const setSizeSpecUnit = useWorksheetV2Store((s) => s.setSizeSpecUnit);
  const label = sizeSpecUnit === 'inch' ? 'inch/단면' : 'cm/단면';

  return (
    <div className='min-w-[104px]'>
      <DropdownButton
        options={SIZE_UNIT_OPTIONS}
        value={label}
        size='compact'
        onChange={(next: string) => setSizeSpecUnit(next.startsWith('inch') ? 'inch' : 'cm')}
      />
    </div>
  );
}

function CardBodyRenderer({
  card,
  customCardContent,
  onChangeCustomContent,
}: {
  card: CardDefinition;
  customCardContent: Record<string, string>;
  onChangeCustomContent: (cardId: string, content: string) => void;
}) {
  const cardId = card.id;
  const sizeSpecUnit = useWorksheetV2Store((s) => s.sizeSpecUnit);

  switch (cardId) {
    case 'diagram-view':
      return <DiagramPlaceholder />;
    case 'notice':
      return <WorksheetNoticeEditor />;
    case 'size-spec':
      return <WorksheetSizeSpecView displayUnit={sizeSpecUnit} fillWidth />;
    case 'label-sheet':
      return (
        <WorksheetSizeSpecView
          showRowHeader={false}
          enableUnitConversion={false}
          showRowDeleteButton
          fillWidth
          initialState={LABEL_SHEET_STATE}
        />
      );
    case 'trim-sheet':
      return (
        <WorksheetSizeSpecView
          showRowHeader={false}
          enableUnitConversion={false}
          showRowDeleteButton
          fillWidth
          initialState={TRIM_SHEET_STATE}
        />
      );
    case 'color-size-qty':
      return (
        <WorksheetSizeSpecView
          enableUnitConversion={false}
          showTotals
          fillWidth
          initialState={COLOR_SIZE_QTY_STATE}
        />
      );
    case 'fabric-info':
      return (
        <WorksheetSizeSpecView
          showRowHeader={false}
          enableUnitConversion={false}
          showRowDeleteButton
          fillWidth
          initialState={FABRIC_INFO_STATE}
        />
      );
    case 'rib-fabric-info':
      return (
        <WorksheetSizeSpecView
          showRowHeader={false}
          enableUnitConversion={false}
          showRowDeleteButton
          fillWidth
          initialState={RIB_FABRIC_INFO_STATE}
        />
      );
    case 'cost-calc':
      return <CostCalcPlaceholder />;
    default:
      if (!card.isDefault && cardId.startsWith('custom-')) {
        return (
          <CustomWebEditorCell
            value={customCardContent[cardId] ?? ''}
            onChange={(next) => onChangeCustomContent(cardId, next)}
          />
        );
      }

      return (
        <div className='flex h-full items-center justify-center bg-[#f6f6f7] p-3'>
          <p className='text-xs text-gray-500'>{cardId}</p>
        </div>
      );
  }
}

export default function WorksheetV2GridContent() {
  const { width, containerRef, mounted } = useContainerWidth();

  const activeTab = useWorksheetV2Store((s) => s.activeTab);
  const tabLayouts = useWorksheetV2Store((s) => s.tabLayouts);
  const cardVisibility = useWorksheetV2Store((s) => s.cardVisibility);
  const activeCardIdByTab = useWorksheetV2Store((s) => s.activeCardIdByTab);
  const customCards = useWorksheetV2Store((s) => s.customCards);
  const customCardContent = useWorksheetV2Store((s) => s.customCardContent);
  const draggingCardId = useWorksheetV2Store((s) => s.draggingCardId);
  const updateLayout = useWorksheetV2Store((s) => s.updateLayout);
  const removeCard = useWorksheetV2Store((s) => s.removeCard);
  const showCardAt = useWorksheetV2Store((s) => s.showCardAt);
  const updateCustomCardContent = useWorksheetV2Store((s) => s.updateCustomCardContent);
  const setDraggingCardId = useWorksheetV2Store((s) => s.setDraggingCardId);
  const setActiveCard = useWorksheetV2Store((s) => s.setActiveCard);

  const [isInteracting, setIsInteracting] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<LayoutItem[] | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [dropPreview, setDropPreview] = useState<{
    cardId: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const interactionStartLayoutRef = useRef<LayoutItem[] | null>(null);

  const currentLayout = tabLayouts[activeTab];
  const visMap = cardVisibility[activeTab];
  const activeCardId = activeCardIdByTab[activeTab];
  const tabCards = useMemo(
    () => [...CARD_DEFINITIONS[activeTab], ...customCards[activeTab]],
    [activeTab, customCards],
  );

  const visibleCards = useMemo(() => tabCards.filter((c) => visMap[c.id]), [tabCards, visMap]);

  const visibleLayout = useMemo(
    () => currentLayout.filter((l) => visMap[l.i]),
    [currentLayout, visMap],
  );

  const usedRows = useMemo(() => {
    if (visibleLayout.length === 0) {
      return 1;
    }

    return Math.max(1, ...visibleLayout.map((item) => item.y + item.h));
  }, [visibleLayout]);

  const gridRowHeight = useMemo(() => {
    const innerHeight = Math.max(0, containerHeight - 12);
    const marginY = GRID_CONFIG.margin[1];
    const totalMargins = Math.max(0, usedRows - 1) * marginY;
    const availableHeight = innerHeight - totalMargins;

    if (availableHeight <= 0) {
      return GRID_CONFIG.rowHeight;
    }

    return Math.max(12, availableHeight / usedRows);
  }, [containerHeight, usedRows]);

  const gridMetrics = useMemo(() => {
    const [marginX, marginY] = GRID_CONFIG.margin;
    const gridWidth = Math.max(0, width - 12);
    const colWidth = (gridWidth - marginX * (GRID_CONFIG.cols - 1)) / GRID_CONFIG.cols;

    return {
      marginX,
      marginY,
      colWidth,
      rowHeight: gridRowHeight,
    };
  }, [width, gridRowHeight]);

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      setPendingLayout(cloneLayout(newLayout));
    },
    [],
  );

  useEffect(() => {
    setPendingLayout(null);
    interactionStartLayoutRef.current = null;
  }, [activeTab]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateContainerHeight = () => {
      setContainerHeight(element.clientHeight);
    };

    updateContainerHeight();

    const observer = new ResizeObserver(() => {
      updateContainerHeight();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  const resolveDraggedCardId = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const byCustomType = event.dataTransfer.getData(WORKSHEET_MODULE_DRAG_TYPE);
      const byPlainText = event.dataTransfer.getData('text/plain');
      return byCustomType || byPlainText || draggingCardId || '';
    },
    [draggingCardId],
  );

  const calculateDropPreview = useCallback(
    (event: React.DragEvent<HTMLDivElement>, cardId: string) => {
      if (!mounted || width <= 0) {
        return null;
      }
      if (!cardId) {
        return null;
      }

      const card = tabCards.find((item) => item.id === cardId);
      if (!card) {
        return null;
      }

      const cols = GRID_CONFIG.cols;
      const { colWidth, marginX, marginY, rowHeight } = gridMetrics;
      if (colWidth <= 0) {
        return null;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const relX = Math.max(0, event.clientX - rect.left - 6);
      const relY = Math.max(0, event.clientY - rect.top - 6);

      const w = Math.min(card.defaultLayout.w, cols);
      const h = card.defaultLayout.h;

      const x = Math.max(0, Math.min(cols - w, Math.floor(relX / (colWidth + marginX))));
      const y = Math.max(0, Math.floor(relY / (rowHeight + marginY)));

      return { cardId, x, y, w, h };
    },
    [gridMetrics, mounted, tabCards],
  );

  const gridChildren = useMemo(
    () =>
      visibleCards.map((card) => (
        <div key={card.id} style={{ pointerEvents: isInteracting ? 'none' : 'auto' }}>
          <WorksheetV2GridCard
            cardId={card.id}
            title={card.title}
            headerExtra={card.id === 'size-spec' ? <SizeSpecUnitSelector /> : undefined}
            onClose={card.id === 'diagram-view' ? undefined : () => removeCard(activeTab, card.id)}
            isActive={activeCardId === card.id}
            onActivate={(cardId) => setActiveCard(activeTab, cardId)}
          >
            <CardBodyRenderer
              card={card}
              customCardContent={customCardContent}
              onChangeCustomContent={updateCustomCardContent}
            />
          </WorksheetV2GridCard>
        </div>
      )),
    [
      visibleCards,
      isInteracting,
      removeCard,
      activeTab,
      activeCardId,
      setActiveCard,
      customCardContent,
      updateCustomCardContent,
    ],
  );

  return (
    <div
      ref={containerRef}
      className='relative min-h-0 flex-1 overflow-hidden rounded-lg bg-[#ebebec] p-1.5'
      onDragOver={(event) => {
        const draggedCardId = resolveDraggedCardId(event);
        if (!draggedCardId) {
          setDropPreview(null);
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const preview = calculateDropPreview(event, draggedCardId);
        if (!preview) {
          setDropPreview(null);
          return;
        }

        setDropPreview(preview);
      }}
      onDragLeave={() => {
        setDropPreview(null);
      }}
      onDrop={(event) => {
        const draggedCardId = resolveDraggedCardId(event);
        event.preventDefault();

        const preview = draggedCardId ? calculateDropPreview(event, draggedCardId) : null;
        setDropPreview(null);
        setDraggingCardId(null);

        if (!preview) {
          return;
        }

        showCardAt(activeTab, preview.cardId, {
          x: preview.x,
          y: preview.y,
          w: preview.w,
          h: preview.h,
        });
      }}
    >
      {dropPreview ? (
        <div
          className='pointer-events-none absolute z-[210] rounded-md border-2 border-dashed border-blue-400 bg-blue-100/45'
          style={{
            left: 6 + dropPreview.x * (gridMetrics.colWidth + gridMetrics.marginX),
            top: 6 + dropPreview.y * (gridMetrics.rowHeight + gridMetrics.marginY),
            width:
              dropPreview.w * gridMetrics.colWidth + (dropPreview.w - 1) * gridMetrics.marginX,
            height:
              dropPreview.h * gridMetrics.rowHeight + (dropPreview.h - 1) * gridMetrics.marginY,
          }}
        />
      ) : null}
      {mounted && width > 0 && (
        <ReactGridLayout
          key={activeTab}
          layout={visibleLayout}
          width={width - 12}
          gridConfig={{
            cols: GRID_CONFIG.cols,
            rowHeight: gridMetrics.rowHeight,
            margin: GRID_CONFIG.margin,
          }}
          dragConfig={{
            enabled: true,
            handle: '.worksheet-v2-drag-handle',
            cancel: '.worksheet-v2-no-drag',
          }}
          resizeConfig={{
            enabled: true,
            handles: ['e', 's', 'w', 'n', 'se', 'sw', 'ne', 'nw'],
          }}
          onLayoutChange={handleLayoutChange}
          onDragStart={() => {
            setIsInteracting(true);
            setPendingLayout(null);
            interactionStartLayoutRef.current = cloneLayout(currentLayout);
          }}
          onDragStop={(layout) => {
            setIsInteracting(false);
            const finalLayout = pendingLayout ?? layout ?? currentLayout;
            if (finalLayout) {
              updateLayout(activeTab, rebalanceRowsToFillWidth(finalLayout, GRID_CONFIG.cols));
              setPendingLayout(null);
            }
            interactionStartLayoutRef.current = null;
          }}
          onResizeStart={() => {
            setIsInteracting(true);
            setPendingLayout(null);
            interactionStartLayoutRef.current = cloneLayout(currentLayout);
          }}
          onResizeStop={(layout, oldItem, newItem) => {
            setIsInteracting(false);
            const finalLayout = pendingLayout ?? layout ?? currentLayout;
            const baseLayout = interactionStartLayoutRef.current ?? currentLayout;

            if (finalLayout) {
              updateLayout(
                activeTab,
                applyCoupledHorizontalResize(
                  baseLayout,
                  finalLayout,
                  GRID_CONFIG.cols,
                  newItem,
                  oldItem,
                ),
              );
              setPendingLayout(null);
            }
            interactionStartLayoutRef.current = null;
          }}
        >
          {gridChildren}
        </ReactGridLayout>
      )}
    </div>
  );
}

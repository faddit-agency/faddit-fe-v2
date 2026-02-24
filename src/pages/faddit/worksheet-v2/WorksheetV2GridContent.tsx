import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
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
    <div className='flex h-full flex-col gap-2 p-3'>
      <div className='rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-500'>
        자유 입력 웹에디터 셀
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder='텍스트, 링크, 메모를 자유롭게 작성하세요.'
        className='form-textarea min-h-0 flex-1 resize-none text-sm'
      />
    </div>
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
      return <WorksheetSizeSpecView displayUnit={sizeSpecUnit} />;
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
  const customCards = useWorksheetV2Store((s) => s.customCards);
  const customCardContent = useWorksheetV2Store((s) => s.customCardContent);
  const draggingCardId = useWorksheetV2Store((s) => s.draggingCardId);
  const updateLayout = useWorksheetV2Store((s) => s.updateLayout);
  const removeCard = useWorksheetV2Store((s) => s.removeCard);
  const showCardAt = useWorksheetV2Store((s) => s.showCardAt);
  const updateCustomCardContent = useWorksheetV2Store((s) => s.updateCustomCardContent);
  const setDraggingCardId = useWorksheetV2Store((s) => s.setDraggingCardId);

  const [isInteracting, setIsInteracting] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<Layout | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [dropPreview, setDropPreview] = useState<{
    cardId: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const currentLayout = tabLayouts[activeTab];
  const visMap = cardVisibility[activeTab];
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
      setPendingLayout([...newLayout]);

      if (!isInteracting) {
        updateLayout(activeTab, [...newLayout]);
      }
    },
    [activeTab, isInteracting, updateLayout],
  );

  useEffect(() => {
    setPendingLayout(null);
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
            title={card.title}
            headerExtra={card.id === 'size-spec' ? <SizeSpecUnitSelector /> : undefined}
            onClose={() => removeCard(activeTab, card.id)}
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
          onDragStart={() => setIsInteracting(true)}
          onDragStop={() => {
            setIsInteracting(false);
            if (pendingLayout) {
              updateLayout(activeTab, [...pendingLayout]);
              setPendingLayout(null);
            }
          }}
          onResizeStart={() => setIsInteracting(true)}
          onResizeStop={() => {
            setIsInteracting(false);
            if (pendingLayout) {
              updateLayout(activeTab, [...pendingLayout]);
              setPendingLayout(null);
            }
          }}
        >
          {gridChildren}
        </ReactGridLayout>
      )}
    </div>
  );
}

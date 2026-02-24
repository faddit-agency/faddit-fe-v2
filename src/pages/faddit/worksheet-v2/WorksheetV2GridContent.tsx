import React, { useCallback, useMemo, useState } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-grid-layout/css/styles.css';

import { useWorksheetV2Store } from './useWorksheetV2Store';
import { CARD_DEFINITIONS, GRID_CONFIG } from './worksheetV2Constants';
import WorksheetV2GridCard from './WorksheetV2GridCard';
import WorksheetSizeSpecView from '../worksheet/WorksheetSizeSpecView';
import WorksheetNoticeEditor from '../worksheet/WorksheetNoticeEditor';
import WorksheetFabricInfoView from '../worksheet/WorksheetFabricInfoView';
import DropdownButton from '../../../components/atoms/DropdownButton';
import {
  LABEL_SHEET_STATE,
  TRIM_SHEET_STATE,
  COLOR_SIZE_QTY_STATE,
  SIZE_UNIT_OPTIONS,
} from './worksheetV2Constants';

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

function BasicInfoPlaceholder() {
  const fields = ['제품명', '브랜드', '아이템', '성별', '카테고리', '의류', '시즌'];
  return (
    <div className='flex flex-col gap-y-3 p-3'>
      {fields.map((label) => (
        <div key={label} className='flex items-center gap-x-[10px]'>
          <p className='w-[80px] shrink-0 font-medium text-[#8A8A8A]'>{label}</p>
          <div className='h-6 w-px shrink-0 bg-gray-200' />
          <input className='form-input min-w-0 flex-1' type='text' placeholder={label} />
        </div>
      ))}
    </div>
  );
}

function AdditionalInfoPlaceholder() {
  return (
    <div className='flex flex-col gap-3 p-3'>
      <p className='text-xs text-gray-500'>추가 정보 항목을 자유롭게 입력할 수 있습니다.</p>
      {['', ''].map((_, i) => (
        <div key={i} className='flex items-center gap-2'>
          <input className='form-input min-w-0 flex-1' type='text' placeholder='라벨' />
          <div className='h-6 w-px bg-gray-200' />
          <input className='form-input min-w-0 flex-1' type='text' placeholder='값' />
        </div>
      ))}
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

function CardBodyRenderer({ cardId }: { cardId: string }) {
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
          showAddColumnButton={false}
          showColumnActions={false}
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
          showAddColumnButton={false}
          showColumnActions={false}
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
      return <WorksheetFabricInfoView />;
    case 'basic-info':
      return <BasicInfoPlaceholder />;
    case 'additional-info':
      return <AdditionalInfoPlaceholder />;
    case 'cost-calc':
      return <CostCalcPlaceholder />;
    default:
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
  const updateLayout = useWorksheetV2Store((s) => s.updateLayout);
  const removeCard = useWorksheetV2Store((s) => s.removeCard);

  const [isInteracting, setIsInteracting] = useState(false);

  const currentLayout = tabLayouts[activeTab];
  const visMap = cardVisibility[activeTab];
  const tabCards = CARD_DEFINITIONS[activeTab];

  const visibleCards = useMemo(() => tabCards.filter((c) => visMap[c.id]), [tabCards, visMap]);

  const visibleLayout = useMemo(
    () => currentLayout.filter((l) => visMap[l.i]),
    [currentLayout, visMap],
  );

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      updateLayout(activeTab, [...newLayout]);
    },
    [activeTab, updateLayout],
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
            <CardBodyRenderer cardId={card.id} />
          </WorksheetV2GridCard>
        </div>
      )),
    [visibleCards, isInteracting, removeCard, activeTab],
  );

  return (
    <div
      ref={containerRef}
      className='min-h-0 flex-1 overflow-y-auto rounded-lg bg-[#ebebec] p-1.5'
    >
      {mounted && width > 0 && (
        <ReactGridLayout
          key={activeTab}
          layout={visibleLayout}
          width={width - 12}
          gridConfig={{
            cols: GRID_CONFIG.cols,
            rowHeight: GRID_CONFIG.rowHeight,
            margin: GRID_CONFIG.margin,
          }}
          dragConfig={{
            enabled: true,
            handle: '.worksheet-v2-drag-handle',
            cancel: '.worksheet-v2-no-drag',
          }}
          resizeConfig={{
            enabled: true,
            handles: ['se'],
          }}
          onLayoutChange={handleLayoutChange}
          onDragStart={() => setIsInteracting(true)}
          onDragStop={() => setIsInteracting(false)}
          onResizeStart={() => setIsInteracting(true)}
          onResizeStop={() => setIsInteracting(false)}
        >
          {gridChildren}
        </ReactGridLayout>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { ChevronDown, WandSparkles } from 'lucide-react';

import { useWorksheetV2Store } from './useWorksheetV2Store';

type MaterialSectionKey = 'fabric' | 'label' | 'trim';

type MaterialLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  perUnitCost: number;
  totalCost: number;
};

type ProcessingLine = {
  key: string;
  name: string;
  unitCost: number;
  totalCost: number;
};

type MaterialSection = {
  key: MaterialSectionKey;
  title: string;
  lines: MaterialLine[];
};

const MATERIAL_SECTION_ORDER: MaterialSectionKey[] = ['fabric', 'label', 'trim'];

const PROCESSING_ROWS: Array<{ key: string; name: string }> = [
  { key: 'cutting', name: '재단' },
  { key: 'sewing', name: '봉제' },
  { key: 'washing', name: '워싱' },
  { key: 'qc_packaging', name: 'QC(검사 및 포장)' },
];

const getNumericValue = (raw: string | undefined) => {
  if (!raw) return 0;
  const normalized = String(raw).replace(/,/g, '').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatCount = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}장`;
const formatKrw = (value: number) => `₩ ${Math.round(value).toLocaleString('ko-KR')}`;
const formatQty = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '-';
  return value % 1 === 0 ? value.toLocaleString('ko-KR') : value.toLocaleString('ko-KR', { maximumFractionDigits: 3 });
};

const getUsageQuantity = (cardId: string, row: string[] | undefined) => {
  if (!row) return 1;
  if (cardId === 'fabric-info' || cardId === 'rib-fabric-info') {
    const value = getNumericValue(row[4]);
    return value > 0 ? value : 1;
  }

  const value = getNumericValue(row[1]);
  return value > 0 ? value : 1;
};

export default function WorksheetCostView() {
  const worksheetTitle = useWorksheetV2Store((s) => s.worksheetTitle);
  const moduleElements = useWorksheetV2Store((s) => s.moduleElements);
  const moduleSheetStates = useWorksheetV2Store((s) => s.moduleSheetStates);
  const costState = useWorksheetV2Store((s) => s.costState);
  const setCostElementUnitPrice = useWorksheetV2Store((s) => s.setCostElementUnitPrice);
  const setCostProcessingUnitCost = useWorksheetV2Store((s) => s.setCostProcessingUnitCost);

  const colorSizeState = moduleSheetStates['color-size-qty'];
  const totalProductionQty = useMemo(() => {
    const rows = colorSizeState?.rows ?? [];
    return rows.reduce((sum, row) => {
      const rowTotal = row.slice(1).reduce((acc, value) => acc + getNumericValue(value), 0);
      return sum + rowTotal;
    }, 0);
  }, [colorSizeState?.rows]);

  const colorCount = (colorSizeState?.rows ?? []).length;

  const materialSections = useMemo<MaterialSection[]>(() => {
    const fabricElements = [...(moduleElements['fabric-info'] ?? []), ...(moduleElements['rib-fabric-info'] ?? [])];
    const labelElements = moduleElements['label-sheet'] ?? [];
    const trimElements = moduleElements['trim-sheet'] ?? [];

    const source: Record<MaterialSectionKey, { title: string; cardIds: string[]; elements: typeof fabricElements }> = {
      fabric: {
        title: '원단',
        cardIds: ['fabric-info', 'rib-fabric-info'],
        elements: fabricElements,
      },
      label: {
        title: '라벨',
        cardIds: ['label-sheet'],
        elements: labelElements,
      },
      trim: {
        title: '부자재',
        cardIds: ['trim-sheet'],
        elements: trimElements,
      },
    };

    return MATERIAL_SECTION_ORDER.map((key) => {
      const section = source[key];
      const lines = section.elements.map((element, index) => {
        const cardId = section.cardIds.length === 2 && index >= (moduleElements['fabric-info'] ?? []).length
          ? 'rib-fabric-info'
          : section.cardIds[0];
        const localRowIndex =
          cardId === 'rib-fabric-info' ? index - (moduleElements['fabric-info'] ?? []).length : index;
        const row = moduleSheetStates[cardId]?.rows?.[localRowIndex];
        const quantity = getUsageQuantity(cardId, row);
        const unitPrice = getNumericValue(costState.elementUnitPrices[element.id]);
        const perUnitCost = unitPrice * quantity;
        const totalCost = perUnitCost * totalProductionQty;

        return {
          id: element.id,
          name: element.name,
          quantity,
          unitPrice,
          perUnitCost,
          totalCost,
        };
      });

      return {
        key,
        title: section.title,
        lines,
      };
    });
  }, [costState.elementUnitPrices, moduleElements, moduleSheetStates, totalProductionQty]);

  const materialSubtotalPerUnit = useMemo(
    () => materialSections.reduce((sum, section) => sum + section.lines.reduce((acc, line) => acc + line.perUnitCost, 0), 0),
    [materialSections],
  );

  const processingLines = useMemo<ProcessingLine[]>(() => {
    return PROCESSING_ROWS.map((item) => {
      const unitCost = getNumericValue(costState.processingUnitCosts[item.key]);
      return {
        key: item.key,
        name: item.name,
        unitCost,
        totalCost: unitCost * totalProductionQty,
      };
    });
  }, [costState.processingUnitCosts, totalProductionQty]);

  const processingSubtotalPerUnit = useMemo(
    () => processingLines.reduce((sum, line) => sum + line.unitCost, 0),
    [processingLines],
  );

  const perUnitManufacturingCost = materialSubtotalPerUnit + processingSubtotalPerUnit;
  const totalManufacturingCost = perUnitManufacturingCost * totalProductionQty;

  const representativeUsage = useMemo(() => {
    const firstFabric = materialSections.find((section) => section.key === 'fabric')?.lines[0];
    return firstFabric?.quantity ?? 0;
  }, [materialSections]);

  return (
    <div className='h-full overflow-y-auto bg-[#f6f6f7] p-3'>
      <div className='grid min-h-full grid-cols-12 gap-3'>
        <div className='col-span-8 space-y-3'>
          <div className='grid grid-cols-6 overflow-hidden rounded-xl border border-gray-200 bg-white'>
            <div className='border-r border-gray-200 px-3 py-2'>
              <p className='text-[11px] text-gray-400'>작업지시서명</p>
              <p className='mt-1 truncate text-sm font-semibold text-gray-800'>{worksheetTitle}</p>
            </div>
            <div className='border-r border-gray-200 px-3 py-2'>
              <p className='text-[11px] text-gray-400'>총 생산 수량</p>
              <p className='mt-1 text-sm font-semibold text-gray-800'>{formatCount(totalProductionQty)}</p>
            </div>
            <div className='border-r border-gray-200 px-3 py-2'>
              <p className='text-[11px] text-gray-400'>색상수</p>
              <p className='mt-1 text-sm font-semibold text-gray-800'>{colorCount.toLocaleString('ko-KR')} 컬러</p>
            </div>
            <div className='border-r border-gray-200 px-3 py-2'>
              <p className='text-[11px] text-gray-400'>메인원단 평균 소요량</p>
              <p className='mt-1 text-sm font-semibold text-gray-800'>
                {representativeUsage > 0 ? `${formatQty(representativeUsage)}yd` : '-'}
              </p>
            </div>
            <div className='border-r border-gray-200 px-3 py-2'>
              <p className='text-[11px] text-gray-400'>벌당 총 원가</p>
              <p className='mt-1 text-sm font-semibold text-gray-800'>{formatKrw(perUnitManufacturingCost)}</p>
            </div>
            <div className='px-3 py-2'>
              <p className='text-[11px] text-gray-400'>총 생산 비용</p>
              <p className='mt-1 text-sm font-semibold text-gray-800'>{formatKrw(totalManufacturingCost)}</p>
            </div>
          </div>

          <section className='rounded-xl border border-gray-200 bg-white p-4'>
            <div className='mb-3 flex items-center gap-2 text-[26px] font-semibold text-gray-800'>
              <ChevronDown size={18} className='text-gray-500' />
              자재비 (Material Cost)
            </div>

            {materialSections.map((section) => (
              <div key={section.key} className='mb-4 last:mb-0'>
                <h4 className='mb-2 border-l-2 border-faddit pl-2 text-base font-semibold text-gray-800'>
                  {section.title}
                </h4>
                <div className='overflow-hidden rounded-xl border border-gray-200'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='bg-gray-50 text-gray-500'>
                        <th className='px-4 py-2 text-left font-medium'>항목</th>
                        <th className='px-3 py-2 text-right font-medium'>단가 (원)</th>
                        <th className='px-3 py-2 text-right font-medium'>소요량</th>
                        <th className='px-3 py-2 text-right font-medium'>벌당 원가</th>
                        <th className='px-4 py-2 text-right font-medium'>총 비용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.lines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className='px-4 py-4 text-center text-gray-400'>
                            항목이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        section.lines.map((line) => (
                          <tr key={line.id} className='border-t border-gray-100'>
                            <td className='px-4 py-2 text-gray-800'>{line.name}</td>
                            <td className='px-3 py-2'>
                              <input
                                type='text'
                                inputMode='numeric'
                                value={costState.elementUnitPrices[line.id] ?? ''}
                                onChange={(event) =>
                                  setCostElementUnitPrice(
                                    line.id,
                                    event.target.value.replace(/[^\d]/g, ''),
                                  )
                                }
                                className='form-input h-8 w-[120px] text-right text-sm'
                                placeholder='0'
                              />
                            </td>
                            <td className='px-3 py-2 text-right text-gray-700'>{formatQty(line.quantity)}</td>
                            <td className='px-3 py-2 text-right text-gray-800'>{formatKrw(line.perUnitCost)}</td>
                            <td className='px-4 py-2 text-right font-medium text-gray-900'>
                              {formatKrw(line.totalCost)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className='flex justify-end pt-2 text-right'>
              <div>
                <p className='text-sm text-gray-500'>자재비 소계 (벌당)</p>
                <p className='text-4xl font-semibold text-gray-800'>{formatKrw(materialSubtotalPerUnit)}</p>
              </div>
            </div>
          </section>

          <section className='rounded-xl border border-gray-200 bg-white p-4'>
            <div className='mb-3 flex items-center gap-2 text-[26px] font-semibold text-gray-800'>
              <ChevronDown size={18} className='text-gray-500' />
              가공 및 공임 (Processing & Labor)
            </div>

            <div className='overflow-hidden rounded-xl border border-gray-200'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-gray-50 text-gray-500'>
                    <th className='px-4 py-2 text-left font-medium'>항목</th>
                    <th className='px-3 py-2 text-right font-medium'>벌당 공임 (원)</th>
                    <th className='px-4 py-2 text-right font-medium'>총 공임</th>
                  </tr>
                </thead>
                <tbody>
                  {processingLines.map((line) => (
                    <tr key={line.key} className='border-t border-gray-100'>
                      <td className='px-4 py-2 text-gray-800'>{line.name}</td>
                      <td className='px-3 py-2'>
                        <input
                          type='text'
                          inputMode='numeric'
                          value={costState.processingUnitCosts[line.key] ?? ''}
                          onChange={(event) =>
                            setCostProcessingUnitCost(
                              line.key,
                              event.target.value.replace(/[^\d]/g, ''),
                            )
                          }
                          className='form-input h-8 w-[140px] text-right text-sm'
                          placeholder='0'
                        />
                      </td>
                      <td className='px-4 py-2 text-right font-medium text-gray-900'>{formatKrw(line.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='flex justify-end pt-2 text-right'>
              <div>
                <p className='text-sm text-gray-500'>공임 소계 (벌당)</p>
                <p className='text-4xl font-semibold text-gray-800'>{formatKrw(processingSubtotalPerUnit)}</p>
              </div>
            </div>
          </section>
        </div>

        <div className='col-span-4 space-y-3'>
          <aside className='rounded-xl bg-zinc-800 p-4 text-white'>
            <h3 className='text-lg font-semibold'>제조 원가 요약</h3>

            <div className='mt-4 space-y-3 text-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-zinc-300'>자재비 소계</span>
                <span className='text-xl font-semibold'>{formatKrw(materialSubtotalPerUnit)}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-zinc-300'>가공 및 공임 소계</span>
                <span className='text-xl font-semibold'>{formatKrw(processingSubtotalPerUnit)}</span>
              </div>
              <div className='border-t border-zinc-600 pt-3' />
              <div className='flex items-center justify-between'>
                <span className='text-zinc-300'>벌당 총 제조 원가</span>
                <span className='text-3xl font-semibold'>{formatKrw(perUnitManufacturingCost)}</span>
              </div>
            </div>

            <div className='mt-6 rounded-xl border border-violet-400/60 bg-zinc-700/60 p-3'>
              <div className='grid grid-cols-3 items-center gap-2 text-center text-xs'>
                <div>
                  <p className='text-zinc-400'>벌당 제조 원가</p>
                  <p className='mt-1 text-lg font-semibold'>{formatKrw(perUnitManufacturingCost)}</p>
                </div>
                <div>
                  <p className='text-zinc-400'>총 생산 수량</p>
                  <p className='mt-1 text-lg font-semibold'>{formatCount(totalProductionQty)}</p>
                </div>
                <div>
                  <p className='text-zinc-400'>총 소요 예산</p>
                  <p className='mt-1 text-2xl font-semibold'>{formatKrw(totalManufacturingCost)}</p>
                </div>
              </div>
            </div>

            <button
              type='button'
              className='mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-700 to-indigo-600 text-base font-semibold text-white transition-opacity hover:opacity-90'
            >
              <WandSparkles size={16} />
              생산 의뢰하기?
            </button>
          </aside>

          <section className='rounded-xl border border-gray-200 bg-white p-4'>
            <h4 className='text-lg font-semibold text-gray-800'>생산 체크리스트</h4>
            <div className='mt-3 h-[420px] rounded-lg border border-dashed border-gray-200 bg-gray-50' />
          </section>
        </div>
      </div>
    </div>
  );
}

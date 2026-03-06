import { ChevronDown, WandSparkles } from 'lucide-react';
import { useMemo } from 'react';

import { useWorksheetStore } from './useWorksheetStore';

type MaterialSectionKey = 'fabric' | 'label' | 'trim';

type MaterialLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  perUnitCost: number;
  totalCost: number;
  totalRequiredQuantity?: number;
};

type MaterialSection = {
  key: MaterialSectionKey;
  title: string;
  lines: MaterialLine[];
};

type ProcessingLine = {
  key: string;
  name: string;
  perUnitCost: number;
  totalCost: number;
};

const PROCESSING_ITEMS: Array<{ key: string; name: string }> = [
  { key: 'cutting', name: '재단' },
  { key: 'sewing', name: '봉제' },
  { key: 'washing', name: '워싱' },
  { key: 'qc_packaging', name: 'QC(검사 및 포장)' },
];

const normalizeLabel = (value: string) => value.toLowerCase().replace(/\s+/g, '');

const parseNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    return 0;
  }

  const normalized = raw.replace(/,/g, '').replace(/[^\d.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.') {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const findHeaderIndex = (
  headers: string[],
  includeKeywords: string[],
  excludeKeywords: string[] = [],
) => {
  const includes = includeKeywords.map((keyword) => normalizeLabel(keyword));
  const excludes = excludeKeywords.map((keyword) => normalizeLabel(keyword));

  return headers.findIndex((header) => {
    const normalized = normalizeLabel(header);
    if (!normalized) {
      return false;
    }

    if (excludes.some((keyword) => normalized.includes(keyword))) {
      return false;
    }

    return includes.some((keyword) => normalized.includes(keyword));
  });
};

const formatKrw = (value: number) => `₩ ${Math.round(value).toLocaleString('ko-KR')}`;

const formatProductionCount = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}장`;

const formatQuantity = (value: number) => {
  if (!Number.isFinite(value)) {
    return '-';
  }

  if (Math.abs(value - Math.round(value)) < 0.000001) {
    return Math.round(value).toLocaleString('ko-KR');
  }

  return value.toLocaleString('ko-KR', { maximumFractionDigits: 3 });
};

export default function WorksheetCostView() {
  const moduleSheetStates = useWorksheetStore((state) => state.moduleSheetStates);
  const costState = useWorksheetStore((state) => state.costState);
  const fabricLengthUnit = useWorksheetStore((state) => state.fabricLengthUnit);

  const totalProductionQty = useMemo(() => {
    const rows = moduleSheetStates['color-size-qty']?.rows ?? [];
    return rows.reduce((total, row) => {
      const rowTotal = row.slice(1).reduce((sum, value) => sum + parseNumber(value), 0);
      return total + rowTotal;
    }, 0);
  }, [moduleSheetStates]);

  const materialSections = useMemo<MaterialSection[]>(() => {
    const sectionConfigs: Array<{
      key: MaterialSectionKey;
      title: string;
      cardIds: string[];
      defaultQuantity: number;
      quantityKeywords: string[];
    }> = [
      {
        key: 'fabric',
        title: '원단',
        cardIds: ['fabric-info', 'rib-fabric-info'],
        defaultQuantity: 0,
        quantityKeywords: ['총 필요 원단량', '요척', '소요량'],
      },
      {
        key: 'label',
        title: '라벨',
        cardIds: ['label-sheet'],
        defaultQuantity: 1,
        quantityKeywords: ['사용 수량', '소요량'],
      },
      {
        key: 'trim',
        title: '부자재',
        cardIds: ['trim-sheet'],
        defaultQuantity: 1,
        quantityKeywords: ['사용 수량', '소요량'],
      },
    ];

    return sectionConfigs.map((sectionConfig) => {
      const lines: MaterialLine[] = [];

      sectionConfig.cardIds.forEach((cardId) => {
        const sheet = moduleSheetStates[cardId];
        const headers = sheet?.headers ?? [];
        const rows = sheet?.rows ?? [];

        const totalRequiredIndex =
          sectionConfig.key === 'fabric'
            ? findHeaderIndex(headers, ['총 필요 원단량'])
            : -1;
        const quantityIndex =
          sectionConfig.key === 'fabric'
            ? findHeaderIndex(headers, ['요척', '소요량'], ['총 필요 원단량'])
            : findHeaderIndex(headers, sectionConfig.quantityKeywords);
        const unitPriceIndex = findHeaderIndex(
          headers,
          ['단위당 원가', '단가 (원)', '단가', '원단 단가', 'price'],
          ['총', '벌당'],
        );
        const perUnitCostIndex = findHeaderIndex(headers, ['벌당 원가', '1벌당', '개별 원가']);

        rows.forEach((row, rowIndex) => {
          const isEmptyRow = row.every((cell) => String(cell ?? '').trim() === '');
          if (isEmptyRow) {
            return;
          }

          const rowName = String(row[0] ?? '').trim() || `항목 ${rowIndex + 1}`;
          const quantityFromRow = quantityIndex >= 0 ? parseNumber(row[quantityIndex]) : 0;
          const totalRequiredFromRow =
            sectionConfig.key === 'fabric' && totalRequiredIndex >= 0
              ? parseNumber(row[totalRequiredIndex])
              : 0;
          const quantity =
            quantityFromRow > 0
              ? quantityFromRow
              : sectionConfig.key === 'fabric' && totalRequiredFromRow > 0 && totalProductionQty > 0
                ? totalRequiredFromRow / totalProductionQty
                : sectionConfig.defaultQuantity;

          const unitPriceFromRow = unitPriceIndex >= 0 ? parseNumber(row[unitPriceIndex]) : 0;
          const perUnitCostFromRow = perUnitCostIndex >= 0 ? parseNumber(row[perUnitCostIndex]) : 0;

          const perUnitCost =
            perUnitCostFromRow > 0 ? perUnitCostFromRow : unitPriceFromRow * quantity;

          const unitPrice =
            unitPriceFromRow > 0
              ? unitPriceFromRow
              : quantity > 0 && perUnitCostFromRow > 0
                ? perUnitCostFromRow / quantity
                : 0;

          lines.push({
            name: rowName,
            quantity,
            unitPrice,
            perUnitCost,
            totalCost: perUnitCost * totalProductionQty,
            totalRequiredQuantity:
              sectionConfig.key === 'fabric'
                ? totalRequiredFromRow > 0
                  ? totalRequiredFromRow
                  : quantity * totalProductionQty
                : undefined,
          });
        });
      });

      return {
        key: sectionConfig.key,
        title: sectionConfig.title,
        lines,
      };
    });
  }, [moduleSheetStates, totalProductionQty]);

  const materialSubtotalPerUnit = useMemo(
    () => materialSections.reduce((sum, section) => sum + section.lines.reduce((acc, line) => acc + line.perUnitCost, 0), 0),
    [materialSections],
  );

  const processingLines = useMemo<ProcessingLine[]>(() => {
    return PROCESSING_ITEMS.map((item) => {
      const perUnitCost = parseNumber(costState.processingUnitCosts[item.key]);
      return {
        key: item.key,
        name: item.name,
        perUnitCost,
        totalCost: perUnitCost * totalProductionQty,
      };
    });
  }, [costState.processingUnitCosts, totalProductionQty]);

  const processingSubtotalPerUnit = useMemo(
    () => processingLines.reduce((sum, line) => sum + line.perUnitCost, 0),
    [processingLines],
  );

  const perUnitManufacturingCost = materialSubtotalPerUnit + processingSubtotalPerUnit;
  const totalManufacturingCost = perUnitManufacturingCost * totalProductionQty;

  const checklist = useMemo(() => {
    const fabricLines = materialSections.find((section) => section.key === 'fabric')?.lines ?? [];
    const labelLines = materialSections.find((section) => section.key === 'label')?.lines ?? [];
    const trimLines = materialSections.find((section) => section.key === 'trim')?.lines ?? [];

    const mapLineTotal = (line: MaterialLine, sectionKey: MaterialSectionKey) => {
      if (sectionKey === 'fabric' && line.totalRequiredQuantity && line.totalRequiredQuantity > 0) {
        return line.totalRequiredQuantity;
      }

      return line.quantity * totalProductionQty;
    };

    return {
      fabric: {
        total: fabricLines.reduce((sum, line) => sum + mapLineTotal(line, 'fabric'), 0),
        lines: fabricLines.map((line) => ({
          name: line.name,
          value: mapLineTotal(line, 'fabric'),
        })),
      },
      label: {
        total: labelLines.reduce((sum, line) => sum + mapLineTotal(line, 'label'), 0),
        lines: labelLines.map((line) => ({
          name: line.name,
          value: mapLineTotal(line, 'label'),
        })),
      },
      trim: {
        total: trimLines.reduce((sum, line) => sum + mapLineTotal(line, 'trim'), 0),
        lines: trimLines.map((line) => ({
          name: line.name,
          value: mapLineTotal(line, 'trim'),
        })),
      },
    };
  }, [materialSections, totalProductionQty]);

  return (
    <div className='h-full overflow-y-auto bg-[#f6f6f7] p-2'>
      <div className='grid min-h-full grid-cols-12 gap-3'>
        <div className='col-span-8 space-y-3'>
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
                        section.lines.map((line, lineIndex) => (
                          <tr key={`${section.key}-${lineIndex}`} className='border-t border-gray-100'>
                            <td className='px-4 py-2 text-gray-800'>{line.name}</td>
                            <td className='px-3 py-2 text-right text-gray-800'>
                              {formatQuantity(line.unitPrice)}
                            </td>
                            <td className='px-3 py-2 text-right text-gray-700'>{formatQuantity(line.quantity)}</td>
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
                      <td className='px-3 py-2 text-right text-gray-800'>{formatQuantity(line.perUnitCost)}</td>
                      <td className='px-4 py-2 text-right font-medium text-gray-900'>
                        {formatKrw(line.totalCost)}
                      </td>
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

            <div className='mt-5 space-y-4'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-zinc-300'>자재비 소계</span>
                <span className='text-3xl font-semibold'>{formatKrw(materialSubtotalPerUnit)}</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-zinc-300'>가공 및 공임 소계</span>
                <span className='text-3xl font-semibold'>{formatKrw(processingSubtotalPerUnit)}</span>
              </div>
              <div className='border-t border-zinc-600' />
              <div className='flex items-center justify-between text-sm'>
                <span className='text-zinc-300'>벌당 총 제조 원가</span>
                <span className='text-4xl font-semibold'>{formatKrw(perUnitManufacturingCost)}</span>
              </div>
            </div>

            <div className='mt-6 rounded-xl border border-violet-500/60 bg-zinc-700/60 p-3'>
              <div className='grid grid-cols-3 items-center gap-2 text-center'>
                <div>
                  <p className='text-[11px] text-zinc-400'>벌당 제조 원가</p>
                  <p className='mt-1 text-2xl font-semibold'>{formatKrw(perUnitManufacturingCost)}</p>
                </div>
                <div className='text-zinc-400'>x</div>
                <div>
                  <p className='text-[11px] text-zinc-400'>총 생산 수량</p>
                  <p className='mt-1 text-2xl font-semibold'>{formatProductionCount(totalProductionQty)}</p>
                </div>
              </div>

              <div className='mt-2 border-t border-zinc-500/50 pt-2 text-center'>
                <p className='text-[11px] text-zinc-400'>총 소요 예산</p>
                <p className='mt-1 text-[36px] font-semibold leading-tight'>{formatKrw(totalManufacturingCost)}</p>
              </div>
            </div>

            <button
              type='button'
              className='mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-700 to-indigo-600 text-base font-semibold text-white transition-opacity hover:opacity-90'
            >
              <WandSparkles size={16} />
              생산 의뢰하기
            </button>
          </aside>

          <section className='rounded-xl border border-gray-200 bg-white p-4'>
            <h4 className='text-lg font-semibold text-gray-800'>생산 체크리스트</h4>

            <div className='mt-4 space-y-4 text-sm text-gray-700'>
              <div>
                <div className='flex items-center justify-between font-semibold'>
                  <span>원단 총 필요량</span>
                  <span>
                    {formatQuantity(checklist.fabric.total)} {fabricLengthUnit}
                  </span>
                </div>
                <ul className='mt-1 space-y-1 text-gray-500'>
                  {checklist.fabric.lines.map((line) => (
                    <li key={`fabric-${line.name}`} className='flex items-center justify-between'>
                      <span>↳ {line.name}</span>
                      <span>
                        {formatQuantity(line.value)} {fabricLengthUnit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className='flex items-center justify-between font-semibold'>
                  <span>라벨 총 필요량</span>
                  <span>{formatQuantity(checklist.label.total)}개</span>
                </div>
                <ul className='mt-1 space-y-1 text-gray-500'>
                  {checklist.label.lines.map((line) => (
                    <li key={`label-${line.name}`} className='flex items-center justify-between'>
                      <span>↳ {line.name}</span>
                      <span>{formatQuantity(line.value)}개</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className='flex items-center justify-between font-semibold'>
                  <span>부자재 총 필요량</span>
                  <span>{formatQuantity(checklist.trim.total)}개</span>
                </div>
                <ul className='mt-1 space-y-1 text-gray-500'>
                  {checklist.trim.lines.map((line) => (
                    <li key={`trim-${line.name}`} className='flex items-center justify-between'>
                      <span>↳ {line.name}</span>
                      <span>{formatQuantity(line.value)}개</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className='rounded-xl border border-gray-200 bg-white p-4'>
            <h4 className='text-lg font-semibold text-gray-800'>기타 주의사항</h4>
            <div className='mt-3 h-[160px] rounded-lg border border-dashed border-gray-200 bg-gray-50' />
          </section>
        </div>
      </div>
    </div>
  );
}

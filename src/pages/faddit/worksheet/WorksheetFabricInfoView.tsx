import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GripVertical, Plus, Trash2, Image as ImageIcon } from 'lucide-react';

type FabricRow = {
  id: string;
  imageUrl: string | null;
  fields: string[];
};

type DragOver = { index: number; side: 'before' | 'after' } | null;

const HEADERS = ['원단사진', '원단명', '색상', '사이즈/단가', '혼용률', '요척', '색상'];

const INITIAL_ROWS: FabricRow[] = [
  {
    id: 'fabric-1',
    imageUrl: null,
    fields: ['코튼 트윌', 'Black', 'M / 8,500', '면 100%', '1.4yd', 'BK-01'],
  },
  {
    id: 'fabric-2',
    imageUrl: null,
    fields: ['폴리 립', 'Navy', 'L / 6,200', '폴리 95 스판 5', '0.8yd', 'NV-04'],
  },
];

function moveByInsertIndex<T>(items: T[], fromIndex: number, insertIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  const adjustedInsert = fromIndex < insertIndex ? insertIndex - 1 : insertIndex;
  next.splice(adjustedInsert, 0, moved);
  return next;
}

export default function WorksheetFabricInfoView() {
  const [rows, setRows] = useState<FabricRow[]>(INITIAL_ROWS);
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<DragOver>(null);

  useEffect(() => {
    return () => {
      rows.forEach((row) => {
        if (row.imageUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(row.imageUrl);
        }
      });
    };
  }, [rows]);

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        imageUrl: null,
        fields: Array(HEADERS.length - 1).fill(''),
      },
    ]);
  }, []);

  const deleteRow = useCallback((rowIndex: number) => {
    setRows((prev) => {
      const target = prev[rowIndex];
      if (target?.imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.imageUrl);
      }
      return prev.filter((_, idx) => idx !== rowIndex);
    });
  }, []);

  const setRowField = useCallback((rowIndex: number, fieldIndex: number, value: string) => {
    setRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const nextFields = [...row.fields];
        nextFields[fieldIndex] = value;
        return { ...row, fields: nextFields };
      }),
    );
  }, []);

  const setRowImage = useCallback((rowIndex: number, file: File | null) => {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        if (row.imageUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(row.imageUrl);
        }
        return { ...row, imageUrl: nextUrl };
      }),
    );
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number, side: 'before' | 'after') => {
      if (dragRowIndex === null) return;
      const insertIndex = side === 'before' ? targetIndex : targetIndex + 1;
      setRows((prev) => moveByInsertIndex(prev, dragRowIndex, insertIndex));
      setDragRowIndex(null);
      setDragOver(null);
    },
    [dragRowIndex],
  );

  const rowShiftMap = useMemo(() => {
    const map = new Map<number, number>();
    if (dragRowIndex === null || !dragOver) return map;
    const from = dragRowIndex;
    const insertIndex = dragOver.side === 'before' ? dragOver.index : dragOver.index + 1;
    for (let i = 0; i < rows.length; i += 1) {
      if (i === from) continue;
      if (from < insertIndex && i > from && i < insertIndex) map.set(i, -7);
      if (from > insertIndex && i >= insertIndex && i < from) map.set(i, 7);
    }
    return map;
  }, [dragOver, dragRowIndex, rows.length]);

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex-1 overflow-auto p-4'>
        <div className='relative inline-block min-w-full overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
          <div className='pointer-events-none absolute inset-0 z-20 rounded-lg border border-slate-200' />
          <table className='w-full border-collapse border-spacing-0 bg-white text-sm' style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '90px' }} />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th className='border-y border-r border-slate-200 bg-gray-50 p-0' />
                {HEADERS.map((header) => (
                  <th
                    key={header}
                    className='border-y border-r border-slate-200 bg-gray-50 px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600'
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const isDragOver = dragOver?.index === rowIndex;
                const isDragged = dragRowIndex === rowIndex;
                const yShift = rowShiftMap.get(rowIndex) ?? 0;
                return (
                  <tr
                    key={row.id}
                    className='group/row'
                    style={{
                      transform: `translateY(${yShift}px) scale(${isDragged ? 0.986 : 1})`,
                      opacity: isDragged ? 0.58 : 1,
                      transition:
                        'transform 220ms cubic-bezier(0.2, 0.9, 0.25, 1), opacity 180ms ease, box-shadow 180ms ease',
                    }}
                    onDragOver={(e) => {
                      if (dragRowIndex === null) return;
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const side = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                      setDragOver((prev) =>
                        prev?.index === rowIndex && prev.side === side ? prev : { index: rowIndex, side },
                      );
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const side = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                      handleDrop(rowIndex, side);
                    }}
                  >
                    <td className='border border-slate-200 bg-white p-0'>
                      <div className='flex h-full items-center justify-center gap-1'>
                        <button
                          type='button'
                          draggable
                          onDragStart={() => setDragRowIndex(rowIndex)}
                          onDragEnd={() => {
                            setDragRowIndex(null);
                            setDragOver(null);
                          }}
                          className='flex h-5 w-5 cursor-grab items-center justify-center rounded-md border border-slate-200 bg-white/95 text-slate-400 opacity-0 transition-all duration-200 ease-out group-hover/row:opacity-100 hover:border-slate-300 hover:text-slate-700 active:cursor-grabbing'
                          title='행 이동'
                        >
                          <GripVertical size={13} strokeWidth={2.2} />
                        </button>
                        <button
                          type='button'
                          onClick={() => deleteRow(rowIndex)}
                          className='flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white/95 text-red-400 opacity-0 transition-all duration-200 ease-out group-hover/row:opacity-100 hover:border-red-300 hover:bg-red-50 hover:text-red-500'
                          title='행 삭제'
                        >
                          <Trash2 size={13} strokeWidth={2.1} />
                        </button>
                      </div>
                    </td>

                    <td className='border border-slate-200 p-1'>
                      <label className='group/image flex h-[50px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 hover:bg-slate-100'>
                        {row.imageUrl ? (
                          <img src={row.imageUrl} alt='원단' className='h-full w-full object-cover' />
                        ) : (
                          <span className='flex items-center gap-1 text-[10px] text-slate-400'>
                            <ImageIcon size={12} /> 업로드
                          </span>
                        )}
                        <input
                          type='file'
                          accept='image/*'
                          className='hidden'
                          onChange={(e) => setRowImage(rowIndex, e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </td>

                    {row.fields.map((value, fieldIndex) => (
                      <td key={`${row.id}-field-${fieldIndex}`} className='border border-slate-200 p-0'>
                        <input
                          value={value}
                          onChange={(e) => setRowField(rowIndex, fieldIndex, e.target.value)}
                          className='w-full border-0 bg-white px-2 py-1.5 text-center text-xs text-slate-700 outline-none focus:bg-blue-50'
                        />
                      </td>
                    ))}

                  </tr>
                );
              })}

              <tr style={{ height: '33px' }}>
                <td className='border border-slate-200 bg-gray-50 p-0'>
                  <button
                    type='button'
                    onClick={addRow}
                    title='행 추가'
                    className='flex h-full w-full cursor-pointer items-center justify-center text-slate-400 transition-colors hover:text-slate-600'
                  >
                    <Plus size={12} />
                  </button>
                </td>
                <td colSpan={HEADERS.length} className='border border-slate-200 bg-white p-0' />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

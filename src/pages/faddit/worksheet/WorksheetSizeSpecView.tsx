import React, { useCallback } from 'react';
import { useImmer } from 'use-immer';
import { Plus, Trash2 } from 'lucide-react';

interface SizeSpec {
  headers: string[];
  rows: string[][];
}

const INITIAL_STATE: SizeSpec = {
  headers: ['', 'XS', 'S', 'M', 'L', 'XL'],
  rows: [
    ['어깨 너비', '36', '37', '38', '40', '42'],
    ['가슴 둘레', '84', '88', '92', '96', '100'],
    ['허리 둘레', '66', '70', '74', '78', '82'],
    ['힙 둘레', '88', '92', '96', '100', '104'],
    ['소매 길이', '58', '59', '60', '61', '62'],
    ['총 길이', '68', '69', '70', '71', '72'],
  ],
};

const emptyRow = (colCount: number): string[] => Array(colCount).fill('');

const HEADER_CELL =
  'border-b border-r border-gray-200 px-2 py-1.5 text-center text-xs font-semibold text-gray-600 outline-none focus:bg-blue-50';
const DATA_CELL =
  'w-full min-w-[80px] border-b border-r border-gray-200 px-2 py-1.5 text-center text-xs text-gray-700 outline-none focus:bg-blue-50';
const ROW_HEADER_CELL =
  'sticky left-8 z-10 min-w-[100px] border-b border-r border-gray-200 bg-gray-50 px-2 py-1.5 text-left text-xs font-medium text-gray-600 outline-none focus:bg-blue-50';

export default function WorksheetSizeSpecView() {
  const [spec, updateSpec] = useImmer<SizeSpec>(INITIAL_STATE);

  const handleHeaderChange = useCallback(
    (colIndex: number, value: string) => {
      updateSpec((draft) => {
        draft.headers[colIndex] = value;
      });
    },
    [updateSpec],
  );

  const handleCellChange = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      updateSpec((draft) => {
        draft.rows[rowIndex][colIndex] = value;
      });
    },
    [updateSpec],
  );

  const addRow = useCallback(() => {
    updateSpec((draft) => {
      draft.rows.push(emptyRow(draft.headers.length));
    });
  }, [updateSpec]);

  const addColumn = useCallback(() => {
    updateSpec((draft) => {
      draft.headers.push('');
      draft.rows.forEach((row) => row.push(''));
    });
  }, [updateSpec]);

  const deleteRow = useCallback(
    (rowIndex: number) => {
      updateSpec((draft) => {
        draft.rows.splice(rowIndex, 1);
      });
    },
    [updateSpec],
  );

  const deleteColumn = useCallback(
    (colIndex: number) => {
      updateSpec((draft) => {
        draft.headers.splice(colIndex, 1);
        draft.rows.forEach((row) => row.splice(colIndex, 1));
      });
    },
    [updateSpec],
  );

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex items-center gap-2 border-b border-gray-100 px-4 py-2'>
        <button
          type='button'
          onClick={addRow}
          className='flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50'
        >
          <Plus size={14} />행 추가
        </button>
        <button
          type='button'
          onClick={addColumn}
          className='flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50'
        >
          <Plus size={14} />열 추가
        </button>
      </div>

      <div className='flex-1 overflow-auto p-4'>
        <table className='border-collapse text-sm'>
          <thead>
            <tr>
              <th className='sticky top-0 left-0 z-30 w-8 bg-gray-50' />
              {spec.headers.map((header, colIndex) => (
                <th key={colIndex} className='sticky top-0 z-20 min-w-[80px] bg-gray-50 p-0'>
                  <div className='group relative'>
                    <input
                      value={header}
                      onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                      placeholder={colIndex === 0 ? '' : '사이즈'}
                      className={`w-full ${HEADER_CELL} ${colIndex === 0 ? 'bg-gray-100' : 'bg-gray-50'}`}
                    />
                    {colIndex > 0 && (
                      <button
                        type='button'
                        onClick={() => deleteColumn(colIndex)}
                        className='absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex'
                      >
                        <Trash2 size={8} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className='sticky top-0 z-20 w-8 bg-gray-50'>
                <button
                  type='button'
                  onClick={addColumn}
                  title='열 추가'
                  className='flex h-full w-full items-center justify-center p-1 text-gray-400 hover:text-gray-600'
                >
                  <Plus size={12} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className='group'>
                <td className='sticky left-0 z-10 bg-gray-50 px-1 text-center'>
                  <button
                    type='button'
                    onClick={() => deleteRow(rowIndex)}
                    title='행 삭제'
                    className='hidden h-5 w-5 items-center justify-center rounded text-gray-300 group-hover:flex hover:text-red-500'
                  >
                    <Trash2 size={10} />
                  </button>
                </td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className='p-0'>
                    <input
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      className={colIndex === 0 ? ROW_HEADER_CELL : DATA_CELL}
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
            <tr>
              <td />
              <td colSpan={spec.headers.length}>
                <button
                  type='button'
                  onClick={addRow}
                  className='flex w-full items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                >
                  <Plus size={12} />행 추가
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

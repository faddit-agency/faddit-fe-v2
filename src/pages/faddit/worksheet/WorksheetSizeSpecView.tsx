import React, { useCallback, useEffect, useState } from 'react';
import { useImmer } from 'use-immer';
import { Plus, Trash2, GripHorizontal, GripVertical } from 'lucide-react';
import {
  DELETE_ACTION_BUTTON_CLASS,
  LEFT_ACTION_REVEAL_CLASS,
  MOVE_ACTION_BUTTON_CLASS,
  RIGHT_ACTION_REVEAL_CLASS,
} from './WorksheetActionButtons';

interface SizeSpec {
  headers: string[];
  rows: string[][];
}

type DragItem =
  | { type: 'row'; index: number }
  | { type: 'column'; index: number }
  | null;

type DragOver =
  | { type: 'row'; index: number; side: 'before' | 'after' }
  | { type: 'column'; index: number; side: 'before' | 'after' }
  | null;

type DropFlash = { type: 'row' | 'column'; index: number; stamp: number } | null;

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

function reorderList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function moveByInsertIndex<T>(items: T[], fromIndex: number, insertIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  const adjustedInsert = fromIndex < insertIndex ? insertIndex - 1 : insertIndex;
  next.splice(adjustedInsert, 0, moved);
  return next;
}

function getFinalIndex(fromIndex: number, insertIndex: number): number {
  return fromIndex < insertIndex ? insertIndex - 1 : insertIndex;
}

const MOTION_TRANSITION =
  'transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease, background-color 180ms ease';

const REORDER_TRANSITION =
  'transform 220ms cubic-bezier(0.2, 0.9, 0.25, 1), box-shadow 180ms ease, opacity 180ms ease, background-color 180ms ease';

const ROW_HEADER_COMPACT_WIDTH = 120;
const ROW_HEADER_EXPANDED_WIDTH = 132;
const ROW_HEADER_COMPACT_PADDING = 12;
const ROW_HEADER_EXPANDED_PADDING = 32;
const DATA_COL_COMPACT_WIDTH = 68;
const DATA_COL_EXPANDED_WIDTH = 78;
const ACTION_COL_WIDTH = 32;
const DATA_HEADER_COMPACT_PADDING = 14;
const DATA_HEADER_EXPANDED_PADDING = 22;

function distributedShift(distance: number, near: number, far: number): number {
  return Math.max(far, near - (distance - 1) * 2);
}

export default function WorksheetSizeSpecView() {
  const [spec, updateSpec] = useImmer<SizeSpec>(INITIAL_STATE);
  const [dragItem, setDragItem] = useState<DragItem>(null);
  const [dragOver, setDragOver] = useState<DragOver>(null);
  const [dropFlash, setDropFlash] = useState<DropFlash>(null);
  const [rowHeaderHoverCount, setRowHeaderHoverCount] = useState(0);
  const [hoveredDataCol, setHoveredDataCol] = useState<number | null>(null);

  const rowHeaderExpanded = rowHeaderHoverCount > 0 || dragItem?.type === 'row';
  const rowHeaderPadding = rowHeaderExpanded
    ? ROW_HEADER_EXPANDED_PADDING
    : ROW_HEADER_COMPACT_PADDING;

  const getDataColWidth = useCallback(
    (colIndex: number) => {
      const isExpanded =
        hoveredDataCol === colIndex ||
        (dragItem?.type === 'column' && dragItem.index === colIndex) ||
        (dragOver?.type === 'column' && dragOver.index === colIndex);
      return isExpanded ? DATA_COL_EXPANDED_WIDTH : DATA_COL_COMPACT_WIDTH;
    },
    [hoveredDataCol, dragItem, dragOver],
  );

  useEffect(() => {
    if (!dropFlash) return;
    const timer = window.setTimeout(() => setDropFlash(null), 320);
    return () => window.clearTimeout(timer);
  }, [dropFlash]);

  const getColumnShift = useCallback(
    (colIndex: number) => {
      if (!dragItem || dragItem.type !== 'column') return 0;
      if (!dragOver || dragOver.type !== 'column') return 0;

      const from = dragItem.index;
      const insertIndex = dragOver.side === 'before' ? dragOver.index : dragOver.index + 1;
      if (colIndex === from) return 0;
      if (from < insertIndex && colIndex > from && colIndex < insertIndex) {
        const distance = insertIndex - colIndex;
        return -distributedShift(distance, 12, 6);
      }
      if (from > insertIndex && colIndex >= insertIndex && colIndex < from) {
        const distance = colIndex - insertIndex + 1;
        return distributedShift(distance, 12, 6);
      }
      return 0;
    },
    [dragItem, dragOver],
  );

  const getRowShift = useCallback(
    (rowIndex: number) => {
      if (!dragItem || dragItem.type !== 'row') return 0;
      if (!dragOver || dragOver.type !== 'row') return 0;

      const from = dragItem.index;
      const insertIndex = dragOver.side === 'before' ? dragOver.index : dragOver.index + 1;
      if (rowIndex === from) return 0;
      if (from < insertIndex && rowIndex > from && rowIndex < insertIndex) {
        const distance = insertIndex - rowIndex;
        return -distributedShift(distance, 9, 4);
      }
      if (from > insertIndex && rowIndex >= insertIndex && rowIndex < from) {
        const distance = rowIndex - insertIndex + 1;
        return distributedShift(distance, 9, 4);
      }
      return 0;
    },
    [dragItem, dragOver],
  );

  const getMotionStyle = useCallback(
    (xShift: number, yShift: number, isDragged: boolean, isTarget: boolean) => ({
      transform: `translate(${xShift}px, ${yShift}px) scale(${isDragged ? 0.985 : 1})`,
      opacity: isDragged ? 0.6 : 1,
      boxShadow: isTarget ? '0 0 0 1px rgba(59,130,246,0.25), 0 8px 20px rgba(59,130,246,0.14)' : 'none',
      transition: REORDER_TRANSITION,
    }),
    [],
  );

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

  const handleDragStart = useCallback((e: React.DragEvent, type: 'row' | 'column', index: number) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${type}:${index}`);
    const dragPreview = document.createElement('div');
    dragPreview.className =
      'rounded-md border border-blue-200 bg-white/95 px-2 py-1 text-xs font-medium text-blue-700 shadow-md';
    dragPreview.textContent = type === 'column' ? '열 이동' : '행 이동';
    dragPreview.style.position = 'fixed';
    dragPreview.style.top = '-1000px';
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 18, 12);
    window.requestAnimationFrame(() => {
      document.body.removeChild(dragPreview);
    });
    setDragItem({ type, index });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragItem(null);
    setDragOver(null);
  }, []);

  const handleColumnDrop = useCallback(
    (targetIndex: number, side: 'before' | 'after') => {
      if (!dragItem || dragItem.type !== 'column') return;
      const insertIndex = side === 'before' ? targetIndex : targetIndex + 1;
      const finalIndex = getFinalIndex(dragItem.index, insertIndex);
      updateSpec((draft) => {
        draft.headers = moveByInsertIndex(draft.headers, dragItem.index, insertIndex);
        draft.rows = draft.rows.map((row) => moveByInsertIndex(row, dragItem.index, insertIndex));
      });
      setDropFlash({ type: 'column', index: finalIndex, stamp: Date.now() });
      setDragItem(null);
      setDragOver(null);
    },
    [dragItem, updateSpec],
  );

  const handleRowDrop = useCallback(
    (targetIndex: number, side: 'before' | 'after') => {
      if (!dragItem || dragItem.type !== 'row') return;
      const insertIndex = side === 'before' ? targetIndex : targetIndex + 1;
      const finalIndex = getFinalIndex(dragItem.index, insertIndex);
      updateSpec((draft) => {
        draft.rows = moveByInsertIndex(draft.rows, dragItem.index, insertIndex);
      });
      setDropFlash({ type: 'row', index: finalIndex, stamp: Date.now() });
      setDragItem(null);
      setDragOver(null);
    },
    [dragItem, updateSpec],
  );

  const setColumnDragOver = useCallback((index: number, side: 'before' | 'after') => {
    setDragOver((prev) => {
      if (prev?.type === 'column' && prev.index === index && prev.side === side) return prev;
      return { type: 'column', index, side };
    });
  }, []);

  const setRowDragOver = useCallback((index: number, side: 'before' | 'after') => {
    setDragOver((prev) => {
      if (prev?.type === 'row' && prev.index === index && prev.side === side) return prev;
      return { type: 'row', index, side };
    });
  }, []);

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex-1 overflow-auto p-4'>
        <div className='relative inline-block overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
          <div className='pointer-events-none absolute inset-0 z-40 rounded-lg border border-slate-200' />
          <table
            className='border-collapse border-spacing-0 bg-white text-sm'
            style={{ width: 'max-content', tableLayout: 'fixed' }}
          >
            <colgroup>
              <col />
              <col span={Math.max(0, spec.headers.length - 1)} />
              <col style={{ width: `${ACTION_COL_WIDTH}px` }} />
            </colgroup>
            <thead>
              <tr>
              <th
                className='relative sticky top-0 left-0 z-30 border-y border-r border-l border-slate-200 bg-gray-50 p-0'
                style={{
                  width: `${rowHeaderExpanded ? ROW_HEADER_EXPANDED_WIDTH : ROW_HEADER_COMPACT_WIDTH}px`,
                  minWidth: `${ROW_HEADER_COMPACT_WIDTH}px`,
                  transition: 'width 240ms ease',
                }}
              >
                <div className='h-[33px] bg-gray-50' />
              </th>
              {spec.headers.slice(1).map((header, visibleIndex) => {
                const colIndex = visibleIndex + 1;
                const isDragOver = dragOver?.type === 'column' && dragOver.index === colIndex;
                const isDragged = dragItem?.type === 'column' && dragItem.index === colIndex;
                const xShift = getColumnShift(colIndex);
                return (
                  <th
                    key={colIndex}
                    className='relative sticky top-0 z-20 border-y border-r border-slate-200 bg-gray-50 p-0'
                    style={{
                      width: `${getDataColWidth(colIndex)}px`,
                      minWidth: `${getDataColWidth(colIndex)}px`,
                      maxWidth: `${getDataColWidth(colIndex)}px`,
                      transition: 'width 240ms ease, min-width 240ms ease, max-width 240ms ease',
                    }}
                    onMouseEnter={() => setHoveredDataCol(colIndex)}
                    onMouseLeave={() =>
                      setHoveredDataCol((prev) => (prev === colIndex ? null : prev))
                    }
                    onDragOver={(e) => {
                      if (dragItem?.type !== 'column') return;
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const side = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
                      setColumnDragOver(colIndex, side);
                    }}
                    onDrop={(e) => {
                      if (dragItem?.type !== 'column') return;
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const side = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
                      handleColumnDrop(colIndex, side);
                    }}
                  >
                    <div className='group relative'>
                      {isDragOver && !isDragged && (
                        <div
                          className='pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 rounded-full bg-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_0_10px_rgba(59,130,246,0.35)]'
                          style={{ left: dragOver?.type === 'column' && dragOver.side === 'after' ? '100%' : 0 }}
                        />
                      )}
                      <input
                        value={header}
                        onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                        placeholder='사이즈'
                        className={`relative z-0 w-full border-0 py-1.5 text-center text-xs font-semibold text-slate-600 outline-none focus:bg-blue-50 ${isDragOver ? 'bg-blue-50/50' : 'bg-transparent'}`}
                        style={{
                          ...getMotionStyle(xShift, 0, isDragged, isDragOver && !isDragged),
                          paddingLeft: `${hoveredDataCol === colIndex ? DATA_HEADER_EXPANDED_PADDING : DATA_HEADER_COMPACT_PADDING}px`,
                          paddingRight: `${hoveredDataCol === colIndex ? DATA_HEADER_EXPANDED_PADDING : DATA_HEADER_COMPACT_PADDING}px`,
                          transition:
                            'padding-left 220ms ease, padding-right 220ms ease, transform 220ms cubic-bezier(0.2, 0.9, 0.25, 1), box-shadow 180ms ease, opacity 180ms ease',
                          boxShadow:
                            dropFlash?.type === 'column' && dropFlash.index === colIndex
                              ? 'inset 0 0 0 1px rgba(59,130,246,0.45), inset 0 0 24px rgba(59,130,246,0.14)'
                              : getMotionStyle(xShift, 0, isDragged, isDragOver && !isDragged).boxShadow,
                        }}
                      />
                      <button
                        type='button'
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'column', colIndex)}
                        onDragEnd={handleDragEnd}
                        className={`${LEFT_ACTION_REVEAL_CLASS} cursor-grab active:cursor-grabbing ${MOVE_ACTION_BUTTON_CLASS}`}
                        title='열 이동'
                      >
                        <GripHorizontal size={12} strokeWidth={2.2} />
                      </button>
                      <button
                        type='button'
                        onClick={() => deleteColumn(colIndex)}
                        className={`${RIGHT_ACTION_REVEAL_CLASS} cursor-pointer ${DELETE_ACTION_BUTTON_CLASS}`}
                        title='열 삭제'
                      >
                        <Trash2 size={11} strokeWidth={2.1} />
                      </button>
                    </div>
                  </th>
                );
              })}
              <th className='relative sticky top-0 z-20 w-8 border-y border-r border-slate-200 bg-gray-50 p-0'>
                <button
                  type='button'
                  onClick={addColumn}
                  title='열 추가'
                  className='flex h-[33px] w-full cursor-pointer items-center justify-center bg-gray-50 p-1 text-slate-400 transition-colors hover:text-slate-600'
                >
                  <Plus size={12} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, rowIndex) => {
              const isDragOver = dragOver?.type === 'row' && dragOver.index === rowIndex;
              const isDraggedRow = dragItem?.type === 'row' && dragItem.index === rowIndex;
              const rowShift = getRowShift(rowIndex);
              return (
                <tr key={rowIndex}>
                  <td
                    className='sticky left-0 z-10 border border-slate-200 bg-white p-0'
                    style={{
                      width: `${rowHeaderExpanded ? ROW_HEADER_EXPANDED_WIDTH : ROW_HEADER_COMPACT_WIDTH}px`,
                      minWidth: `${ROW_HEADER_COMPACT_WIDTH}px`,
                      transition: 'width 240ms ease',
                    }}
                    onDragOver={(e) => {
                      if (dragItem?.type !== 'row') return;
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const side = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                      setRowDragOver(rowIndex, side);
                    }}
                    onDrop={(e) => {
                      if (dragItem?.type !== 'row') return;
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const side = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                      handleRowDrop(rowIndex, side);
                    }}
                  >
                    <div
                      className='group relative'
                      onMouseEnter={() => setRowHeaderHoverCount((v) => v + 1)}
                      onMouseLeave={() => setRowHeaderHoverCount((v) => Math.max(0, v - 1))}
                    >
                      {isDragOver && !isDraggedRow && (
                        <div
                          className='pointer-events-none absolute right-0 left-0 z-20 h-0.5 rounded-full bg-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_0_10px_rgba(59,130,246,0.35)]'
                          style={{ top: dragOver?.type === 'row' && dragOver.side === 'after' ? '100%' : 0 }}
                        />
                      )}
                      <input
                        value={row[0]}
                        onChange={(e) => handleCellChange(rowIndex, 0, e.target.value)}
                        className={`relative z-0 w-full border-0 py-1.5 text-left text-xs font-medium text-slate-600 outline-none focus:bg-blue-50 ${isDragOver ? 'bg-blue-50/50' : 'bg-gray-50'}`}
                        style={{
                          ...getMotionStyle(0, rowShift, isDraggedRow, isDragOver && !isDraggedRow),
                          paddingLeft: `${rowHeaderPadding}px`,
                          paddingRight: `${rowHeaderPadding}px`,
                          transition:
                            'padding-left 240ms ease, padding-right 240ms ease, background-color 200ms ease, transform 220ms cubic-bezier(0.2, 0.9, 0.25, 1), box-shadow 180ms ease, opacity 180ms ease',
                          boxShadow:
                            dropFlash?.type === 'row' && dropFlash.index === rowIndex
                              ? 'inset 0 0 0 1px rgba(59,130,246,0.45), inset 0 0 24px rgba(59,130,246,0.14)'
                              : getMotionStyle(0, rowShift, isDraggedRow, isDragOver && !isDraggedRow)
                                  .boxShadow,
                        }}
                      />
                      <button
                        type='button'
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'row', rowIndex)}
                        onDragEnd={handleDragEnd}
                        className={`${LEFT_ACTION_REVEAL_CLASS} cursor-grab active:cursor-grabbing ${MOVE_ACTION_BUTTON_CLASS}`}
                        title='행 이동'
                      >
                        <GripVertical size={12} strokeWidth={2.2} />
                      </button>
                      <button
                        type='button'
                        onClick={() => deleteRow(rowIndex)}
                        className={`${RIGHT_ACTION_REVEAL_CLASS} cursor-pointer ${DELETE_ACTION_BUTTON_CLASS}`}
                        title='행 삭제'
                      >
                        <Trash2 size={11} strokeWidth={2.1} />
                      </button>
                    </div>
                  </td>

                  {row.slice(1).map((cell, visibleColIndex) => {
                    const colIndex = visibleColIndex + 1;
                    const isDraggedColumn = dragItem?.type === 'column' && dragItem.index === colIndex;
                    const isColumnDropTarget =
                      dragOver?.type === 'column' && dragOver.index === colIndex && !isDraggedColumn;
                    const xShift = getColumnShift(colIndex);
                    return (
                      <td
                        key={colIndex}
                        className='border border-slate-200 p-0'
                        style={{
                          width: `${getDataColWidth(colIndex)}px`,
                          minWidth: `${getDataColWidth(colIndex)}px`,
                          maxWidth: `${getDataColWidth(colIndex)}px`,
                          transition: 'width 240ms ease, min-width 240ms ease, max-width 240ms ease',
                        }}
                      >
                        <input
                          value={cell}
                          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                          className='w-full border-0 bg-transparent px-1.5 py-1.5 text-center text-xs text-slate-700 outline-none focus:bg-blue-50'
                          style={{
                            ...getMotionStyle(
                              xShift,
                              rowShift,
                              isDraggedRow || isDraggedColumn,
                              (isDragOver && !isDraggedRow) || isColumnDropTarget,
                            ),
                            boxShadow:
                              (dropFlash?.type === 'row' && dropFlash.index === rowIndex) ||
                              (dropFlash?.type === 'column' && dropFlash.index === colIndex)
                                ? 'inset 0 0 0 1px rgba(59,130,246,0.25), inset 0 0 20px rgba(59,130,246,0.1)'
                                : getMotionStyle(
                                    xShift,
                                    rowShift,
                                    isDraggedRow || isDraggedColumn,
                                    (isDragOver && !isDraggedRow) || isColumnDropTarget,
                                  ).boxShadow,
                          }}
                        />
                      </td>
                    );
                  })}
                  <td className='w-8 border border-slate-200 bg-white p-0' />
                </tr>
              );
            })}
            <tr style={{ height: '33px' }}>
              <td
                className='sticky left-0 z-10 border border-slate-200 bg-gray-50 p-0'
                style={{
                  width: `${rowHeaderExpanded ? ROW_HEADER_EXPANDED_WIDTH : ROW_HEADER_COMPACT_WIDTH}px`,
                  minWidth: `${ROW_HEADER_COMPACT_WIDTH}px`,
                  transition: 'width 240ms ease',
                }}
              >
                <button
                  type='button'
                  onClick={addRow}
                  title='행 추가'
                  className='flex h-full w-full cursor-pointer items-center justify-center bg-gray-50 p-1 text-slate-400 transition-colors hover:text-slate-600'
                >
                  <Plus size={12} />
                </button>
              </td>
              <td
                colSpan={Math.max(1, spec.headers.length - 1)}
                className='border border-slate-200 bg-white p-0'
              />
              <td className='w-8 border border-slate-200 bg-white p-0' />
            </tr>
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

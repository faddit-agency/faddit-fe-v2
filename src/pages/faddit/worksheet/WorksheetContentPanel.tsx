import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GripHorizontal, Minus, PenLine, Plus, Scissors, Table, Trash2 } from 'lucide-react';
import ToggleButton from '../../../components/atoms/ToggleButton';
import WorksheetSketchView from './WorksheetSketchView';
import WorksheetPatternView from './WorksheetPatternView';
import WorksheetSizeSpecView from './WorksheetSizeSpecView';
import {
  DELETE_ACTION_BUTTON_CLASS,
  LEFT_ACTION_REVEAL_CLASS,
  MOVE_ACTION_BUTTON_CLASS,
  RIGHT_ACTION_REVEAL_CLASS,
} from './WorksheetActionButtons';

type PageType = 'sketch' | 'pattern' | 'size-spec';

interface WorksheetPage {
  id: string;
  label: string;
  type: PageType;
}

const PAGE_TYPE_META: Record<
  PageType,
  { icon: React.ElementType; iconColor: string; bgColor: string; defaultLabel: string }
> = {
  sketch: {
    icon: PenLine,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-100',
    defaultLabel: '도식화',
  },
  pattern: {
    icon: Scissors,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-100',
    defaultLabel: '패턴',
  },
  'size-spec': {
    icon: Table,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-100',
    defaultLabel: '사이즈 스펙',
  },
};

const THUMB_W = 120;
const THUMB_H = 80;

const INITIAL_PAGES: WorksheetPage[] = [
  { id: '1', label: '도식화', type: 'sketch' },
  { id: '2', label: '패턴', type: 'pattern' },
  { id: '3', label: '사이즈 스펙', type: 'size-spec' },
];

const makePage = (type: PageType, sameTypeCount: number): WorksheetPage => {
  const meta = PAGE_TYPE_META[type];
  return {
    id: crypto.randomUUID(),
    label: sameTypeCount > 0 ? `${meta.defaultLabel} ${sameTypeCount + 1}` : meta.defaultLabel,
    type,
  };
};

export default function WorksheetContentPanel() {
  const [pages, setPages] = useState<WorksheetPage[]>(INITIAL_PAGES);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [pageToggle, setPageToggle] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [dragPageId, setDragPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const selectedPage = pages.find((p) => p.id === selectedId) ?? pages[0];

  useEffect(() => {
    if (!addMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [addMenuOpen]);

  const handleAddPage = useCallback(
    (type: PageType) => {
      const sameTypeCount = pages.filter((p) => p.type === type).length;
      const newPage = makePage(type, sameTypeCount);
      setPages((prev) => [...prev, newPage]);
      setSelectedId(newPage.id);
      setAddMenuOpen(false);
    },
    [pages],
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (pages.length <= 1) return;
      const nextPages = pages.filter((p) => p.id !== pageId);
      setPages(nextPages);
      if (selectedId === pageId && nextPages.length > 0) {
        setSelectedId(nextPages[0].id);
      }
    },
    [pages, selectedId],
  );

  const handlePageDragStart = useCallback((pageId: string) => {
    setDragPageId(pageId);
  }, []);

  const handlePageDrop = useCallback(
    (targetId: string) => {
      if (!dragPageId || dragPageId === targetId) return;
      setPages((prev) => {
        const from = prev.findIndex((p) => p.id === dragPageId);
        const to = prev.findIndex((p) => p.id === targetId);
        if (from < 0 || to < 0) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      setDragPageId(null);
      setDragOverPageId(null);
    },
    [dragPageId],
  );

  const handlePageDragEnd = useCallback(() => {
    setDragPageId(null);
    setDragOverPageId(null);
  }, []);

  return (
    <section className='flex h-full min-w-0 flex-1 flex-col gap-2'>
      <div className='relative min-h-0 flex-1 overflow-hidden rounded-md bg-white'>
        {pages.map((page) => (
          <div
            key={page.id}
            className={`absolute inset-0 ${page.id === selectedId ? 'block' : 'hidden'}`}
          >
            {page.type === 'sketch' && <WorksheetSketchView zoom={zoom} onZoomChange={setZoom} />}
            {page.type === 'pattern' && <WorksheetPatternView />}
            {page.type === 'size-spec' && <WorksheetSizeSpecView />}
          </div>
        ))}
      </div>

      <div className='flex shrink-0 flex-col rounded-md bg-white px-4 py-3'>
        <div
          className='overflow-hidden transition-[max-height,margin] duration-300 ease-in-out'
          style={{
            maxHeight: pageToggle ? THUMB_H + 16 : 0,
            marginBottom: pageToggle ? 8 : 0,
          }}
        >
          <div
            className='flex items-center gap-2 transition-opacity duration-300 ease-in-out'
            style={{ opacity: pageToggle ? 1 : 0 }}
          >
            {pages.map((page, idx) => {
              const meta = PAGE_TYPE_META[page.type];
              const Icon = meta.icon;
              const isDragged = dragPageId === page.id;
              const isDragOver = dragOverPageId === page.id;
              return (
                <div
                  key={page.id}
                  className='group relative'
                  onDragOver={(e) => {
                    if (!dragPageId) return;
                    e.preventDefault();
                    setDragOverPageId(page.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handlePageDrop(page.id);
                  }}
                  onDragLeave={() => {
                    setDragOverPageId((prev) => (prev === page.id ? null : prev));
                  }}
                >
                  <button
                    type='button'
                    onClick={() => setSelectedId(page.id)}
                    className={`relative flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg bg-white transition-all ${
                      selectedId === page.id
                        ? 'border-2 border-gray-700'
                        : 'border border-gray-200 hover:border-gray-300'
                    } ${isDragged ? 'opacity-55' : ''} ${isDragOver ? 'ring-2 ring-blue-200' : ''}`}
                    style={{ width: THUMB_W, height: THUMB_H }}
                  >
                    <span className='absolute top-1 right-1.5 text-[10px] text-gray-400'>
                      {idx + 1}
                    </span>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.bgColor}`}
                    >
                      <Icon size={14} className={meta.iconColor} />
                    </div>
                    <span className='text-xs text-gray-700'>{page.label}</span>
                  </button>

                  <button
                    type='button'
                    draggable
                    onDragStart={() => handlePageDragStart(page.id)}
                    onDragEnd={handlePageDragEnd}
                    onClick={(e) => e.stopPropagation()}
                    className={`${LEFT_ACTION_REVEAL_CLASS} cursor-grab active:cursor-grabbing ${MOVE_ACTION_BUTTON_CLASS}`}
                    title='페이지 이동'
                  >
                    <GripHorizontal size={12} strokeWidth={2.2} />
                  </button>

                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePage(page.id);
                    }}
                    className={`${RIGHT_ACTION_REVEAL_CLASS} cursor-pointer ${DELETE_ACTION_BUTTON_CLASS}`}
                    title='페이지 삭제'
                  >
                    <Trash2 size={11} strokeWidth={2.1} />
                  </button>
                </div>
              );
            })}

            <div className='relative' ref={addMenuRef}>
              <button
                type='button'
                onClick={() => setAddMenuOpen((v) => !v)}
                className='flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600'
                aria-label='페이지 추가'
                style={{ width: THUMB_W, height: THUMB_H }}
              >
                <span className='text-2xl leading-none'>+</span>
              </button>

              {addMenuOpen && (
                <div className='absolute bottom-full left-0 z-50 mb-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg'>
                  {(
                    Object.entries(PAGE_TYPE_META) as [
                      PageType,
                      (typeof PAGE_TYPE_META)[PageType],
                    ][]
                  ).map(([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        type='button'
                        onClick={() => handleAddPage(type)}
                        className='flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50'
                      >
                        <Icon size={14} className={meta.iconColor} />
                        {meta.defaultLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='flex w-full items-center justify-end gap-3'>
          <ToggleButton
            label='페이지'
            checked={pageToggle}
            onChange={() => setPageToggle((v) => !v)}
          />

          {selectedPage?.type === 'sketch' && (
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={() => setZoom((z) => Math.max(10, z - 10))}
                className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-600 transition-all duration-300 hover:bg-gray-100'
              >
                <Minus size={14} />
              </button>
              <span className='min-w-[3.5rem] text-center text-sm text-gray-800'>{zoom}%</span>
              <button
                type='button'
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-600 transition-all duration-300 hover:bg-gray-100'
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

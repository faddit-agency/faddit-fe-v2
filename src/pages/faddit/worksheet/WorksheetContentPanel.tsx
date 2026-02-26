import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, PenLine, Pencil, Plus, Scissors, Table, Trash2 } from 'lucide-react';
import ToggleButton from '../../../components/atoms/ToggleButton';
import WorksheetSketchView from './WorksheetSketchView';
import WorksheetSizeSpecView from './WorksheetSizeSpecView';
import { useCanvas } from './CanvasProvider';
import type {
  WorksheetEditorDocument,
  WorksheetEditorPage,
  WorksheetEditorPageType,
} from './worksheetEditorSchema';

type PageType = WorksheetEditorPageType;
type WorksheetPage = WorksheetEditorPage;

interface WorksheetContentPanelProps {
  editorDocument: WorksheetEditorDocument;
  onDocumentChange: React.Dispatch<React.SetStateAction<WorksheetEditorDocument>>;
  readOnly?: boolean;
  autosaveEnabled: boolean;
  onToggleAutosave: () => void;
  guideModeEnabled: boolean;
  onToggleGuideMode: () => void;
}

const GUIDE_MANUAL_ITEMS: Array<{ title: string; shortcut: string; usage: string }> = [
  { title: '선택 모드', shortcut: 'V', usage: '객체 선택/이동/크기 조절' },
  { title: '브러쉬', shortcut: 'B', usage: '자유 드로잉 경로 생성' },
  { title: '펜툴', shortcut: 'P', usage: '클릭은 직선, 드래그는 곡선 앵커 생성' },
  { title: '텍스트', shortcut: 'T', usage: '캔버스 클릭으로 텍스트 박스 생성' },
  { title: '사각형', shortcut: 'R', usage: '드래그로 사각형 생성' },
  { title: '원', shortcut: 'O', usage: '드래그로 원/타원 생성' },
  { title: '삼각형', shortcut: 'Y', usage: '드래그로 삼각형 생성' },
  { title: '선', shortcut: 'L', usage: '드래그로 직선 생성' },
  { title: '화살표', shortcut: '-', usage: '드래그로 화살표 생성' },
  { title: '패스 편집', shortcut: 'A', usage: '선택한 패스를 직접 편집(더블클릭과 동일)' },
  { title: '그룹화', shortcut: 'Cmd/Ctrl+G', usage: '선택 객체 그룹화' },
  { title: '그룹 해제', shortcut: 'Cmd/Ctrl+Alt+G', usage: '그룹 해제' },
  { title: '복사/붙여넣기', shortcut: 'Cmd/Ctrl+C, V', usage: '선택 객체 복사/붙여넣기' },
  { title: '실행 취소/다시 실행', shortcut: 'Cmd/Ctrl+Z, Y', usage: '최근 작업 되돌리기/복원' },
  { title: '팬', shortcut: 'Space + Drag', usage: '캔버스 이동(패닝)' },
  {
    title: '이동 축 고정',
    shortcut: 'Shift + Drag',
    usage: '드래그 중 수평/수직 한 축으로 이동 고정',
  },
  {
    title: '스마트 가이드',
    shortcut: '-',
    usage: '정렬 지시선 + 끝점/중간/중심 구분 라벨 표시',
  },
  {
    title: '거리 보조선',
    shortcut: 'Alt/Cmd (Hold)',
    usage: '선택 요소와 주변 요소 거리(px) 표시',
  },
  { title: '키보드 이동', shortcut: '↑ ↓ ← →', usage: '선택 요소를 방향키로 미세 이동' },
  { title: '각도 스냅', shortcut: 'Shift', usage: '선/펜 핸들 각도 스냅' },
  { title: '펜 비대칭 핸들', shortcut: 'Alt + Drag', usage: '펜 핸들을 한쪽만 조절' },
  { title: '펜 앵커 삭제', shortcut: 'Backspace', usage: '마지막 펜 앵커 제거' },
];

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
const PAGE_CARD_TOTAL_H = 112;

const ADDABLE_PAGE_TYPES: PageType[] = ['sketch', 'pattern'];

const PAGE_TYPE_ORDER: Record<PageType, number> = {
  sketch: 0,
  pattern: 1,
  'size-spec': 2,
};

const PAGE_TYPE_CHIP_CLASS: Record<PageType, string> = {
  sketch: 'bg-violet-100 text-violet-700',
  pattern: 'bg-gray-200 text-gray-700',
  'size-spec': 'bg-indigo-100 text-indigo-700',
};

function sortPagesByType(nextPages: WorksheetPage[]): WorksheetPage[] {
  return [...nextPages].sort((a, b) => PAGE_TYPE_ORDER[a.type] - PAGE_TYPE_ORDER[b.type]);
}

function isCanvasPageType(type: PageType): boolean {
  return type === 'sketch' || type === 'pattern';
}

const makePage = (type: PageType, sameTypeCount: number): WorksheetPage => {
  const meta = PAGE_TYPE_META[type];
  return {
    id: crypto.randomUUID(),
    label: sameTypeCount > 0 ? `${meta.defaultLabel} ${sameTypeCount + 1}` : meta.defaultLabel,
    type,
  };
};

export default function WorksheetContentPanel({
  editorDocument,
  onDocumentChange,
  readOnly = false,
  autosaveEnabled,
  onToggleAutosave,
  guideModeEnabled,
  onToggleGuideMode,
}: WorksheetContentPanelProps) {
  const pages = editorDocument.pages;
  const selectedId = editorDocument.activePageId;
  const pageToggle = editorDocument.pageToggle;
  const zoom = editorDocument.zoom;

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addMenuPanelRef = useRef<HTMLDivElement>(null);
  const [addMenuPosition, setAddMenuPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const previousSelectedIdRef = useRef<string>(selectedId);
  const sketchPagesRef = useRef(editorDocument.sketchPages);
  const lastLoadedRef = useRef<{
    pageId: string | null;
    json: string | null;
    session: string | null;
  }>({
    pageId: null,
    json: null,
    session: null,
  });

  const { canvasRef, canvasSession, exportCanvasJson, importCanvasJson, clearCanvas } = useCanvas();
  const orderedPages = useMemo(() => sortPagesByType(pages), [pages]);
  const protectedPageIds = useMemo(() => {
    const firstSketchPageId = pages.find((page) => page.type === 'sketch')?.id ?? null;
    const firstPatternPageId = pages.find((page) => page.type === 'pattern')?.id ?? null;

    return new Set(
      [firstSketchPageId, firstPatternPageId].filter((id): id is string => Boolean(id)),
    );
  }, [pages]);

  const selectedPage = pages.find((p) => p.id === selectedId) ?? pages[0];

  useEffect(() => {
    sketchPagesRef.current = editorDocument.sketchPages;
  }, [editorDocument.sketchPages]);

  const updateDocument = useCallback(
    (updater: (prev: WorksheetEditorDocument) => WorksheetEditorDocument) => {
      onDocumentChange((prev) => updater(prev));
    },
    [onDocumentChange],
  );

  const persistSketchPageSnapshot = useCallback(
    (pageId: string | null | undefined) => {
      if (!pageId) return;

      const targetPage = pages.find((page) => page.id === pageId);
      if (!targetPage || !isCanvasPageType(targetPage.type)) {
        return;
      }

      const json = exportCanvasJson();
      if (!json) return;

      const canvas = canvasRef.current;
      const thumbnail = canvas
        ? canvas.toDataURL({
            format: 'png',
            multiplier: 1,
          })
        : null;

      updateDocument((prev) => {
        const sameSketchJson = prev.sketchPages[pageId] === json;
        const sameThumbnail = !thumbnail || prev.pageThumbnails[pageId] === thumbnail;
        if (sameSketchJson && sameThumbnail) {
          return prev;
        }

        const nextThumbnails = thumbnail
          ? {
              ...prev.pageThumbnails,
              [pageId]: thumbnail,
            }
          : prev.pageThumbnails;

        return {
          ...prev,
          sketchPages: {
            ...prev.sketchPages,
            [pageId]: json,
          },
          pageThumbnails: nextThumbnails,
        };
      });
    },
    [pages, canvasRef, exportCanvasJson, updateDocument],
  );

  const loadSelectedSketchPage = useCallback(async () => {
    const sessionKey = String(canvasSession ?? '');

    if (!selectedPage) {
      clearCanvas();
      lastLoadedRef.current = { pageId: null, json: null, session: sessionKey };
      return;
    }

    if (!isCanvasPageType(selectedPage.type)) {
      clearCanvas();
      lastLoadedRef.current = { pageId: selectedPage.id, json: null, session: sessionKey };
      return;
    }

    const savedJson = sketchPagesRef.current[selectedPage.id];

    if (
      lastLoadedRef.current.pageId === selectedPage.id &&
      lastLoadedRef.current.json === (savedJson ?? null) &&
      lastLoadedRef.current.session === sessionKey
    ) {
      return;
    }

    if (!savedJson) {
      clearCanvas();
      lastLoadedRef.current = { pageId: selectedPage.id, json: null, session: sessionKey };
      return;
    }

    await importCanvasJson(savedJson);
    lastLoadedRef.current = { pageId: selectedPage.id, json: savedJson, session: sessionKey };
  }, [selectedPage, importCanvasJson, clearCanvas, canvasSession]);

  useEffect(() => {
    if (!selectedPage) return;

    const prev = previousSelectedIdRef.current;
    if (prev !== selectedId) {
      persistSketchPageSnapshot(prev);
    }

    previousSelectedIdRef.current = selectedId;

    void loadSelectedSketchPage();
  }, [selectedId, selectedPage, persistSketchPageSnapshot, loadSelectedSketchPage, canvasSession]);

  useEffect(() => {
    return () => {
      persistSketchPageSnapshot(previousSelectedIdRef.current);
    };
  }, [persistSketchPageSnapshot]);

  useEffect(() => {
    if (!selectedPage || !isCanvasPageType(selectedPage.type)) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let timer: number | null = null;
    const schedulePersist = () => {
      if (timer) {
        window.clearTimeout(timer);
      }

      timer = window.setTimeout(() => {
        timer = null;
        persistSketchPageSnapshot(selectedPage.id);
      }, 400);
    };

    canvas.on('object:added', schedulePersist);
    canvas.on('object:modified', schedulePersist);
    canvas.on('object:removed', schedulePersist);
    canvas.on('path:created', schedulePersist);

    return () => {
      canvas.off('object:added', schedulePersist);
      canvas.off('object:modified', schedulePersist);
      canvas.off('object:removed', schedulePersist);
      canvas.off('path:created', schedulePersist);

      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [canvasRef, selectedPage, persistSketchPageSnapshot, canvasSession]);

  useEffect(() => {
    if (!addMenuOpen) return;

    const triggerRect = addMenuRef.current?.getBoundingClientRect();
    if (triggerRect) {
      setAddMenuPosition({
        left: triggerRect.left,
        top: triggerRect.top - 6,
      });
    }

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = !!addMenuRef.current?.contains(target);
      const inMenu = !!addMenuPanelRef.current?.contains(target);
      if (!inTrigger && !inMenu) {
        setAddMenuOpen(false);
      }
    };

    const closeOnViewportChange = () => {
      setAddMenuOpen(false);
    };

    document.addEventListener('mousedown', handler);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);

    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [addMenuOpen]);

  const handleAddPage = useCallback(
    (type: PageType) => {
      if (readOnly) return;
      const sameTypeCount = pages.filter((p) => p.type === type).length;
      const newPage = makePage(type, sameTypeCount);

      updateDocument((prev) => {
        const nextPages = sortPagesByType([...prev.pages, newPage]);
        return {
          ...prev,
          pages: nextPages,
          activePageId: newPage.id,
        };
      });

      setAddMenuOpen(false);
    },
    [pages, readOnly, updateDocument],
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (readOnly) return;
      if (pages.length <= 1) return;
      if (protectedPageIds.has(pageId)) return;

      if (pageId === selectedId) {
        persistSketchPageSnapshot(pageId);
      }

      updateDocument((prev) => {
        const nextPages = prev.pages.filter((page) => page.id !== pageId);
        const nextActivePageId =
          prev.activePageId === pageId
            ? (nextPages[0]?.id ?? prev.activePageId)
            : prev.activePageId;

        const nextSketchPages = { ...prev.sketchPages };
        delete nextSketchPages[pageId];

        const nextThumbnails = { ...prev.pageThumbnails };
        delete nextThumbnails[pageId];

        return {
          ...prev,
          pages: sortPagesByType(nextPages),
          activePageId: nextActivePageId,
          sketchPages: nextSketchPages,
          pageThumbnails: nextThumbnails,
        };
      });
    },
    [pages, protectedPageIds, readOnly, selectedId, persistSketchPageSnapshot, updateDocument],
  );

  const startPageLabelEdit = useCallback((page: WorksheetPage) => {
    setEditingPageId(page.id);
    setEditingName(page.label);
  }, []);

  const commitPageLabelEdit = useCallback(() => {
    if (!editingPageId) return;
    const nextLabel = editingName.trim();
    if (!nextLabel) {
      setEditingPageId(null);
      setEditingName('');
      return;
    }

    updateDocument((prev) => ({
      ...prev,
      pages: prev.pages.map((page) =>
        page.id === editingPageId
          ? {
              ...page,
              label: nextLabel,
            }
          : page,
      ),
    }));

    setEditingPageId(null);
    setEditingName('');
  }, [editingName, editingPageId, updateDocument]);

  return (
    <section className='flex h-full min-w-0 flex-1 flex-col gap-2'>
      <div className='relative min-h-0 flex-1 overflow-hidden rounded-md'>
        {!selectedPage && <div className='absolute inset-0' />}
        {selectedPage && isCanvasPageType(selectedPage.type) && (
          <div className='absolute inset-0'>
            <WorksheetSketchView
              zoom={zoom}
              onZoomChange={(nextZoom) => {
                updateDocument((prev) => ({ ...prev, zoom: nextZoom }));
              }}
            />
          </div>
        )}
        {selectedPage?.type === 'size-spec' && (
          <div className='absolute inset-0'>
            <WorksheetSizeSpecView />
          </div>
        )}
      </div>

      <div className='relative z-[120] flex w-full min-w-0 shrink-0 items-end gap-3 rounded-md pt-0 pr-0 pb-0 pl-4 xl:px-4 xl:py-3'>
        <div className='min-w-0 flex-1'>
          <div
            className='w-full min-w-0 transition-[max-height,margin] duration-300 ease-in-out'
            style={{
              maxHeight: pageToggle ? PAGE_CARD_TOTAL_H + 34 : 0,
              overflow: pageToggle ? 'visible' : 'hidden',
            }}
          >
            <div
              className='w-full min-w-0 transition-opacity duration-300 ease-in-out'
              style={{ opacity: pageToggle ? 1 : 0 }}
            >
              <div className='flex w-full min-w-0 items-start gap-2'>
                <div className='w-full min-w-0 flex-1 overflow-x-auto overflow-y-hidden'>
                  <div className='flex w-max items-start gap-2 pb-1'>
                    {orderedPages.map((page, idx) => {
                      const meta = PAGE_TYPE_META[page.type];
                      const isEditingName = editingPageId === page.id;
                      const thumbnail = editorDocument.pageThumbnails[page.id];
                      const isProtectedPage = protectedPageIds.has(page.id);
                      return (
                        <div key={page.id} className='relative flex shrink-0 flex-col gap-1'>
                          <div
                            className='group/thumb relative'
                            style={{ width: THUMB_W, height: THUMB_H }}
                          >
                            <button
                              type='button'
                              onClick={() => {
                                if (readOnly) return;
                                updateDocument((prev) => ({ ...prev, activePageId: page.id }));
                              }}
                              className={`relative h-full w-full cursor-pointer overflow-hidden rounded-md bg-white transition-all ${
                                selectedId === page.id
                                  ? 'border-2 border-violet-500'
                                  : 'border border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <span
                                className={`absolute top-2 left-2 z-10 rounded-full px-2 py-0.5 text-[11px] font-semibold ${PAGE_TYPE_CHIP_CLASS[page.type]}`}
                              >
                                {meta.defaultLabel}
                              </span>
                              <span className='absolute right-2 bottom-2 z-10 text-[10px] leading-none font-semibold text-gray-800'>
                                {idx + 1}
                              </span>

                              {thumbnail && (
                                <img
                                  src={thumbnail}
                                  alt={`${page.label} 썸네일`}
                                  className='h-full w-full object-cover'
                                />
                              )}
                            </button>

                            {!isProtectedPage && (
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePage(page.id);
                                }}
                                className='absolute top-1/2 right-1.5 z-30 flex h-5 w-6 -translate-y-1/2 translate-x-3 scale-95 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-500 opacity-0 shadow-sm transition-all duration-300 ease-out will-change-transform group-hover/thumb:translate-x-0 group-hover/thumb:scale-100 group-hover/thumb:opacity-100 hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95'
                                title='페이지 삭제'
                              >
                                <Trash2 size={11} strokeWidth={2.1} />
                              </button>
                            )}
                          </div>

                          <div className='group/title relative h-7 w-full'>
                            {isEditingName ? (
                              <div className='absolute inset-0 flex items-center gap-1'>
                                <input
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      commitPageLabelEdit();
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingPageId(null);
                                      setEditingName('');
                                    }
                                  }}
                                  onBlur={commitPageLabelEdit}
                                  className='form-input h-7 min-w-0 flex-1 px-2 text-xs'
                                  autoFocus
                                />
                                <button
                                  type='button'
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={commitPageLabelEdit}
                                  className='flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100'
                                  title='시트명 저장'
                                >
                                  <Check size={13} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className='absolute inset-0 flex items-center justify-center px-2 transition-all duration-300 ease-out group-hover/title:pr-8'>
                                  <p className='w-full truncate text-center text-base font-semibold text-gray-800'>
                                    {page.label}
                                  </p>
                                </div>
                                <button
                                  type='button'
                                  onClick={() => startPageLabelEdit(page)}
                                  className='absolute top-1/2 right-0 flex h-6 w-6 -translate-y-1/2 translate-x-1 items-center justify-center rounded-md text-gray-500 opacity-0 transition-all duration-300 ease-out group-hover/title:translate-x-0 group-hover/title:opacity-100 hover:bg-gray-100 hover:text-gray-700'
                                  title='시트명 수정'
                                >
                                  <Pencil size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div className='relative flex h-[112px] shrink-0 items-start' ref={addMenuRef}>
                      <button
                        type='button'
                        disabled={readOnly}
                        onClick={() => setAddMenuOpen((v) => !v)}
                        className='flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
                        aria-label='페이지 추가'
                        style={{ width: THUMB_W, height: THUMB_H }}
                      >
                        <span className='text-2xl leading-none'>+</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {addMenuOpen && !readOnly && addMenuPosition && (
          <div
            ref={addMenuPanelRef}
            className='fixed z-[260] w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg'
            style={{
              left: addMenuPosition.left,
              top: addMenuPosition.top,
              transform: 'translateY(-100%)',
            }}
          >
            {ADDABLE_PAGE_TYPES.map((type) => {
              const meta = PAGE_TYPE_META[type];
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

        <div className='flex shrink-0 items-center gap-3'>
          <div className='shrink-0'>
            <ToggleButton
              label='단축키 가이드'
              checked={guideModeEnabled}
              onChange={() => {
                if (readOnly) return;
                onToggleGuideMode();
              }}
            />
          </div>

          <div className='shrink-0'>
            <ToggleButton
              label='자동저장'
              checked={autosaveEnabled}
              onChange={() => {
                if (readOnly) return;
                onToggleAutosave();
              }}
            />
          </div>

          <div className='shrink-0'>
            <ToggleButton
              label='페이지'
              checked={pageToggle}
              onChange={() => {
                if (readOnly) return;
                updateDocument((prev) => ({ ...prev, pageToggle: !prev.pageToggle }));
              }}
            />
          </div>

          {selectedPage && isCanvasPageType(selectedPage.type) && (
            <div className='flex shrink-0 items-center gap-1'>
              <button
                type='button'
                onClick={() => {
                  if (readOnly) return;
                  updateDocument((prev) => ({ ...prev, zoom: Math.max(10, prev.zoom - 10) }));
                }}
                className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-600 transition-all duration-300 hover:bg-gray-100'
              >
                <Minus size={14} />
              </button>
              <span className='min-w-[3.5rem] text-center text-sm text-gray-800'>{zoom}%</span>
              <button
                type='button'
                onClick={() => {
                  if (readOnly) return;
                  updateDocument((prev) => ({ ...prev, zoom: Math.min(200, prev.zoom + 10) }));
                }}
                className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-600 transition-all duration-300 hover:bg-gray-100'
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {guideModeEnabled && (
        <aside className='pointer-events-auto fixed top-[72px] right-3 z-[240] w-[320px] rounded-xl border border-gray-200 bg-white/70 p-3 opacity-70 shadow-lg backdrop-blur-[2px] transition-opacity duration-200 hover:opacity-100'>
          <h3 className='mb-2 text-sm font-semibold text-gray-800'>단축키 가이드</h3>
          <div className='max-h-[70vh] overflow-y-auto pr-1'>
            <div className='space-y-1.5'>
              {GUIDE_MANUAL_ITEMS.map((item) => (
                <div
                  key={`${item.title}-${item.shortcut}`}
                  className='rounded-md bg-white/70 px-2 py-1.5'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-xs font-semibold text-gray-800'>{item.title}</span>
                    <span className='rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600'>
                      {item.shortcut}
                    </span>
                  </div>
                  <p className='mt-1 text-[11px] leading-4 text-gray-600'>{item.usage}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}

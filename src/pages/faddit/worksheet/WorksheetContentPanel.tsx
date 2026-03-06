import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Minus, PenLine, Pencil, Plus, Scissors, Table, Tag, Trash2 } from 'lucide-react';
import ToggleButton from '../../../components/atoms/ToggleButton';
import WorksheetSketchView from './WorksheetSketchView';
import WorksheetSizeSpecView from './WorksheetSizeSpecView';
import { useCanvas } from './CanvasProvider';
import type {
  WorksheetCanvasSpec,
  WorksheetEditorDocument,
  WorksheetEditorPage,
  WorksheetEditorPageType,
} from './worksheetEditorSchema';
import {
  createCanvasSpec,
  getDefaultCanvasSpecForPageType,
  isWorksheetCanvasPageType,
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
  { title: '저장', shortcut: 'Cmd/Ctrl+S', usage: '현재 편집 상태를 저장' },
  {
    title: '실행 취소/다시 실행',
    shortcut: 'Cmd/Ctrl+Z, Cmd/Ctrl+Y, Cmd/Ctrl+Shift+Z',
    usage: '최근 작업 되돌리기/복원',
  },
  { title: '복사/붙여넣기', shortcut: 'Cmd/Ctrl+C, V', usage: '선택 객체 복사/붙여넣기' },
  { title: '삭제', shortcut: 'Delete / Backspace', usage: '선택 객체 삭제' },
  { title: '선택 모드', shortcut: 'V', usage: '객체 선택/이동/크기 조절' },
  { title: '스포이드', shortcut: 'I', usage: '색상 패널을 열고 화면에서 색상을 추출' },
  { title: '브러쉬', shortcut: 'B', usage: '자유 드로잉 경로 생성' },
  { title: '펜툴', shortcut: 'P', usage: '클릭은 직선, 드래그는 곡선 앵커 생성' },
  { title: '펜 경로 확정', shortcut: 'Enter', usage: '펜으로 그리는 현재 경로를 확정' },
  { title: '펜 작업 취소', shortcut: 'Esc', usage: '펜으로 그리는 현재 경로를 취소' },
  { title: '펜 앵커 삭제', shortcut: 'Backspace', usage: '펜 모드에서 마지막 앵커 삭제' },
  { title: '텍스트', shortcut: 'T', usage: '캔버스 클릭으로 텍스트 박스 생성' },
  { title: '사각형', shortcut: 'R', usage: '드래그로 사각형 생성' },
  { title: '원', shortcut: 'O', usage: '드래그로 원/타원 생성' },
  { title: '삼각형', shortcut: 'Y', usage: '드래그로 삼각형 생성' },
  { title: '선', shortcut: 'L', usage: '드래그로 직선 생성' },
  { title: '화살표', shortcut: '-', usage: '드래그로 화살표 생성' },
  { title: '패스 편집', shortcut: 'A', usage: '선택한 패스를 직접 편집(더블클릭과 동일)' },
  { title: '패스 편집 종료', shortcut: 'Esc', usage: '패스 포인트 편집 모드를 종료' },
  { title: '그룹화', shortcut: 'Cmd/Ctrl+G', usage: '선택 객체 그룹화' },
  { title: '그룹 해제', shortcut: 'Cmd/Ctrl+Alt+G', usage: '그룹 해제' },
  { title: '앞으로 가져오기', shortcut: 'Cmd/Ctrl+]', usage: '선택 객체를 한 단계 앞으로 이동' },
  { title: '뒤로 보내기', shortcut: 'Cmd/Ctrl+[', usage: '선택 객체를 한 단계 뒤로 이동' },
  {
    title: '맨 앞으로 가져오기',
    shortcut: 'Cmd/Ctrl+Alt+]',
    usage: '선택 객체를 최상단 레이어로 이동',
  },
  {
    title: '맨 뒤로 보내기',
    shortcut: 'Cmd/Ctrl+Alt+[',
    usage: '선택 객체를 최하단 레이어로 이동',
  },
  { title: '팬', shortcut: 'Space + Drag', usage: '캔버스 이동(패닝)' },
  { title: '팬', shortcut: '마우스 휠 클릭 + Drag', usage: '캔버스 이동(패닝)' },
  {
    title: '이동 축 고정',
    shortcut: 'Shift + Drag',
    usage: '드래그 중 수평/수직 한 축으로 이동 고정',
  },
  { title: '그리드 스냅', shortcut: 'Q (Hold)', usage: '이동/크기 조절 시 그리드 단위로 스냅' },
  {
    title: '스마트 가이드',
    shortcut: '자동',
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
];

const PAGE_TYPE_META: Record<
  PageType,
  { icon: React.ElementType; iconColor: string; bgColor: string; defaultLabel: string }
> = {
  'custom-design': {
    icon: PenLine,
    iconColor: 'text-sky-500',
    bgColor: 'bg-sky-100',
    defaultLabel: '새 디자인',
  },
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
  label: {
    icon: Tag,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-100',
    defaultLabel: '라벨',
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

const ADDABLE_PAGE_TYPES: PageType[] = ['custom-design', 'sketch', 'pattern', 'label'];

const PAGE_TYPE_CHIP_CLASS: Record<PageType, string> = {
  'custom-design': 'bg-sky-100 text-sky-700',
  sketch: 'bg-violet-100 text-violet-700',
  pattern: 'bg-gray-200 text-gray-700',
  label: 'bg-amber-100 text-amber-700',
  'size-spec': 'bg-indigo-100 text-indigo-700',
};
const CANVAS_ARTBOARD_OBJECT_ID = '__canvas-artboard__';
type PageDropSide = 'before' | 'after';

function makeCanvasAreaThumbnail(canvas: any): string | null {
  if (!canvas || typeof canvas.toDataURL !== 'function') {
    return null;
  }

  const artboard = canvas.getObjects?.().find((obj: any) => {
    const data = obj?.data;
    return data?.kind === '__artboard__' || data?.id === CANVAS_ARTBOARD_OBJECT_ID;
  });

  if (
    !artboard ||
    typeof artboard.getCenterPoint !== 'function' ||
    typeof artboard.getScaledWidth !== 'function' ||
    typeof artboard.getScaledHeight !== 'function'
  ) {
    return canvas.toDataURL({ format: 'png', multiplier: 1 });
  }

  const center = artboard.getCenterPoint();
  const halfWidth = artboard.getScaledWidth() / 2;
  const halfHeight = artboard.getScaledHeight() / 2;

  if (
    !center ||
    !Number.isFinite(center.x) ||
    !Number.isFinite(center.y) ||
    !Number.isFinite(halfWidth) ||
    !Number.isFinite(halfHeight) ||
    halfWidth <= 0 ||
    halfHeight <= 0
  ) {
    return canvas.toDataURL({ format: 'png', multiplier: 1 });
  }

  const vpt = (canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0]) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const toViewport = (x: number, y: number) => ({
    x: vpt[0] * x + vpt[2] * y + vpt[4],
    y: vpt[1] * x + vpt[3] * y + vpt[5],
  });

  const corners = [
    toViewport(center.x - halfWidth, center.y - halfHeight),
    toViewport(center.x + halfWidth, center.y - halfHeight),
    toViewport(center.x + halfWidth, center.y + halfHeight),
    toViewport(center.x - halfWidth, center.y + halfHeight),
  ];

  const minX = Math.min(...corners.map((corner) => corner.x));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxY = Math.max(...corners.map((corner) => corner.y));
  const canvasWidth = Number(canvas.getWidth?.() ?? 0);
  const canvasHeight = Number(canvas.getHeight?.() ?? 0);

  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return canvas.toDataURL({ format: 'png', multiplier: 1 });
  }

  const left = Math.max(0, Math.min(canvasWidth, minX));
  const top = Math.max(0, Math.min(canvasHeight, minY));
  const right = Math.max(0, Math.min(canvasWidth, maxX));
  const bottom = Math.max(0, Math.min(canvasHeight, maxY));
  const width = Math.floor(right - left);
  const height = Math.floor(bottom - top);

  if (width <= 1 || height <= 1) {
    return canvas.toDataURL({ format: 'png', multiplier: 1 });
  }

  return canvas.toDataURL({
    format: 'png',
    multiplier: 1,
    left,
    top,
    width,
    height,
  } as any);
}

function isCanvasPageType(type: PageType): boolean {
  return isWorksheetCanvasPageType(type);
}

function moveByInsertIndex<T>(items: T[], fromIndex: number, insertIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  const adjustedInsert = fromIndex < insertIndex ? insertIndex - 1 : insertIndex;
  next.splice(adjustedInsert, 0, moved);
  return next;
}

function resolveCanvasSpecForPage(page: WorksheetPage): WorksheetCanvasSpec | undefined {
  const defaultSpec = getDefaultCanvasSpecForPageType(page.type);
  if (!defaultSpec) {
    return undefined;
  }
  if (page.type === 'sketch' || page.type === 'pattern') {
    return defaultSpec;
  }
  if (!page.canvasSpec) {
    return defaultSpec;
  }
  return createCanvasSpec(page.canvasSpec.width, page.canvasSpec.height);
}

const makePage = (
  type: PageType,
  sameTypeCount: number,
  canvasSpec?: WorksheetCanvasSpec,
): WorksheetPage => {
  const meta = PAGE_TYPE_META[type];
  const nextCanvasSpec =
    canvasSpec ?? getDefaultCanvasSpecForPageType(type) ?? undefined;
  return {
    id: crypto.randomUUID(),
    label: sameTypeCount > 0 ? `${meta.defaultLabel} ${sameTypeCount + 1}` : meta.defaultLabel,
    type,
    canvasSpec: nextCanvasSpec,
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
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ pageId: string | null; side: PageDropSide } | null>(
    null,
  );
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

  const {
    canvasRef,
    canvasSession,
    exportCanvasJson,
    importCanvasJson,
    clearCanvas,
    setCanvasPageSpec,
  } = useCanvas();
  const orderedPages = pages;

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
      const thumbnail = canvas ? makeCanvasAreaThumbnail(canvas) : null;

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

    const canvasSpec = resolveCanvasSpecForPage(selectedPage);

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
      if (canvasSpec) {
        setCanvasPageSpec(canvasSpec);
      }
      lastLoadedRef.current = { pageId: selectedPage.id, json: null, session: sessionKey };
      return;
    }

    await importCanvasJson(savedJson);
    if (canvasSpec) {
      setCanvasPageSpec(canvasSpec);
    }
    lastLoadedRef.current = { pageId: selectedPage.id, json: savedJson, session: sessionKey };
  }, [selectedPage, importCanvasJson, clearCanvas, canvasSession, setCanvasPageSpec]);

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

  const requestCustomCanvasSpec = useCallback((pageType: PageType): WorksheetCanvasSpec | null => {
    const pageLabel = PAGE_TYPE_META[pageType].defaultLabel;
    const widthRaw = window.prompt(`${pageLabel} 가로(px)를 입력해 주세요.`, '1920');
    if (widthRaw === null) {
      return null;
    }

    const heightRaw = window.prompt(`${pageLabel} 세로(px)를 입력해 주세요.`, '1080');
    if (heightRaw === null) {
      return null;
    }

    const width = Number(widthRaw);
    const height = Number(heightRaw);

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      window.alert('가로/세로는 0보다 큰 숫자로 입력해 주세요.');
      return null;
    }

    return createCanvasSpec(width, height);
  }, []);

  const handleAddPage = useCallback(
    (type: PageType) => {
      if (readOnly) return;
      let customCanvasSpec: WorksheetCanvasSpec | undefined;

      if (type === 'custom-design' || type === 'label') {
        const requested = requestCustomCanvasSpec(type);
        if (!requested) {
          return;
        }
        customCanvasSpec = requested;
      }

      const sameTypeCount = pages.filter((p) => p.type === type).length;
      const newPage = makePage(type, sameTypeCount, customCanvasSpec);

      updateDocument((prev) => {
        const nextPages = [...prev.pages, newPage];
        return {
          ...prev,
          pages: nextPages,
          activePageId: newPage.id,
        };
      });

      setAddMenuOpen(false);
    },
    [pages, readOnly, requestCustomCanvasSpec, updateDocument],
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (readOnly) return;
      if (pages.length <= 1) return;

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
          pages: nextPages,
          activePageId: nextActivePageId,
          sketchPages: nextSketchPages,
          pageThumbnails: nextThumbnails,
        };
      });
    },
    [pages, readOnly, selectedId, persistSketchPageSnapshot, updateDocument],
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

  const clearPageDragState = useCallback(() => {
    setDraggingPageId(null);
    setDragOverTarget(null);
  }, []);

  const reorderPages = useCallback(
    (draggedPageId: string, targetPageId: string | null, side: PageDropSide) => {
      if (readOnly) return;

      updateDocument((prev) => {
        const fromIndex = prev.pages.findIndex((page) => page.id === draggedPageId);
        if (fromIndex < 0) {
          return prev;
        }

        let insertIndex = prev.pages.length;
        if (targetPageId) {
          const targetIndex = prev.pages.findIndex((page) => page.id === targetPageId);
          if (targetIndex < 0) {
            return prev;
          }
          insertIndex = targetIndex + (side === 'after' ? 1 : 0);
        }

        const adjustedInsert = fromIndex < insertIndex ? insertIndex - 1 : insertIndex;
        if (adjustedInsert === fromIndex) {
          return prev;
        }

        return {
          ...prev,
          pages: moveByInsertIndex(prev.pages, fromIndex, insertIndex),
        };
      });
    },
    [readOnly, updateDocument],
  );

  const handlePageDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, pageId: string) => {
      if (readOnly) return;
      setDraggingPageId(pageId);
      setDragOverTarget(null);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', pageId);
    },
    [readOnly],
  );

  const handlePageDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>, pageId: string) => {
      if (readOnly || !draggingPageId) return;
      if (pageId === draggingPageId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';

      const rect = event.currentTarget.getBoundingClientRect();
      const side: PageDropSide = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
      setDragOverTarget((prev) =>
        prev?.pageId === pageId && prev.side === side ? prev : { pageId, side },
      );
    },
    [readOnly, draggingPageId],
  );

  const handlePageDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, targetPageId: string) => {
      if (readOnly || !draggingPageId) return;
      event.preventDefault();

      const rect = event.currentTarget.getBoundingClientRect();
      const side: PageDropSide = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
      reorderPages(draggingPageId, targetPageId, side);
      clearPageDragState();
    },
    [readOnly, draggingPageId, reorderPages, clearPageDragState],
  );

  const handleEndDropZoneDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (readOnly || !draggingPageId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDragOverTarget((prev) => (prev?.pageId === null ? prev : { pageId: null, side: 'after' }));
    },
    [readOnly, draggingPageId],
  );

  const handleEndDropZoneDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (readOnly || !draggingPageId) return;
      event.preventDefault();
      reorderPages(draggingPageId, null, 'after');
      clearPageDragState();
    },
    [readOnly, draggingPageId, reorderPages, clearPageDragState],
  );

  return (
    <section className='flex h-full min-w-0 flex-1 flex-col gap-2'>
      <div className='relative min-h-0 flex-1 overflow-hidden rounded-md bg-transparent'>
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

      <div className='relative z-[120] flex w-full min-w-0 shrink-0 items-end gap-3 rounded-md bg-[#fafafa] pt-0 pr-0 pb-0 pl-4 dark:bg-[#08122a] xl:px-4 xl:py-3'>
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
                      const canDeletePage = pages.length > 1;
                      const isDragging = draggingPageId === page.id;
                      const isDropBefore =
                        dragOverTarget?.pageId === page.id && dragOverTarget.side === 'before' && !isDragging;
                      const isDropAfter =
                        dragOverTarget?.pageId === page.id && dragOverTarget.side === 'after' && !isDragging;
                      return (
                        <div
                          key={page.id}
                          draggable={!readOnly && !isEditingName}
                          onDragStart={(event) => handlePageDragStart(event, page.id)}
                          onDragOver={(event) => handlePageDragOver(event, page.id)}
                          onDrop={(event) => handlePageDrop(event, page.id)}
                          onDragEnd={clearPageDragState}
                          className={`relative flex shrink-0 flex-col gap-1 transition-[transform,box-shadow,opacity] duration-200 ease-out will-change-transform ${
                            isDragging
                              ? 'z-30 -translate-y-0.5 scale-[1.03] opacity-90 shadow-[0_10px_26px_rgba(15,23,42,0.24)]'
                              : 'opacity-100'
                          }`}
                        >
                          <div
                            className='group/thumb relative'
                            style={{ width: THUMB_W, height: THUMB_H }}
                          >
                            {isDropBefore && (
                              <span className='pointer-events-none absolute top-1 bottom-1 -left-1 z-40 w-0.5 rounded-full bg-violet-500' />
                            )}
                            {isDropAfter && (
                              <span className='pointer-events-none absolute top-1 -right-1 bottom-1 z-40 w-0.5 rounded-full bg-violet-500' />
                            )}
                            <button
                              type='button'
                              onClick={() => {
                                if (readOnly) return;
                                updateDocument((prev) => ({ ...prev, activePageId: page.id }));
                              }}
                              className={`relative h-full w-full cursor-pointer overflow-hidden rounded-md bg-[#fafafa] transition-all dark:bg-gray-900 ${
                                selectedId === page.id
                                  ? 'border-2 border-violet-500'
                                  : 'border border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500'
                              }`}
                            >
                              <span
                                className={`absolute top-2 left-2 z-10 rounded-full px-2 py-0.5 text-[11px] font-semibold ${PAGE_TYPE_CHIP_CLASS[page.type]}`}
                              >
                                {meta.defaultLabel}
                              </span>
                              <span className='absolute right-2 bottom-2 z-10 text-[10px] leading-none font-semibold text-gray-800 dark:text-gray-100'>
                                {idx + 1}
                              </span>

                              {thumbnail && (
                                <img
                                  src={thumbnail}
                                  alt={`${page.label} 썸네일`}
                                  className='h-full w-full object-contain'
                                />
                              )}
                            </button>

                            {canDeletePage && (
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePage(page.id);
                                }}
                                className='absolute top-1/2 right-1.5 z-30 flex h-5 w-6 -translate-y-1/2 translate-x-3 scale-95 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-500 opacity-0 shadow-sm transition-all duration-300 ease-out will-change-transform group-hover/thumb:translate-x-0 group-hover/thumb:scale-100 group-hover/thumb:opacity-100 hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95 dark:border-red-500/40 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-500/10'
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
                                  className='flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                  title='시트명 저장'
                                >
                                  <Check size={13} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className='absolute inset-0 flex items-center justify-center px-2 transition-all duration-300 ease-out group-hover/title:pr-8'>
                                  <p className='w-full truncate text-center text-base font-semibold text-gray-800 dark:text-gray-100'>
                                    {page.label}
                                  </p>
                                </div>
                                <button
                                  type='button'
                                  onClick={() => startPageLabelEdit(page)}
                                  className='absolute top-1/2 right-0 flex h-6 w-6 -translate-y-1/2 translate-x-1 items-center justify-center rounded-md text-gray-500 opacity-0 transition-all duration-300 ease-out group-hover/title:translate-x-0 group-hover/title:opacity-100 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
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

                    <div
                      className='relative flex h-[112px] shrink-0 items-start'
                      ref={addMenuRef}
                      onDragOver={handleEndDropZoneDragOver}
                      onDrop={handleEndDropZoneDrop}
                      onDragEnd={clearPageDragState}
                    >
                      {dragOverTarget?.pageId === null && draggingPageId && (
                        <span className='pointer-events-none absolute top-1 right-[calc(100%+4px)] bottom-1 z-40 w-0.5 rounded-full bg-violet-500' />
                      )}
                      <button
                        type='button'
                        disabled={readOnly}
                        onClick={() => setAddMenuOpen((v) => !v)}
                        className='flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 dark:hover:border-gray-500 dark:hover:text-gray-300'
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
            className='fixed z-[260] w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900'
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
                  className='flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'
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
                className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-600 transition-all duration-300 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              >
                <Minus size={14} />
              </button>
              <span className='min-w-[3.5rem] text-center text-sm text-gray-800 dark:text-gray-100'>{zoom}%</span>
              <button
                type='button'
                onClick={() => {
                  if (readOnly) return;
                  updateDocument((prev) => ({ ...prev, zoom: Math.min(200, prev.zoom + 10) }));
                }}
                className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-600 transition-all duration-300 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {guideModeEnabled && (
        <aside className='pointer-events-auto fixed top-[96px] right-3 z-[240] w-[320px] rounded-xl border border-gray-200 bg-white/70 p-3 opacity-70 shadow-lg backdrop-blur-[2px] transition-opacity duration-200 hover:opacity-100 dark:border-gray-700 dark:bg-gray-900/75'>
          <h3 className='mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100'>단축키 가이드</h3>
          <div className='max-h-[70vh] overflow-y-auto pr-1'>
            <div className='space-y-1.5'>
              {GUIDE_MANUAL_ITEMS.map((item) => (
                <div
                  key={`${item.title}-${item.shortcut}`}
                  className='rounded-md bg-white/70 px-2 py-1.5 dark:bg-gray-900/70'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-xs font-semibold text-gray-800 dark:text-gray-100'>{item.title}</span>
                    <span className='rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
                      {item.shortcut}
                    </span>
                  </div>
                  <p className='mt-1 text-[11px] leading-4 text-gray-600 dark:text-gray-300'>{item.usage}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}

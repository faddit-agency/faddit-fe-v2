import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  History,
  LayoutGrid,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Shapes,
  Trash2,
  Upload,
} from 'lucide-react';
import FadditLogoOnly from '../../../images/icons/faddit-logo-only.svg';
import {
  createDriveFile,
  createDriveFolder,
  getDriveAll,
  getDriveFilePreviewUrl,
  type DriveNode,
} from '../../../lib/api/driveApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { useWorksheetV2Store } from '../worksheet-v2/useWorksheetV2Store';
import { CARD_DEFINITIONS } from '../worksheet-v2/worksheetV2Constants';
import type { WorksheetElementCategory, WorksheetElementItem } from '../worksheet-v2/worksheetV2Types';
import {
  getWorksheetElementFolderName,
  mapWorksheetElementCategoryToUploadTag,
  normalizeWorksheetElementUploadFile,
  WORKSHEET_ELEMENT_UPLOAD_REFRESH_EVENT,
} from './worksheetElementUploadUtils';

type ToolTab = 'template' | 'module' | 'element' | 'history' | 'comment';

interface WorksheetTemplateSidebarProps {
  collapsible?: boolean;
}

const TOOL_ITEMS: {
  key: ToolTab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}[] = [
  { key: 'template', label: '템플릿', icon: LayoutGrid },
  { key: 'module', label: '모듈', icon: Box },
  { key: 'element', label: '요소', icon: Shapes },
  { key: 'history', label: '히스토리', icon: History },
  { key: 'comment', label: '코멘트', icon: MessageSquare },
];

const CONTENT_PANEL_WIDTH = 230;
const GAP_X = 12;
const WORKSHEET_MODULE_DRAG_TYPE = 'application/x-faddit-worksheet-card';
const WORKSHEET_ELEMENT_DRAG_TYPE = 'application/x-faddit-worksheet-element';

const CATEGORY_ROW1 = ['전체', '남성', '여성', '아동'] as const;
const CATEGORY_ROW2 = ['반팔', '긴팔', '긴바지', '원피스', '반바지'] as const;
const MOCK_TEMPLATES = [0, 1, 2, 3, 4, 5];
const MOCK_RECOMMENDED = [0, 1, 2, 3];
const ELEMENT_PLACEHOLDER_ITEMS = Array.from({ length: 4 });
const ELEMENT_WORKSPACE_CATEGORIES = ['전체', '원단', '시보리원단', '라벨', '부자재'] as const;
const ELEMENT_WORKSPACE_PREVIEW_COUNT = 4;
const ELEMENT_UPLOAD_PREVIEW_COUNT = 4;

type ElementWorkspaceCategory = (typeof ELEMENT_WORKSPACE_CATEGORIES)[number];

type ElementWorkspaceFile = WorksheetElementItem & {
  type: DriveNode['type'];
  tag?: string;
  node: DriveNode;
};

const getElementCategoryBadgeClass = (category: ElementWorkspaceCategory) => {
  if (category === '원단') {
    return 'bg-sky-500/90 text-white';
  }
  if (category === '시보리원단') {
    return 'bg-indigo-500/90 text-white';
  }
  if (category === '라벨') {
    return 'bg-emerald-500/90 text-white';
  }
  if (category === '부자재') {
    return 'bg-amber-500/90 text-white';
  }

  return 'bg-violet-500/90 text-white';
};

const getElementWorkspaceCategory = (node: DriveNode): WorksheetElementCategory => {
  const tag = (node.tag || '').toLowerCase();
  const name = (node.name || '').toLowerCase();

  if (tag === 'rib_fabric' || tag === 'rib-fabric' || name.includes('시보리')) {
    return '시보리원단';
  }
  if (tag === 'fabric') {
    return '원단';
  }
  if (tag === 'label') {
    return '라벨';
  }
  if (tag === 'trim' || tag === 'etc') {
    return '부자재';
  }

  return '부자재';
};

const ELEMENT_DETAIL_PANEL_WIDTH = 308;

const stringifyDetailValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
};

export default function WorksheetTemplateSidebar({
  collapsible = false,
}: WorksheetTemplateSidebarProps) {
  const { worksheetId } = useParams<{ worksheetId?: string }>();
  const [activeTab, setActiveTab] = useState<ToolTab>('template');
  const [contentOpen, setContentOpen] = useState(true);
  const [cat1, setCat1] = useState('전체');
  const [cat2, setCat2] = useState('');
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [editingCustomCardId, setEditingCustomCardId] = useState<string | null>(null);
  const [editingCustomTitle, setEditingCustomTitle] = useState('');
  const [elementWorkspaceView, setElementWorkspaceView] = useState<'overview' | 'workspace'>('overview');
  const [elementWorkspaceCategory, setElementWorkspaceCategory] = useState<ElementWorkspaceCategory>(
    ELEMENT_WORKSPACE_CATEGORIES[0],
  );
  const [elementSearchQuery, setElementSearchQuery] = useState('');
  const [elementWorkspaceFiles, setElementWorkspaceFiles] = useState<ElementWorkspaceFile[]>([]);
  const [elementWorkspaceLoading, setElementWorkspaceLoading] = useState(false);
  const [elementWorkspaceError, setElementWorkspaceError] = useState<string | null>(null);
  const [uploadedElementFiles, setUploadedElementFiles] = useState<ElementWorkspaceFile[]>([]);
  const [elementUploadCategory, setElementUploadCategory] = useState<WorksheetElementCategory>('원단');
  const [elementUploadLoading, setElementUploadLoading] = useState(false);
  const [elementUploadError, setElementUploadError] = useState<string | null>(null);
  const [worksheetElementFolderId, setWorksheetElementFolderId] = useState<string | null>(null);
  const [selectedElementDetailId, setSelectedElementDetailId] = useState<string | null>(null);
  const [isElementDetailExpanded, setIsElementDetailExpanded] = useState(false);
  const [elementDetailPosition, setElementDetailPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const elementCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const elementDetailPanelRef = useRef<HTMLDivElement | null>(null);
  const elementUploadInputRef = useRef<HTMLInputElement | null>(null);

  const worksheetActiveTab = useWorksheetV2Store((s) => s.activeTab);
  const cardVisibility = useWorksheetV2Store((s) => s.cardVisibility);
  const toggleCardVisibility = useWorksheetV2Store((s) => s.toggleCardVisibility);
  const restoreCard = useWorksheetV2Store((s) => s.restoreCard);
  const addCustomCard = useWorksheetV2Store((s) => s.addCustomCard);
  const updateCustomCardTitle = useWorksheetV2Store((s) => s.updateCustomCardTitle);
  const deleteCustomCard = useWorksheetV2Store((s) => s.deleteCustomCard);
  const customCards = useWorksheetV2Store((s) => s.customCards);
  const setDraggingCardId = useWorksheetV2Store((s) => s.setDraggingCardId);
  const setDraggingElement = useWorksheetV2Store((s) => s.setDraggingElement);
  const userId = useAuthStore((state) => state.user?.userId || null);
  const rootFolderId = useAuthStore((state) => state.user?.rootFolder || null);

  const cards = [...CARD_DEFINITIONS[worksheetActiveTab], ...customCards[worksheetActiveTab]];
  const visMap = cardVisibility[worksheetActiveTab];
  const normalizedElementSearchQuery = elementSearchQuery.trim().toLowerCase();

  const searchedElementWorkspaceFiles = useMemo(() => {
    if (!normalizedElementSearchQuery) {
      return elementWorkspaceFiles;
    }

    return elementWorkspaceFiles.filter((file) =>
      file.name.toLowerCase().includes(normalizedElementSearchQuery),
    );
  }, [elementWorkspaceFiles, normalizedElementSearchQuery]);

  const filteredElementWorkspaceFiles = useMemo(() => {
    if (elementWorkspaceCategory === '전체') {
      return searchedElementWorkspaceFiles;
    }

    return searchedElementWorkspaceFiles.filter((file) => file.category === elementWorkspaceCategory);
  }, [searchedElementWorkspaceFiles, elementWorkspaceCategory]);

  const previewElementWorkspaceFiles = useMemo(
    () => searchedElementWorkspaceFiles.slice(0, ELEMENT_WORKSPACE_PREVIEW_COUNT),
    [searchedElementWorkspaceFiles],
  );

  const previewUploadedElementFiles = useMemo(
    () => uploadedElementFiles.slice(0, ELEMENT_UPLOAD_PREVIEW_COUNT),
    [uploadedElementFiles],
  );

  const allElementFiles = useMemo(
    () => [...uploadedElementFiles, ...elementWorkspaceFiles],
    [uploadedElementFiles, elementWorkspaceFiles],
  );

  const uploadedElementIdSet = useMemo(
    () => new Set(uploadedElementFiles.map((file) => file.id)),
    [uploadedElementFiles],
  );

  const selectedElementDetailFile = useMemo(() => {
    if (!selectedElementDetailId) {
      return null;
    }

    return allElementFiles.find((file) => file.id === selectedElementDetailId) ?? null;
  }, [allElementFiles, selectedElementDetailId]);

  const elementDetailSummaryRows = useMemo(() => {
    if (!selectedElementDetailFile) {
      return [] as Array<{ label: string; value: string }>;
    }

    const sourceLabel = uploadedElementIdSet.has(selectedElementDetailFile.id)
      ? '업로드 항목'
      : '나의 워크스페이스';

    return [
      { label: '파일명', value: selectedElementDetailFile.name },
      { label: '출처', value: sourceLabel },
      { label: '카테고리', value: selectedElementDetailFile.category },
      { label: '타입', value: selectedElementDetailFile.type },
      { label: '태그', value: stringifyDetailValue(selectedElementDetailFile.tag) },
      { label: '경로', value: stringifyDetailValue(selectedElementDetailFile.node.path) },
      { label: '수정 시각', value: stringifyDetailValue(selectedElementDetailFile.node.updatedAt) },
    ];
  }, [selectedElementDetailFile, uploadedElementIdSet]);

  const elementDetailRows = useMemo(() => {
    if (!selectedElementDetailFile) {
      return [] as Array<{ label: string; value: string }>;
    }

    const node = selectedElementDetailFile.node;
    const sourceLabel = uploadedElementIdSet.has(selectedElementDetailFile.id)
      ? '업로드 항목'
      : '나의 워크스페이스';
    return [
      { label: 'fileSystemId', value: stringifyDetailValue(node.fileSystemId) },
      { label: 'name', value: stringifyDetailValue(node.name) },
      { label: 'path', value: stringifyDetailValue(node.path) },
      { label: 'idPath', value: stringifyDetailValue(node.idPath) },
      { label: 'type', value: stringifyDetailValue(node.type) },
      { label: 'isStarred', value: stringifyDetailValue(node.isStarred) },
      { label: 'isRoot', value: stringifyDetailValue(node.isRoot) },
      { label: 'childrenCount', value: stringifyDetailValue(node.childrenCount) },
      { label: 'updatedAt', value: stringifyDetailValue(node.updatedAt) },
      { label: 'parentId', value: stringifyDetailValue(node.parentId) },
      { label: 'size', value: stringifyDetailValue(node.size) },
      { label: 'mimetype', value: stringifyDetailValue(node.mimetype) },
      { label: 'tag', value: stringifyDetailValue(node.tag) },
      { label: 'creatorName', value: stringifyDetailValue(node.creatorName) },
      { label: 'creatorProfileImg', value: stringifyDetailValue(node.creatorProfileImg) },
      { label: 'recentActionType', value: stringifyDetailValue(node.recentActionType) },
      { label: 'recentActorName', value: stringifyDetailValue(node.recentActorName) },
      { label: 'deletedAt', value: stringifyDetailValue(node.deletedAt) },
      { label: 'worksheetThumbnail', value: stringifyDetailValue(node.worksheetThumbnail) },
      { label: 'source(derived)', value: sourceLabel },
      { label: 'category(derived)', value: stringifyDetailValue(selectedElementDetailFile.category) },
      {
        label: 'thumbnailUrl(derived)',
        value: stringifyDetailValue(selectedElementDetailFile.thumbnailUrl),
      },
    ];
  }, [selectedElementDetailFile, uploadedElementIdSet]);

  const elementDetailRawJson = useMemo(() => {
    if (!selectedElementDetailFile) {
      return '';
    }

    return JSON.stringify(
      {
        ...selectedElementDetailFile.node,
        category: selectedElementDetailFile.category,
        thumbnailUrl: selectedElementDetailFile.thumbnailUrl,
      },
      null,
      2,
    );
  }, [selectedElementDetailFile]);

  const updateElementDetailPosition = useCallback(() => {
    if (!selectedElementDetailId) {
      return;
    }

    const anchorEl = elementCardRefs.current[selectedElementDetailId];
    if (!anchorEl) {
      setSelectedElementDetailId(null);
      setElementDetailPosition(null);
      return;
    }

    const rect = anchorEl.getBoundingClientRect();
    const panelHeight = elementDetailPanelRef.current?.offsetHeight ?? 260;
    const left = Math.min(
      rect.right + 12,
      Math.max(12, window.innerWidth - ELEMENT_DETAIL_PANEL_WIDTH - 12),
    );
    const top = Math.min(Math.max(12, rect.top), Math.max(12, window.innerHeight - panelHeight - 12));

    setElementDetailPosition({
      left,
      top,
    });
  }, [selectedElementDetailId]);

  const toggleElementDetail = useCallback((fileId: string) => {
    setSelectedElementDetailId((prev) => (prev === fileId ? null : fileId));
    setIsElementDetailExpanded(false);
  }, []);

  const renderElementWorkspaceFileCard = (
    file: ElementWorkspaceFile,
    keyPrefix: 'element-upload' | 'element-workspace' | 'workspace-filtered',
    onAction?: (target: ElementWorkspaceFile) => void,
    draggable = false,
  ) => {
    const isDetailOpen = selectedElementDetailId === file.id;
    const isUploadedCard = keyPrefix === 'element-upload';

    return (
      <div
        key={`${keyPrefix}-${file.id}`}
        ref={(node) => {
          if (node) {
            elementCardRefs.current[file.id] = node;
            return;
          }

          if (elementCardRefs.current[file.id]) {
            delete elementCardRefs.current[file.id];
          }
        }}
        role={onAction ? 'button' : undefined}
        tabIndex={onAction ? 0 : undefined}
        draggable={draggable}
        onDragStart={
          draggable
            ? (event) => {
                const payload: WorksheetElementItem = {
                  id: file.id,
                  name: file.name,
                  category: file.category,
                  thumbnailUrl: file.thumbnailUrl,
                  source: file.source,
                  path: file.path,
                  tag: file.tag ?? null,
                };
                event.dataTransfer.setData(WORKSHEET_ELEMENT_DRAG_TYPE, JSON.stringify(payload));
                event.dataTransfer.setData('text/plain', `faddit-element:${JSON.stringify(payload)}`);
                event.dataTransfer.effectAllowed = 'copy';
                setDraggingElement(payload);
              }
            : undefined
        }
        onDragEnd={
          draggable
            ? () => {
                setDraggingElement(null);
              }
            : undefined
        }
        onClick={onAction ? () => onAction(file) : undefined}
        onKeyDown={
          onAction
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onAction(file);
                }
              }
            : undefined
        }
        className={`group relative aspect-square overflow-hidden rounded-md ${onAction ? 'cursor-pointer' : ''}`}
      >
        {file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.name}
            className='h-full w-full rounded-md border border-gray-200 object-cover transition-transform duration-200 group-hover:scale-105'
            loading='lazy'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center rounded-md border border-gray-200 bg-[#f3f3f5]'>
            <Shapes size={20} className='text-gray-400' />
          </div>
        )}
        {isUploadedCard ? (
          <span className='pointer-events-none absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white'>
            <Upload size={10} />
            업로드
          </span>
        ) : (
          <span
            className={`pointer-events-none absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getElementCategoryBadgeClass(file.category)}`}
          >
            {file.category}
          </span>
        )}
        {onAction ? (
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              onAction(file);
            }}
            className={`absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-700 shadow-sm transition-all duration-200 ${
              isDetailOpen
                ? 'bg-white opacity-100'
                : 'bg-white/90 opacity-0 group-hover:opacity-100 hover:bg-white'
            }`}
            aria-label='요소 상세 보기'
          >
            <ArrowUpRight size={13} />
          </button>
        ) : null}
        <div className='pointer-events-none absolute inset-x-0 bottom-0 rounded-b-md bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2 py-1.5'>
          <p className='truncate text-[10px] font-semibold text-white'>{file.name}</p>
          {isUploadedCard ? <p className='truncate text-[10px] text-white/75'>{file.category}</p> : null}
        </div>
      </div>
    );
  };

  const handleToolTabClick = (tab: ToolTab) => {
    setActiveTab(tab);
    if (tab !== 'element') {
      setElementWorkspaceView('overview');
      setElementWorkspaceCategory(ELEMENT_WORKSPACE_CATEGORIES[0]);
      setSelectedElementDetailId(null);
      setIsElementDetailExpanded(false);
      setElementDetailPosition(null);
      setDraggingElement(null);
    }
    if (collapsible) {
      setContentOpen(true);
    }
  };

  const addCustomModule = () => {
    addCustomCard(worksheetActiveTab, customTitle);
    setCustomTitle('');
  };

  const startEditingCustomModule = (cardId: string, currentTitle: string) => {
    setEditingCustomCardId(cardId);
    setEditingCustomTitle(currentTitle);
  };

  const cancelEditingCustomModule = () => {
    setEditingCustomCardId(null);
    setEditingCustomTitle('');
  };

  const commitEditingCustomModule = () => {
    if (!editingCustomCardId) {
      return;
    }

    updateCustomCardTitle(worksheetActiveTab, editingCustomCardId, editingCustomTitle);
    cancelEditingCustomModule();
  };

  const toElementWorkspaceFiles = useCallback(
    async (nodes: DriveNode[], source: 'workspace' | 'upload') => {
      return Promise.all(
        nodes
          .filter((node) => node.type !== 'folder' && node.type !== 'worksheet')
        .map(async (node): Promise<ElementWorkspaceFile> => {
          let thumbnailUrl: string | null = null;

          try {
            const previewUrl = await getDriveFilePreviewUrl(node.fileSystemId);
            if (previewUrl) {
              thumbnailUrl = previewUrl;
            }
          } catch {
            thumbnailUrl = null;
          }

          return {
            id: node.fileSystemId,
            name: node.name,
            type: node.type,
            tag: node.tag,
            category: getElementWorkspaceCategory(node),
            thumbnailUrl,
            source,
            path: node.path,
            node,
          };
        }),
    );
    },
    [],
  );

  const loadUploadedElementFiles = useCallback(
    async (targetFolderId: string) => {
      const uploadedData = await getDriveAll(targetFolderId);
      const files = await toElementWorkspaceFiles(uploadedData.files, 'upload');
      setUploadedElementFiles(files);
    },
    [toElementWorkspaceFiles],
  );

  const getOrCreateWorksheetElementFolderId = useCallback(async () => {
    if (!rootFolderId || !worksheetId) {
      return null;
    }

    if (worksheetElementFolderId) {
      return worksheetElementFolderId;
    }

    const rootData = await getDriveAll(rootFolderId);
    const folderName = getWorksheetElementFolderName(worksheetId);
    const existingFolder = rootData.folders.find((folder) => folder.name === folderName);

    if (existingFolder) {
      setWorksheetElementFolderId(existingFolder.fileSystemId);
      return existingFolder.fileSystemId;
    }

    await createDriveFolder({
      parentId: rootFolderId,
      name: folderName,
    });

    const refreshedRootData = await getDriveAll(rootFolderId);
    const createdFolder = refreshedRootData.folders.find((folder) => folder.name === folderName);
    if (!createdFolder) {
      return null;
    }

    setWorksheetElementFolderId(createdFolder.fileSystemId);
    return createdFolder.fileSystemId;
  }, [rootFolderId, worksheetElementFolderId, worksheetId]);

  const handleElementUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }
      if (!userId || !rootFolderId || !worksheetId) {
        setElementUploadError('작업지시서 업로드에 필요한 정보가 없습니다.');
        return;
      }

      try {
        setElementUploadLoading(true);
        setElementUploadError(null);

        const targetFolderId = await getOrCreateWorksheetElementFolderId();
        if (!targetFolderId) {
          throw new Error('target folder not found');
        }

        const uploadTag = mapWorksheetElementCategoryToUploadTag(elementUploadCategory);
        const uploadFiles = Array.from(files).map((file) =>
          normalizeWorksheetElementUploadFile(file, elementUploadCategory),
        );

        await createDriveFile({
          parentId: targetFolderId,
          userId,
          files: uploadFiles,
          tags: uploadFiles.map(() => uploadTag),
        });

        await loadUploadedElementFiles(targetFolderId);
        window.dispatchEvent(
          new CustomEvent(WORKSHEET_ELEMENT_UPLOAD_REFRESH_EVENT, {
            detail: {
              worksheetId,
            },
          }),
        );
      } catch {
        setElementUploadError('요소 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setElementUploadLoading(false);
        if (elementUploadInputRef.current) {
          elementUploadInputRef.current.value = '';
        }
      }
    },
    [
      elementUploadCategory,
      getOrCreateWorksheetElementFolderId,
      loadUploadedElementFiles,
      rootFolderId,
      userId,
      worksheetId,
    ],
  );

  useEffect(() => {
    setEditingCustomCardId(null);
    setEditingCustomTitle('');
  }, [worksheetActiveTab]);

  useEffect(() => {
    if (activeTab !== 'element') {
      return;
    }

    if (!rootFolderId) {
      setElementWorkspaceFiles([]);
      setUploadedElementFiles([]);
      setWorksheetElementFolderId(null);
      setElementWorkspaceError(null);
      return;
    }

    let isMounted = true;

    const loadElementWorkspaceFiles = async () => {
      try {
        setElementWorkspaceLoading(true);
        setElementWorkspaceError(null);

        const workspaceData = await getDriveAll(rootFolderId);
        if (!isMounted) {
          return;
        }

        const files = await toElementWorkspaceFiles(workspaceData.files, 'workspace');

        setElementWorkspaceFiles(files);

        if (worksheetId) {
          const folderName = getWorksheetElementFolderName(worksheetId);
          const existingFolder = workspaceData.folders.find((folder) => folder.name === folderName);

          if (existingFolder) {
            setWorksheetElementFolderId(existingFolder.fileSystemId);
            await loadUploadedElementFiles(existingFolder.fileSystemId);
          } else {
            setWorksheetElementFolderId(null);
            setUploadedElementFiles([]);
          }
        } else {
          setWorksheetElementFolderId(null);
          setUploadedElementFiles([]);
        }
      } catch {
        if (!isMounted) {
          return;
        }
        setElementWorkspaceError('나의 워크스페이스 파일을 불러오지 못했습니다.');
        setElementWorkspaceFiles([]);
        setUploadedElementFiles([]);
      } finally {
        if (!isMounted) {
          return;
        }
        setElementWorkspaceLoading(false);
      }
    };

    void loadElementWorkspaceFiles();

    return () => {
      isMounted = false;
    };
  }, [activeTab, loadUploadedElementFiles, rootFolderId, toElementWorkspaceFiles, worksheetId]);

  useEffect(() => {
    if (!worksheetId || !rootFolderId) {
      return;
    }

    const handleUploadRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<{ worksheetId?: string }>;
      if (!customEvent.detail?.worksheetId || customEvent.detail.worksheetId !== worksheetId) {
        return;
      }

      const refresh = async () => {
        const targetFolderId = worksheetElementFolderId ?? (await getOrCreateWorksheetElementFolderId());
        if (!targetFolderId) {
          return;
        }

        await loadUploadedElementFiles(targetFolderId);
      };

      void refresh();
    };

    window.addEventListener(WORKSHEET_ELEMENT_UPLOAD_REFRESH_EVENT, handleUploadRefresh);
    return () => {
      window.removeEventListener(WORKSHEET_ELEMENT_UPLOAD_REFRESH_EVENT, handleUploadRefresh);
    };
  }, [
    getOrCreateWorksheetElementFolderId,
    loadUploadedElementFiles,
    rootFolderId,
    worksheetElementFolderId,
    worksheetId,
  ]);

  useEffect(() => {
    setSelectedElementDetailId(null);
    setIsElementDetailExpanded(false);
    setElementDetailPosition(null);
    setElementUploadError(null);
  }, [activeTab, elementWorkspaceView, elementWorkspaceCategory, normalizedElementSearchQuery]);

  useEffect(() => {
    if (!selectedElementDetailId) {
      return;
    }

    const syncPosition = () => {
      updateElementDetailPosition();
    };

    syncPosition();
    const rafId = window.requestAnimationFrame(syncPosition);
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [selectedElementDetailId, isElementDetailExpanded, updateElementDetailPosition]);

  useEffect(() => {
    if (!selectedElementDetailId) {
      return;
    }

    const closeIfOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const panelEl = elementDetailPanelRef.current;
      const anchorEl = elementCardRefs.current[selectedElementDetailId];

      if (panelEl?.contains(target)) {
        return;
      }
      if (anchorEl?.contains(target)) {
        return;
      }

      setSelectedElementDetailId(null);
      setIsElementDetailExpanded(false);
      setElementDetailPosition(null);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setSelectedElementDetailId(null);
      setIsElementDetailExpanded(false);
      setElementDetailPosition(null);
    };

    document.addEventListener('mousedown', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedElementDetailId]);

  const tabContent = (
    <>
      {activeTab === 'template' && (
        <>
          <div className='shrink-0 border-b border-gray-100 pb-2'>
            <div className='relative flex items-center gap-1 rounded-lg border border-gray-200 bg-white'>
              <textarea
                placeholder='템플릿 검색 (예: 카라가 있는 티셔츠)'
                className='form-input min-w-0 flex-1 resize-none rounded-l-lg border-0 px-2 py-1 pb-9 text-[13px] outline-none focus:ring-0'
              />
              <button
                type='button'
                className='absolute right-2 bottom-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700'
                aria-label='검색'
              >
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto'>
            <div className='mb-3'>
              <h4 className='mb-1 text-xs font-semibold text-gray-700'>추천 템플릿</h4>
              <div className='grid grid-cols-2 gap-1.5'>
                {MOCK_RECOMMENDED.map((i) => (
                  <div
                    key={i}
                    className='aspect-square rounded-md border border-gray-200 bg-[#f6f6f7]'
                  />
                ))}
              </div>
            </div>

            <div className='mb-2 flex flex-wrap gap-1'>
              {CATEGORY_ROW1.map((c) => (
                <button
                  key={c}
                  type='button'
                  onClick={() => setCat1((prev) => (prev === c ? '' : c))}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${cat1 === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className='mb-2 flex flex-wrap gap-1'>
              {CATEGORY_ROW2.map((c) => (
                <button
                  key={c}
                  type='button'
                  onClick={() => setCat2((prev) => (prev === c ? '' : c))}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${cat2 === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className='grid grid-cols-2 gap-1.5'>
              {MOCK_TEMPLATES.map((i) => (
                <div key={i} className='group cursor-pointer'>
                  <div className='mb-1 aspect-[4/3] rounded-md border border-gray-200 bg-[#f6f6f7] transition-colors group-hover:border-violet-300' />
                  <p className='truncate text-[10px] text-gray-500'>템플릿 {i + 1}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'module' && (
        <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto'>
          <div className='flex items-center gap-2'>
            <input
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder='새 메모장 제목'
              className='form-input h-8 flex-1 text-xs'
            />
            <button
              type='button'
              onClick={addCustomModule}
              className='inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50'
              aria-label='커스텀 모듈 추가'
            >
              <Plus size={14} />
            </button>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const plainText = event.dataTransfer.getData('text/plain');
              const droppedCardId =
                event.dataTransfer.getData(WORKSHEET_MODULE_DRAG_TYPE) ||
                (plainText.startsWith('faddit-card:') ? plainText.replace('faddit-card:', '') : '') ||
                dragCardId;
              if (!droppedCardId) return;
              restoreCard(worksheetActiveTab, droppedCardId);
              setDragCardId(null);
              setDraggingCardId(null);
            }}
            className='rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 text-[11px] text-gray-500'
          >
            숨김 모듈을 여기로 드래그하면 화면에 표시됩니다.
          </div>

          <div className='overflow-hidden rounded-lg border border-gray-200'>
            {cards.map((card) => {
              const visible = visMap[card.id] ?? true;
              const custom = !card.isDefault;
              const isEditingCustom = custom && editingCustomCardId === card.id;
              const required = card.id === 'diagram-view';

              return (
                <div
                  key={card.id}
                  draggable={!visible && !required}
                  onDragStart={(event) => {
                    if (required) return;
                    setDragCardId(card.id);
                    setDraggingCardId(card.id);
                    event.dataTransfer.setData(WORKSHEET_MODULE_DRAG_TYPE, card.id);
                    event.dataTransfer.setData('text/plain', `faddit-card:${card.id}`);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDragCardId(null);
                    setDraggingCardId(null);
                  }}
                  className='flex items-center gap-2 border-b border-gray-100 bg-white px-2 py-2 text-sm last:border-b-0'
                >
                  <button
                    type='button'
                    disabled={required}
                    onClick={() => toggleCardVisibility(worksheetActiveTab, card.id)}
                    className={`inline-flex items-center ${required ? 'cursor-not-allowed opacity-40' : ''}`}
                    aria-label={`${card.title} 표시 토글`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        visible
                          ? 'border-gray-700 bg-gray-700 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {visible && <Check size={10} strokeWidth={3} />}
                    </span>
                  </button>

                  {!visible ? <GripVertical size={13} className='text-gray-400' /> : null}

                  <div className='min-w-0 flex-1'>
                    {isEditingCustom ? (
                      <input
                        value={editingCustomTitle}
                        autoFocus
                        onChange={(event) => setEditingCustomTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitEditingCustomModule();
                            return;
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelEditingCustomModule();
                          }
                        }}
                        className='form-input h-6 w-full text-xs'
                      />
                    ) : (
                      <p className='truncate text-xs'>{card.title}</p>
                    )}
                    <p className={`text-[10px] ${visible ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {visible ? '표시 중' : '숨김'}
                    </p>
                  </div>

                  {custom ? (
                    <div className='flex items-center gap-1'>
                      {isEditingCustom ? (
                        <button
                          type='button'
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={commitEditingCustomModule}
                          className='inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                          aria-label='커스텀 모듈 이름 수정완료'
                        >
                          <Check size={13} />
                        </button>
                      ) : (
                        <>
                          <button
                            type='button'
                            onClick={() => startEditingCustomModule(card.id, card.title)}
                            className='inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            aria-label='커스텀 모듈 이름 수정'
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type='button'
                            onClick={() => deleteCustomCard(worksheetActiveTab, card.id)}
                            className='inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500'
                            aria-label='커스텀 모듈 삭제'
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}

                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      required
                        ? 'bg-amber-50 text-amber-600'
                        : custom
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {required ? '필수' : custom ? '커스텀' : '기본'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'element' && (
        <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto'>
          {elementWorkspaceView === 'overview' ? (
            <>
              <div className='space-y-2'>
                <label className='flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3'>
                  <Search size={14} className='text-gray-400' />
                  <input
                    type='text'
                    placeholder='요소 검색'
                    value={elementSearchQuery}
                    onChange={(event) => setElementSearchQuery(event.target.value)}
                    className='h-full min-w-0 flex-1 border-0 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400'
                  />
                </label>
                <input
                  ref={elementUploadInputRef}
                  type='file'
                  accept='image/*'
                  multiple
                  className='hidden'
                  onChange={(event) => {
                    void handleElementUploadFiles(event.target.files);
                  }}
                />
                <button
                  type='button'
                  onClick={() => elementUploadInputRef.current?.click()}
                  disabled={elementUploadLoading}
                  className='flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-violet-600 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <Upload size={14} />
                  {elementUploadLoading ? '업로드 중...' : '업로드'}
                </button>
                <div className='flex flex-wrap gap-1'>
                  {(['원단', '시보리원단', '라벨', '부자재'] as const).map((category) => {
                    const active = elementUploadCategory === category;
                    return (
                      <button
                        key={`upload-category-${category}`}
                        type='button'
                        onClick={() => setElementUploadCategory(category)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                          active
                            ? 'border-violet-500 bg-violet-50 text-violet-600'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
                {elementUploadError ? <p className='text-[11px] text-rose-500'>{elementUploadError}</p> : null}
              </div>

              <section className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-semibold text-gray-700'>업로드 항목</h4>
                  <button
                    type='button'
                    onClick={() => setElementWorkspaceView('workspace')}
                    className='text-[11px] text-gray-500 hover:text-gray-700'
                  >
                    더보기
                  </button>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  {elementWorkspaceLoading
                    ? ELEMENT_PLACEHOLDER_ITEMS.map((_, index) => (
                        <div key={`element-upload-loading-${index}`} className='aspect-square rounded-md bg-[#f3f3f5]' />
                      ))
                    : previewUploadedElementFiles.map((file) =>
                        renderElementWorkspaceFileCard(
                          file,
                          'element-upload',
                          (targetFile) => {
                            toggleElementDetail(targetFile.id);
                          },
                          true,
                        ),
                      )}
                </div>
                {!elementWorkspaceLoading && !elementUploadError && previewUploadedElementFiles.length === 0 ? (
                  <p className='text-[11px] text-gray-400'>이 작업지시서에 업로드된 요소가 없습니다.</p>
                ) : null}
              </section>

              <section className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <button
                    type='button'
                    onClick={() => setElementWorkspaceView('workspace')}
                    className='text-xs font-semibold text-gray-700 hover:text-gray-900'
                  >
                    나의 워크스페이스
                  </button>
                  <button
                    type='button'
                    onClick={() => setElementWorkspaceView('workspace')}
                    className='text-[11px] text-gray-500 hover:text-gray-700'
                  >
                    더보기
                  </button>
                </div>
                <div className='grid w-full grid-cols-2 gap-2 text-left'>
                  {elementWorkspaceLoading
                    ? ELEMENT_PLACEHOLDER_ITEMS.map((_, index) => (
                        <div key={`element-workspace-loading-${index}`} className='aspect-square rounded-md bg-[#f3f3f5]' />
                      ))
                    : previewElementWorkspaceFiles.map((file) =>
                        renderElementWorkspaceFileCard(file, 'element-workspace', (targetFile) => {
                          toggleElementDetail(targetFile.id);
                        }, true),
                      )}
                </div>
                {!elementWorkspaceLoading && elementWorkspaceError ? (
                  <p className='text-[11px] text-rose-500'>{elementWorkspaceError}</p>
                ) : null}
                {!elementWorkspaceLoading && !elementWorkspaceError && previewElementWorkspaceFiles.length === 0 ? (
                  <p className='text-[11px] text-gray-400'>표시할 파일이 없습니다.</p>
                ) : null}
              </section>
            </>
          ) : (
            <>
              <div className='flex items-center gap-1'>
                <button
                  type='button'
                  onClick={() => setElementWorkspaceView('overview')}
                  className='inline-flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  aria-label='요소 목록으로 돌아가기'
                >
                  <ChevronLeft size={16} />
                </button>
                <p className='text-sm font-semibold text-gray-800'>나의 워크스페이스</p>
              </div>

              <div className='flex flex-wrap gap-1.5'>
                {ELEMENT_WORKSPACE_CATEGORIES.map((category) => {
                  const active = elementWorkspaceCategory === category;
                  return (
                    <button
                      key={category}
                      type='button'
                      onClick={() => setElementWorkspaceCategory(category)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                        active
                          ? 'border-violet-500 bg-violet-50 text-violet-600'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <div className='grid grid-cols-2 gap-2'>
                {elementWorkspaceLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <div key={`workspace-filtered-loading-${index}`} className='aspect-square rounded-md bg-[#f3f3f5]' />
                    ))
                  : filteredElementWorkspaceFiles.map((file) =>
                      renderElementWorkspaceFileCard(file, 'workspace-filtered', (targetFile) => {
                        toggleElementDetail(targetFile.id);
                      }, true),
                    )}
              </div>
              {!elementWorkspaceLoading && elementWorkspaceError ? (
                <p className='text-[11px] text-rose-500'>{elementWorkspaceError}</p>
              ) : null}
              {!elementWorkspaceLoading && !elementWorkspaceError && filteredElementWorkspaceFiles.length === 0 ? (
                <p className='text-[11px] text-gray-400'>필터 조건에 맞는 파일이 없습니다.</p>
              ) : null}
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2'>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={`history-placeholder-${i}`}
              className='rounded-md border border-gray-200 bg-white px-2 py-1.5'
            >
              <div className='mb-1 h-2 w-2/3 rounded bg-gray-200' />
              <div className='h-2 w-1/3 rounded bg-gray-100' />
            </div>
          ))}
          <p className='pt-1 text-center text-[11px] text-gray-400'>히스토리는 준비 중입니다</p>
        </div>
      )}

      {activeTab === 'comment' && (
        <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`comment-placeholder-${i}`}
              className='rounded-md border border-gray-200 bg-white px-2 py-2'
            >
              <div className='mb-1 flex items-center gap-2'>
                <div className='h-4 w-4 rounded-full bg-gray-200' />
                <div className='h-2 w-16 rounded bg-gray-200' />
              </div>
              <div className='mb-1 h-2 w-full rounded bg-gray-100' />
              <div className='h-2 w-3/4 rounded bg-gray-100' />
            </div>
          ))}
          <p className='pt-1 text-center text-[11px] text-gray-400'>코멘트는 준비 중입니다</p>
        </div>
      )}
    </>
  );

  const elementDetailPanelPortal =
    selectedElementDetailFile && elementDetailPosition
      ? createPortal(
          <div
            ref={elementDetailPanelRef}
            className='fixed z-[700] rounded-xl border border-gray-200 bg-white p-3 shadow-[0_20px_50px_rgba(15,23,42,0.22)] transition-[opacity,transform] duration-200 ease-out'
            style={{
              top: elementDetailPosition.top,
              left: elementDetailPosition.left,
              width: ELEMENT_DETAIL_PANEL_WIDTH,
            }}
          >
            <div className='mb-2 flex items-start gap-2'>
              <div className='h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100'>
                {selectedElementDetailFile.thumbnailUrl ? (
                  <img
                    src={selectedElementDetailFile.thumbnailUrl}
                    alt={selectedElementDetailFile.name}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center'>
                    <Shapes size={18} className='text-gray-400' />
                  </div>
                )}
              </div>
              <div className='min-w-0'>
                <p className='truncate text-xs font-semibold text-gray-800'>
                  {selectedElementDetailFile.name}
                </p>
                <p className='mt-0.5 text-[11px] text-gray-500'>
                  {selectedElementDetailFile.category} · {selectedElementDetailFile.type}
                </p>
                <p className='mt-1 text-[10px] text-violet-500'>모듈 영역으로 드래그해 추가</p>
              </div>
            </div>

            <div className='rounded-md border border-gray-100 bg-gray-50/70 px-2 py-1.5'>
              <div className='grid grid-cols-[68px_1fr] gap-x-2 gap-y-1'>
                {elementDetailSummaryRows.map((row) => (
                  <React.Fragment key={`summary-${row.label}`}>
                    <span className='text-[10px] font-semibold text-gray-500'>{row.label}</span>
                    <span className='truncate text-[10px] text-gray-700'>{row.value}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <button
              type='button'
              onClick={() => setIsElementDetailExpanded((prev) => !prev)}
              className='mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800'
            >
              {isElementDetailExpanded ? '상세 접기' : '더보기'}
              <ChevronDown
                size={13}
                className={`transition-transform duration-300 ${isElementDetailExpanded ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>

            <div
              className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${
                isElementDetailExpanded ? 'mt-2 max-h-[440px] opacity-100' : 'mt-0 max-h-0 opacity-0'
              }`}
            >
              <div className='max-h-48 overflow-y-auto rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5'>
                <div className='grid grid-cols-[100px_1fr] gap-x-2 gap-y-1'>
                  {elementDetailRows.map((row) => (
                    <React.Fragment key={`detail-${row.label}`}>
                      <span className='text-[10px] font-semibold text-gray-500'>{row.label}</span>
                      <span className='break-all text-[10px] text-gray-700'>{row.value}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className='mt-2'>
                <p className='mb-1 text-[10px] font-semibold tracking-[0.02em] text-gray-500 uppercase'>raw json</p>
                <pre className='max-h-36 overflow-auto rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-[10px] leading-4 text-gray-600'>
                  {elementDetailRawJson}
                </pre>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className='flex h-full min-h-0 bg-white p-2'>
        <div className='flex min-h-0 min-w-0 flex-1'>
        <nav className='flex w-14 shrink-0 flex-col gap-y-2'>
          <Link
            to='/faddit/drive'
            className='flex aspect-square cursor-pointer items-center justify-center rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-200/60'
            aria-label='패딧 홈으로 이동'
          >
            <img src={FadditLogoOnly} alt='Faddit' className='h-7 w-7' />
          </Link>

          {TOOL_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type='button'
              onClick={() => handleToolTabClick(key)}
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md p-2 text-[10px] transition-colors ${
                activeTab === key
                  ? 'bg-gray-100 text-gray-800'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />
              {label}
            </button>
          ))}
          {collapsible && (
            <div className='mt-auto flex justify-center py-2'>
              <button
                type='button'
                onClick={() => setContentOpen((open) => !open)}
                className='cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                aria-label={contentOpen ? '도구모음 접기' : '도구모음 펼치기'}
              >
                {contentOpen ? (
                  <ChevronsLeft size={18} strokeWidth={1.5} />
                ) : (
                  <ChevronsRight size={18} strokeWidth={1.5} />
                )}
              </button>
            </div>
          )}
        </nav>

        {collapsible ? (
          <div
            className='flex shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-in-out'
            style={{ width: contentOpen ? CONTENT_PANEL_WIDTH + GAP_X : 0 }}
          >
            <div
              className='flex min-h-0 flex-1 flex-col gap-y-3 pl-3 transition-opacity duration-300 ease-in-out'
              style={{ opacity: contentOpen ? 1 : 0, minWidth: CONTENT_PANEL_WIDTH }}
            >
              {tabContent}
            </div>
          </div>
        ) : (
          <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-y-3 pl-3'>{tabContent}</div>
        )}
        </div>
      </div>
      {elementDetailPanelPortal}
    </>
  );
}

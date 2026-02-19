import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { LayoutGrid, List } from 'lucide-react';
import DriveItemCard from '../../../components/DriveItemCard';
import GlobalTooltip from '../../../components/ui/GlobalTooltip';
import Notification from '../../../components/Notification';
import ChildCloth from '../../../images/faddit/childcloth.png';
import { useDrive, DriveItem, DriveFolder } from '../../../context/DriveContext';

type ViewMode = 'grid' | 'list';

type DriveListEntry = {
  id: string;
  kind: 'folder' | 'file';
  title: string;
  subtitle?: string;
  date: string;
  size: string;
};

type DragSelectionEntry = {
  id: string;
  type: 'file' | 'folder';
  name: string;
};

type MarqueeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DriveFolderTile: React.FC<{
  folder: DriveFolder;
  isSelected: boolean;
  dragSelectionIds: string[];
  dragSelectionEntries: DragSelectionEntry[];
  onToggleSelect: (checked: boolean) => void;
  onPress: (event: React.MouseEvent<HTMLDivElement>) => void;
}> = ({ folder, isSelected, dragSelectionIds, dragSelectionEntries, onToggleSelect, onPress }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: folder.id,
    data: {
      type: 'drive-folder',
      title: folder.name,
      subtitle: '폴더',
      shared: folder.shared,
      selectedIds: dragSelectionIds,
      selectedEntries: dragSelectionEntries,
    },
  });

  const style = isDragging
    ? {
        opacity: 0.45,
      }
    : transform
      ? {
          transform: CSS.Translate.toString(transform),
        }
      : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-selectable-item='true'
      data-item-id={folder.id}
      onClick={onPress}
      className={`group relative flex cursor-grab touch-none items-center justify-between rounded-xl px-4 py-3 active:cursor-grabbing dark:bg-gray-800/70 ${
        isSelected
          ? 'bg-violet-100 ring-2 ring-violet-300 dark:bg-violet-500/20 dark:ring-violet-500/60'
          : 'bg-gray-100 dark:bg-gray-800/70'
      }`}
    >
      <label
        className={`absolute top-2 left-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white/95 shadow-sm transition-opacity dark:border-gray-600 dark:bg-gray-800/95 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <span className='sr-only'>Select folder</span>
        <input
          className='form-checkbox'
          type='checkbox'
          checked={isSelected}
          onChange={(event) => onToggleSelect(event.target.checked)}
        />
      </label>

      <div className='flex items-center gap-3'>
        {folder.shared ? (
          <svg
            className='h-5 w-5 shrink-0 fill-gray-600 dark:fill-gray-300'
            viewBox='0 0 20 20'
            aria-hidden='true'
          >
            <path d='M3.5 6A2.5 2.5 0 0 1 6 3.5h3.33c.44 0 .86.18 1.17.48l.69.69c.31.31.73.48 1.17.48H14A2.5 2.5 0 0 1 16.5 7v1.17a3.25 3.25 0 0 0-1-.17h-1.3A3.2 3.2 0 0 0 11 10.9v2.1a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 13V6Zm10.7 2a2.3 2.3 0 0 1 2.3 2.3v.2a2.9 2.9 0 1 1-4.6 2.35V10.9A2.9 2.9 0 0 1 14.8 8Zm0 1.4a1.5 1.5 0 0 0-1.5 1.5v1.9a1.5 1.5 0 0 0 3 0v-1.9a1.5 1.5 0 0 0-1.5-1.5Z' />
          </svg>
        ) : (
          <svg
            className='h-5 w-5 shrink-0 fill-gray-600 dark:fill-gray-300'
            viewBox='0 0 20 20'
            aria-hidden='true'
          >
            <path d='M2.5 4.75A2.25 2.25 0 0 1 4.75 2.5h3.21a2 2 0 0 1 1.41.59l.75.75c.19.19.44.29.71.29h4.42a2.25 2.25 0 0 1 2.25 2.25v6.87a2.25 2.25 0 0 1-2.25 2.25H4.75A2.25 2.25 0 0 1 2.5 13.25V4.75Z' />
          </svg>
        )}
        <span className='text-xl font-medium text-gray-800 dark:text-gray-100'>{folder.name}</span>
      </div>
    </div>
  );
};

const DriveListRow: React.FC<{
  entry: DriveListEntry;
  isSelected: boolean;
  isActive: boolean;
  dragSelectionIds: string[];
  dragSelectionEntries: DragSelectionEntry[];
  onToggleSelect: (checked: boolean) => void;
  onRowClick: (entry: DriveListEntry, event: React.MouseEvent<HTMLTableRowElement>) => void;
}> = ({
  entry,
  isSelected,
  isActive,
  dragSelectionIds,
  dragSelectionEntries,
  onToggleSelect,
  onRowClick,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: {
      type: entry.kind === 'folder' ? 'drive-folder' : 'drive-item',
      title: entry.title,
      subtitle: entry.subtitle,
      selectedIds: dragSelectionIds,
      selectedEntries: dragSelectionEntries,
    },
  });

  const style = isDragging
    ? {
        opacity: 0.45,
      }
    : transform
      ? {
          transform: CSS.Translate.toString(transform),
        }
      : undefined;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-selectable-item='true'
      data-item-id={entry.id}
      onClick={(event) => onRowClick(entry, event)}
      className={`cursor-grab border-t active:cursor-grabbing dark:border-gray-700/60 ${
        isSelected || isActive
          ? 'border-violet-200 bg-violet-50/40 dark:border-violet-500/40 dark:bg-violet-500/10'
          : 'border-gray-100 hover:bg-gray-50/70 dark:hover:bg-gray-800/50'
      }`}
    >
      <td className='px-4 py-3'>
        <div className='flex items-center gap-3'>
          <label
            className='inline-flex'
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <span className='sr-only'>Select {entry.title}</span>
            <input
              className='form-checkbox'
              type='checkbox'
              checked={isSelected}
              onChange={(event) => onToggleSelect(event.target.checked)}
            />
          </label>
          {entry.kind === 'folder' ? (
            <svg
              className='h-5 w-5 shrink-0 fill-gray-600 dark:fill-gray-300'
              viewBox='0 0 20 20'
              aria-hidden='true'
            >
              <path d='M2.5 4.75A2.25 2.25 0 0 1 4.75 2.5h3.21a2 2 0 0 1 1.41.59l.75.75c.19.19.44.29.71.29h4.42a2.25 2.25 0 0 1 2.25 2.25v6.87a2.25 2.25 0 0 1-2.25 2.25H4.75A2.25 2.25 0 0 1 2.5 13.25V4.75Z' />
            </svg>
          ) : (
            <svg className='h-5 w-5 shrink-0 fill-blue-500' viewBox='0 0 20 20' aria-hidden='true'>
              <path d='M5 2.5A1.5 1.5 0 0 0 3.5 4v12A1.5 1.5 0 0 0 5 17.5h10a1.5 1.5 0 0 0 1.5-1.5V7.25a1.5 1.5 0 0 0-.44-1.06l-3.75-3.75A1.5 1.5 0 0 0 11.25 2H5v.5Zm6.5.56V6a.5.5 0 0 0 .5.5h2.94l-3.44-3.44Z' />
            </svg>
          )}
          <div>
            <div
              className={`font-medium ${entry.kind === 'file' ? 'cursor-pointer text-gray-800 dark:text-gray-100' : 'text-gray-800 dark:text-gray-100'}`}
            >
              {entry.title}
            </div>
            {entry.kind === 'file' && entry.subtitle && (
              <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>{entry.subtitle}</div>
            )}
          </div>
        </div>
      </td>
      <td className='px-4 py-3 text-gray-600 dark:text-gray-300'>{entry.date}</td>
      <td className='px-4 py-3 text-gray-600 dark:text-gray-300'>{entry.size}</td>
      <td className='w-px px-4 py-3 text-right'>
        <button
          type='button'
          className='inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200'
          aria-label='항목 옵션'
        >
          <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16' aria-hidden='true'>
            <path d='M8 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm0 7.5A1.5 1.5 0 1 0 8 7.5a1.5 1.5 0 0 0 0 3Zm0 5.5A1.5 1.5 0 1 0 8 13a1.5 1.5 0 0 0 0 3Z' />
          </svg>
        </button>
      </td>
    </tr>
  );
};

const FadditDrive: React.FC = () => {
  const { items, setItems, driveFolders, setDriveFolders } = useDrive();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeItemId, setActiveItemId] = useState<string>('');
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [deleteToastOpen, setDeleteToastOpen] = useState(false);
  const [deletedSnapshot, setDeletedSnapshot] = useState<{
    items: DriveItem[];
    folders: DriveFolder[];
  }>({
    items: [],
    folders: [],
  });
  const [deletedMessage, setDeletedMessage] = useState('');
  const gridSelectionRef = useRef<HTMLDivElement | null>(null);
  const gridContentRef = useRef<HTMLDivElement | null>(null);
  const suppressBlankClearRef = useRef(false);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const clearSelectionEffects = () => {
    setSelectedIds([]);
    setActiveItemId('');
    setDetailPanelOpen(false);
  };

  useEffect(() => {
    if (items.length === 0) {
      const mockItems = Array.from({ length: 10 }).map((_, index) => ({
        id: `drive-item-${index + 1}`,
        imageSrc: ChildCloth,
        imageAlt: 'Application 01',
        title: `[패딧] 2025 S/S 남성 청바지_데미지 ${index + 1}`,
        subtitle: '테스트 필드',
        badge: '테스트 뱃지1',
        owner: index % 2 === 0 ? 'Carolyn McNeail' : 'Faddit Team',
        date: `2026-02-${String((index % 9) + 1).padStart(2, '0')}`,
        size: `${(index % 5) + 1}.${index % 3} MB`,
      }));
      setItems(mockItems);
    }
  }, []);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter(
        (id) =>
          items.some((item) => item.id === id) || driveFolders.some((folder) => folder.id === id),
      ),
    );
  }, [items, driveFolders]);

  useEffect(() => {
    if (items.length === 0) {
      setActiveItemId('');
      setDetailPanelOpen(false);
      return;
    }

    if (activeItemId && !items.some((item) => item.id === activeItemId)) {
      setActiveItemId('');
      setDetailPanelOpen(false);
    }
  }, [items, activeItemId]);

  useEffect(() => {
    if (!deleteToastOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDeleteToastOpen(false);
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [deleteToastOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearSelectionEffects();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const applySelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((itemId) => itemId !== id);
    });
  };

  const isMultiSelectGesture = (event: React.MouseEvent) => event.metaKey || event.ctrlKey;

  const handleToggleWithGesture = (id: string, event: React.MouseEvent) => {
    if (isMultiSelectGesture(event)) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((entryId) => entryId !== id) : [...prev, id],
      );
      return;
    }

    setSelectedIds([id]);
  };

  const handleFolderPress = (folderId: string, event: React.MouseEvent<HTMLDivElement>) => {
    handleToggleWithGesture(folderId, event);
  };

  const handleFileCardClick = (itemId: string, event: React.MouseEvent<HTMLDivElement>) => {
    handleToggleWithGesture(itemId, event);

    if (!isMultiSelectGesture(event)) {
      setActiveItemId(itemId);
      setDetailPanelOpen(true);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      return;
    }

    const deletingItems = items.filter((item) => selectedSet.has(item.id));
    const deletingFolders = driveFolders.filter((folder) => selectedSet.has(folder.id));
    const deleteCount = deletingItems.length + deletingFolders.length;

    if (deleteCount === 1) {
      if (deletingFolders.length === 1) {
        setDeletedMessage(`${deletingFolders[0].name}(이) 삭제되었습니다`);
      } else {
        setDeletedMessage(`${deletingItems[0].title}(이) 삭제되었습니다`);
      }
    } else {
      setDeletedMessage(`${deleteCount}개 항목이 삭제되었습니다`);
    }

    setDeletedSnapshot({
      items,
      folders: driveFolders,
    });
    setItems((prev) => prev.filter((item) => !selectedSet.has(item.id)));
    setDriveFolders((prev) => prev.filter((folder) => !selectedSet.has(folder.id)));
    setSelectedIds([]);
    setDeleteToastOpen(true);
  };

  const handleUndoDelete = () => {
    setItems(deletedSnapshot.items);
    setDriveFolders(deletedSnapshot.folders);
    setDeleteToastOpen(false);
  };

  const activeItem = items.find((item) => item.id === activeItemId) || null;

  const listEntries = useMemo<DriveListEntry[]>(
    () => [
      ...driveFolders.map((folder) => ({
        id: folder.id,
        kind: 'folder' as const,
        title: folder.name,
        date: `${folder.updatedAt} ${folder.updatedBy}`,
        size: '—',
      })),
      ...items.map((item) => ({
        id: item.id,
        kind: 'file' as const,
        title: item.title,
        subtitle: item.subtitle,
        date: `${item.date || '-'} ${item.owner || ''}`.trim(),
        size: item.size || '-',
      })),
    ],
    [items, driveFolders],
  );

  const getDragSelection = (
    baseId: string,
    baseType: 'file' | 'folder',
    baseName: string,
  ): { ids: string[]; entries: DragSelectionEntry[] } => {
    if (!selectedSet.has(baseId)) {
      return {
        ids: [baseId],
        entries: [{ id: baseId, type: baseType, name: baseName }],
      };
    }

    const selectedEntries: DragSelectionEntry[] = [];
    for (const folder of driveFolders) {
      if (selectedSet.has(folder.id)) {
        selectedEntries.push({ id: folder.id, type: 'folder', name: folder.name });
      }
    }
    for (const file of items) {
      if (selectedSet.has(file.id)) {
        selectedEntries.push({ id: file.id, type: 'file', name: file.title });
      }
    }

    return {
      ids: selectedEntries.map((entry) => entry.id),
      entries: selectedEntries,
    };
  };

  const handleListRowClick = (
    entry: DriveListEntry,
    event: React.MouseEvent<HTMLTableRowElement>,
  ) => {
    handleToggleWithGesture(entry.id, event);

    if (entry.kind === 'file' && !isMultiSelectGesture(event)) {
      setActiveItemId(entry.id);
      setDetailPanelOpen(true);
    }
  };

  const handleGridMarqueeSelect = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !gridSelectionRef.current) {
      return;
    }

    const target = event.target as HTMLElement;
    const pressedOnSelectable = target.closest('[data-selectable-item="true"]');
    if (pressedOnSelectable) {
      return;
    }

    if (target.closest('button,input,label,a,textarea,select')) {
      return;
    }

    const container = gridSelectionRef.current;
    if (gridContentRef.current) {
      const contentRect = gridContentRef.current.getBoundingClientRect();
      if (event.clientY < contentRect.top) {
        return;
      }
    }

    const containerRect = container.getBoundingClientRect();
    const startX = Math.max(containerRect.left, Math.min(event.clientX, containerRect.right));
    const startY = Math.max(containerRect.top, Math.min(event.clientY, containerRect.bottom));
    let hasDragged = false;

    const updateSelection = (clientX: number, clientY: number) => {
      const currentX = Math.max(containerRect.left, Math.min(clientX, containerRect.right));
      const currentY = Math.max(containerRect.top, Math.min(clientY, containerRect.bottom));

      const left = Math.min(startX, currentX);
      const right = Math.max(startX, currentX);
      const top = Math.min(startY, currentY);
      const bottom = Math.max(startY, currentY);

      const edgeThreshold = 56;
      const scrollStep = 18;
      if (currentY > containerRect.bottom - edgeThreshold) {
        container.scrollTop += scrollStep;
      } else if (currentY < containerRect.top + edgeThreshold) {
        container.scrollTop -= scrollStep;
      }

      setMarqueeRect({
        x: left - containerRect.left + container.scrollLeft,
        y: top - containerRect.top + container.scrollTop,
        width: right - left,
        height: bottom - top,
      });

      const nodes = Array.from(
        container.querySelectorAll<HTMLElement>('[data-selectable-item="true"][data-item-id]'),
      );

      const nextSelectedIds = nodes
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top;
        })
        .map((node) => node.dataset.itemId)
        .filter((id): id is string => Boolean(id));

      setSelectedIds(nextSelectedIds);
    };

    updateSelection(startX, startY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!hasDragged) {
        const movedX = Math.abs(moveEvent.clientX - startX);
        const movedY = Math.abs(moveEvent.clientY - startY);
        hasDragged = movedX > 4 || movedY > 4;
      }

      updateSelection(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      if (hasDragged) {
        suppressBlankClearRef.current = true;
        requestAnimationFrame(() => {
          suppressBlankClearRef.current = false;
        });
      }

      setMarqueeRect(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    event.preventDefault();
  };

  const handleContainerBlankClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressBlankClearRef.current) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('[data-selectable-item="true"],button,input,label,a,textarea,select')) {
      return;
    }

    if (gridContentRef.current) {
      const contentRect = gridContentRef.current.getBoundingClientRect();
      if (event.clientY < contentRect.top) {
        return;
      }
    }

    clearSelectionEffects();
  };

  const detailPanelContent =
    detailPanelOpen && activeItem ? (
      <>
        <div className='inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-600'>
          {activeItem.badge || '작업지시서'}
        </div>

        <h2 className='mt-4 text-[32px] leading-tight font-bold text-gray-900 dark:text-gray-100'>
          {activeItem.title}
        </h2>

        <div className='mt-6 space-y-3 text-[25px] text-gray-700 dark:text-gray-300'>
          <div className='flex items-center'>
            <span className='mr-2 text-gray-400'>↬</span>
            <span>브랜드 {activeItem.subtitle}</span>
          </div>
          <div className='flex items-center'>
            <span className='mr-2 text-gray-400'>≡</span>
            <span>{activeItem.size || '37 modules'}</span>
          </div>
          <div className='flex items-center'>
            <span className='mr-2 text-gray-400'>◧</span>
            <span>Access on mobile and TV</span>
          </div>
        </div>

        <div className='mt-5 -ml-0.5 flex -space-x-3'>
          <img
            className='box-content rounded-full border-2 border-white dark:border-gray-800'
            src={ChildCloth}
            width='28'
            height='28'
            alt='avatar'
          />
          <img
            className='box-content rounded-full border-2 border-white dark:border-gray-800'
            src={ChildCloth}
            width='28'
            height='28'
            alt='avatar'
          />
          <img
            className='box-content rounded-full border-2 border-white dark:border-gray-800'
            src={ChildCloth}
            width='28'
            height='28'
            alt='avatar'
          />
          <img
            className='box-content rounded-full border-2 border-white dark:border-gray-800'
            src={ChildCloth}
            width='28'
            height='28'
            alt='avatar'
          />
        </div>

        <div className='mt-16'>
          <h3 className='mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100'>Receipts</h3>
          <div className='rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center dark:border-gray-700/60 dark:bg-gray-800/40'>
            <svg
              className='mx-auto mb-3 h-4 w-4 fill-gray-400'
              viewBox='0 0 16 16'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path d='M8 4c-.3 0-.5.1-.7.3L1.6 10 3 11.4l4-4V16h2V7.4l4 4 1.4-1.4-5.7-5.7C8.5 4.1 8.3 4 8 4ZM1 2h14V0H1v2Z' />
            </svg>
            <p className='text-base text-gray-500 italic'>We accept PNG, JPEG, and PDF files.</p>
          </div>
        </div>

        <div className='mt-8'>
          <h3 className='mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100'>Notes</h3>
          <textarea
            className='form-textarea min-h-[160px] w-full rounded-xl border-gray-200 bg-white focus:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
            placeholder='Write a note...'
          />
        </div>

        <div className='mt-8 flex items-center gap-3 pb-6'>
          <button className='btn w-1/2 border-gray-200 text-gray-800 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-300 dark:hover:border-gray-600'>
            <svg className='mr-2 h-4 w-4 rotate-180 fill-current text-gray-400' viewBox='0 0 16 16'>
              <path d='M8 4c-.3 0-.5.1-.7.3L1.6 10 3 11.4l4-4V16h2V7.4l4 4 1.4-1.4-5.7-5.7C8.5 4.1 8.3 4 8 4ZM1 2h14V0H1v2Z' />
            </svg>
            Download
          </button>
          <button className='btn w-1/2 border-gray-200 text-red-500 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600'>
            <svg className='mr-2 h-4 w-4 fill-current' viewBox='0 0 16 16'>
              <path d='M7.001 3h2v4h-2V3Zm1 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM15 16a1 1 0 0 1-.6-.2L10.667 13H1a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1ZM2 11h9a1 1 0 0 1 .6.2L14 13V2H2v9Z' />
            </svg>
            Report
          </button>
        </div>
      </>
    ) : null;

  return (
    <div className='h-[calc(100dvh-64px)] w-full overflow-hidden'>
      <div className='flex h-full'>
        <main
          className={`flex h-full min-w-0 flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-900 ${
            detailPanelOpen ? 'lg:w-[70%]' : 'w-full'
          }`}
        >
          <div
            ref={gridSelectionRef}
            onMouseDown={handleGridMarqueeSelect}
            onClick={handleContainerBlankClick}
            className='scrollbar-drive relative h-full overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 lg:px-8'
          >
            <div className='mb-8 sm:flex sm:items-center sm:justify-between'>
              <div className='mb-4 sm:mb-0'>
                <h1 className='text-2xl font-bold text-gray-800 md:text-3xl dark:text-gray-100'>
                  홈
                </h1>
              </div>

              <div className='grid grid-flow-col justify-start gap-2 sm:auto-cols-max sm:justify-end'>
                <div className='flex flex-wrap'>
                  <GlobalTooltip content='리스트로 보기' position='bottom'>
                    <button
                      type='button'
                      onClick={() => setViewMode('list')}
                      className={`btn cursor-pointer rounded-r-none border-gray-200 dark:border-gray-700/60 ${
                        viewMode === 'list'
                          ? 'bg-white text-violet-500 dark:bg-gray-800'
                          : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-900'
                      }`}
                      aria-label='List view'
                    >
                      <List className='h-4 w-4' strokeWidth={2} />
                    </button>
                  </GlobalTooltip>

                  <GlobalTooltip content='그리드로 보기' position='bottom'>
                    <button
                      type='button'
                      onClick={() => setViewMode('grid')}
                      className={`btn -ml-px cursor-pointer rounded-l-none border-gray-200 dark:border-gray-700/60 ${
                        viewMode === 'grid'
                          ? 'bg-white text-violet-500 dark:bg-gray-800'
                          : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-900'
                      }`}
                      aria-label='Grid view'
                    >
                      <LayoutGrid className='h-4 w-4' strokeWidth={2} />
                    </button>
                  </GlobalTooltip>
                </div>

                {selectedIds.length > 0 && (
                  <button
                    type='button'
                    onClick={handleBulkDelete}
                    className='btn border-gray-200 bg-white text-red-500 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:hover:border-gray-600'
                  >
                    <svg className='h-4 w-4 shrink-0 fill-current' viewBox='0 0 16 16'>
                      <path d='M5 7h2v6H5V7Zm4 0h2v6H9V7Zm3-6v2h4v2h-1v10c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1V5H0V3h4V1c0-.6.4-1 1-1h6c.6 0 1 .4 1 1ZM6 2v1h4V2H6Zm7 3H3v9h10V5Z' />
                    </svg>
                    <span className='max-xs:sr-only ml-2'>삭제</span>
                  </button>
                )}

                <button
                  type='button'
                  className='btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white'
                >
                  <svg
                    className='xs:hidden shrink-0 fill-current'
                    width='16'
                    height='16'
                    viewBox='0 0 16 16'
                  >
                    <path d='M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z' />
                  </svg>
                  <span className='max-xs:sr-only'>Add View</span>
                </button>
              </div>
            </div>

            <div ref={gridContentRef} className='mt-8'>
              {viewMode === 'grid' ? (
                <div className='space-y-6'>
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                    {driveFolders.map((folder) => {
                      const dragSelection = getDragSelection(folder.id, 'folder', folder.name);
                      return (
                        <DriveFolderTile
                          key={folder.id}
                          folder={folder}
                          isSelected={selectedSet.has(folder.id)}
                          dragSelectionIds={dragSelection.ids}
                          dragSelectionEntries={dragSelection.entries}
                          onToggleSelect={(checked) => applySelection(folder.id, checked)}
                          onPress={(event) => handleFolderPress(folder.id, event)}
                        />
                      );
                    })}
                  </div>

                  <div className='grid grid-cols-12 gap-6'>
                    {items.map((item) => {
                      const dragSelection = getDragSelection(item.id, 'file', item.title);
                      return (
                        <DriveItemCard
                          key={item.id}
                          id={item.id}
                          imageSrc={item.imageSrc}
                          imageAlt={item.imageAlt}
                          title={item.title}
                          subtitle={item.subtitle}
                          badge={item.badge}
                          actionLabel='View'
                          actionHref='#0'
                          isSelected={selectedSet.has(item.id)}
                          isActive={activeItemId === item.id}
                          onSelectChange={applySelection}
                          onCardClick={handleFileCardClick}
                          dragSelectionIds={dragSelection.ids}
                          dragSelectionEntries={dragSelection.entries}
                          className='col-span-full sm:col-span-6 xl:col-span-3'
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className='overflow-x-auto rounded-xl bg-white shadow-xs dark:bg-gray-800'>
                  <table className='w-full table-auto text-sm dark:text-gray-300'>
                    <thead className='bg-gray-50 text-xs font-semibold text-gray-500 dark:bg-gray-900/20 dark:text-gray-400'>
                      <tr>
                        <th className='px-4 py-3 text-left'>이름</th>
                        <th className='px-4 py-3 text-left'>수정 날짜</th>
                        <th className='px-4 py-3 text-left'>파일 크기</th>
                        <th className='w-px px-4 py-3 text-right'>정렬</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listEntries.map((entry) => {
                        const dragSelection = getDragSelection(
                          entry.id,
                          entry.kind === 'folder' ? 'folder' : 'file',
                          entry.title,
                        );

                        return (
                          <DriveListRow
                            key={entry.id}
                            entry={entry}
                            isSelected={selectedSet.has(entry.id)}
                            isActive={entry.kind === 'file' && activeItemId === entry.id}
                            dragSelectionIds={dragSelection.ids}
                            dragSelectionEntries={dragSelection.entries}
                            onToggleSelect={(checked) => applySelection(entry.id, checked)}
                            onRowClick={handleListRowClick}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {marqueeRect && (
              <div
                className='pointer-events-none absolute z-30 border border-violet-400 bg-violet-200/20'
                style={{
                  left: marqueeRect.x,
                  top: marqueeRect.y,
                  width: marqueeRect.width,
                  height: marqueeRect.height,
                }}
              />
            )}
          </div>
        </main>

        <aside
          className={`hidden h-full overflow-hidden border-l border-gray-200 bg-[#f9f9f9] transition-all duration-300 ease-out lg:block dark:border-gray-700/60 ${
            detailPanelOpen && activeItem ? 'w-[30%]' : 'w-0'
          }`}
        >
          <div
            className={`scrollbar-drive h-full overflow-y-auto px-8 py-6 transition-all duration-300 ease-out ${
              detailPanelOpen && activeItem
                ? 'translate-x-0 opacity-100'
                : '-translate-x-4 opacity-0'
            }`}
          >
            {activeItem ? (
              <div>
                <div className='mb-2 flex justify-end'>
                  <button
                    type='button'
                    onClick={() => setDetailPanelOpen(false)}
                    className='rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                    aria-label='상세 패널 닫기'
                  >
                    <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
                      <path d='M7.95 6.536 12.192 2.293a1 1 0 1 1 1.415 1.414L9.364 7.95l4.243 4.242a1 1 0 1 1-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 0 1-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 0 1 1.414-1.414L7.95 6.536Z' />
                    </svg>
                  </button>
                </div>
                {detailPanelContent}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-300 lg:hidden ${
          detailPanelOpen && activeItem
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setDetailPanelOpen(false)}
      >
        <div
          className={`h-full w-full overflow-y-auto bg-[#f9f9f9] p-4 transition-transform duration-300 sm:p-6 dark:bg-gray-900 ${
            detailPanelOpen && activeItem ? 'translate-y-0' : 'translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {activeItem ? (
            <>
              <div className='mb-2 flex justify-end'>
                <button
                  type='button'
                  onClick={() => setDetailPanelOpen(false)}
                  className='rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                  aria-label='상세 패널 닫기'
                >
                  <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
                    <path d='M7.95 6.536 12.192 2.293a1 1 0 1 1 1.415 1.414L9.364 7.95l4.243 4.242a1 1 0 1 1-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 0 1-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 0 1 1.414-1.414L7.95 6.536Z' />
                  </svg>
                </button>
              </div>
              {detailPanelContent}
            </>
          ) : null}
        </div>
      </div>

      {/*  <Notification
        type='warning'
        open={deleteToastOpen}
        setOpen={setDeleteToastOpen}
        className='fixed right-4 bottom-4 z-50'
        showAction={false}
      >
        <div className='flex min-w-[360px] items-center justify-between gap-5 py-1 text-base text-gray-700 dark:text-gray-200'>
          <span className='font-bold'>{deletedMessage}</span>
          <button
            type='button'
            onClick={handleUndoDelete}
            className='shrink-0 text-sm font-bold text-[var(--color-faddit)] hover:opacity-80'
          >
            실행취소
          </button>
        </div>
      </Notification> */}

      <Notification
        type='warning'
        open={deleteToastOpen}
        setOpen={setDeleteToastOpen}
        showAction={false}
        className='fixed right-4 bottom-4 z-50'
      >
        <div className='mb-1 font-medium text-gray-800 dark:text-gray-100'>삭제 완료</div>
        <div>
          <span>{deletedMessage}</span>
          <div>
            <button
              type='button'
              onClick={handleUndoDelete}
              className='shrink-0 cursor-pointer text-sm font-bold text-[var(--color-faddit)] hover:opacity-80'
            >
              실행취소
            </button>
          </div>
        </div>
      </Notification>
    </div>
  );
};

export default FadditDrive;

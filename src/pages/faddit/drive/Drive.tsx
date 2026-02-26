import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DriveItemCard from '../../../components/DriveItemCard';
import GlobalTooltip from '../../../components/ui/GlobalTooltip';
import Notification from '../../../components/Notification';
import { useDrive, DriveItem, DriveFolder, SidebarItem } from '../../../context/DriveContext';
import { useAuthStore } from '../../../store/useAuthStore';
import { useDriveStore } from '../../../store/useDriveStore';
import TemplateCreateModal, {
  CreateMaterialFormValue,
  CreateWorksheetFormValue,
} from './components/TemplateCreateModal';
import CreateFolderModal from './components/CreateFolderModal';
import CreateWorksheetModal from './components/CreateWorksheetModal';
import {
  createMaterial,
  getMaterialFieldDefs,
  getMaterialsByFileSystem,
  MaterialFieldDef,
  updateMaterial,
} from '../../../lib/api/materialApi';
import {
  createDriveFile,
  DriveNode,
  DriveSearchCategory,
  DriveUploadTag,
  getDriveFilePreviewUrl,
  searchDriveItems,
  updateDriveItems,
} from '../../../lib/api/driveApi';
import { createWorksheet } from '../../../lib/api/worksheetApi';
import ChildClothImage from '../../../images/faddit/childcloth.png';

type ViewMode = 'grid' | 'list';

type DriveListEntry = {
  id: string;
  kind: 'folder' | 'file';
  nodeType?: DriveNode['type'];
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

const SEARCH_CATEGORY_VALUES: DriveSearchCategory[] = [
  'folder',
  'worksheet',
  'faddit',
  'schematic',
  'label',
  'fabric',
  'pattern',
  'print',
  'etc',
];

const isSearchCategory = (value: string): value is DriveSearchCategory => {
  return SEARCH_CATEGORY_VALUES.includes(value as DriveSearchCategory);
};

const formatBytes = (value?: number) => {
  if (!value || Number.isNaN(value)) {
    return '-';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let next = value / 1024;
  let index = 0;
  while (next >= 1024 && index < units.length - 1) {
    next /= 1024;
    index += 1;
  }

  return `${next.toFixed(next >= 10 ? 0 : 1)} ${units[index]}`;
};

const isImageFile = (extension?: string) => {
  if (!extension) {
    return false;
  }

  const value = extension.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(value);
};

const toEditableAttributeValue = (value: unknown) => value;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read image file'));
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const shouldShowMaterialField = (fieldDef: MaterialFieldDef, values: Record<string, unknown>) => {
  if (!fieldDef.show_if) {
    return true;
  }

  const rawValue = values[fieldDef.show_if.field];
  const compareValue =
    typeof rawValue === 'object' && rawValue !== null
      ? String((rawValue as { selected?: unknown }).selected ?? rawValue)
      : String(rawValue ?? '');
  return fieldDef.show_if.in.includes(compareValue);
};

const getSelectOptions = (fieldDef: MaterialFieldDef) => {
  if (Array.isArray(fieldDef.options)) {
    return fieldDef.options.map((option) => String(option));
  }
  if (
    fieldDef.options &&
    typeof fieldDef.options === 'object' &&
    !Array.isArray(fieldDef.options)
  ) {
    const optionsRaw = (fieldDef.options as { options?: unknown }).options;
    if (Array.isArray(optionsRaw)) {
      return optionsRaw.map((option) => String(option));
    }
  }
  return [];
};

const getUnitOptions = (fieldDef: MaterialFieldDef) => {
  if (
    fieldDef.options &&
    typeof fieldDef.options === 'object' &&
    !Array.isArray(fieldDef.options)
  ) {
    const unitsRaw = (fieldDef.options as { units?: unknown }).units;
    if (Array.isArray(unitsRaw)) {
      return unitsRaw.map((unit) => String(unit));
    }
  }
  return [];
};

const getNumberPairLabels = (fieldDef: MaterialFieldDef) => {
  if (
    fieldDef.options &&
    typeof fieldDef.options === 'object' &&
    !Array.isArray(fieldDef.options)
  ) {
    const options = fieldDef.options as { first_label?: unknown; second_label?: unknown };
    return {
      firstLabel: typeof options.first_label === 'string' ? options.first_label : '값 1',
      secondLabel: typeof options.second_label === 'string' ? options.second_label : '값 2',
    };
  }
  return { firstLabel: '값 1', secondLabel: '값 2' };
};

const getNumberPairKind = (fieldDef: MaterialFieldDef) => {
  if (
    fieldDef.options &&
    typeof fieldDef.options === 'object' &&
    !Array.isArray(fieldDef.options)
  ) {
    const pairKind = (fieldDef.options as { pair_kind?: unknown }).pair_kind;
    return pairKind === 'price_quantity' ? 'price_quantity' : 'width_height';
  }
  return 'width_height';
};

const getDefaultEditFieldValue = (fieldDef: MaterialFieldDef): unknown => {
  if (fieldDef.input_type === 'option_with_other') {
    return { selected: '', customText: '' };
  }
  if (fieldDef.input_type === 'number_with_option') {
    const units = getUnitOptions(fieldDef);
    return { unit: units[0] ?? '' };
  }
  if (fieldDef.input_type === 'number_pair') {
    return {};
  }
  return '';
};

const MATERIAL_TOP_FIELDS = new Set([
  'code_internal',
  'vendor_name',
  'item_name',
  'origin_country',
]);

const formatNumberWithCommas = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return value.toLocaleString('en-US');
};

const parseFormattedNumber = (raw: string) => {
  const normalized = raw.replace(/,/g, '').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const formatDualLengthText = (value: unknown) => {
  if (typeof value !== 'object' || value === null) return null;
  const payload = value as {
    value_cm?: unknown;
    value_inch?: unknown;
    value?: unknown;
    unit?: unknown;
  };
  let cm = typeof payload.value_cm === 'number' ? payload.value_cm : undefined;
  let inch = typeof payload.value_inch === 'number' ? payload.value_inch : undefined;

  const numeric = typeof payload.value === 'number' ? payload.value : undefined;
  const unit = String(payload.unit ?? '');
  if (numeric !== undefined && unit === 'cm') {
    cm = numeric;
    inch = numeric / 2.54;
  }
  if (numeric !== undefined && unit === 'inch') {
    inch = numeric;
    cm = numeric * 2.54;
  }

  if (cm === undefined && inch === undefined) return null;

  const cmText = cm !== undefined ? `${formatNumberWithCommas(cm)} cm` : '-';
  const inchText = inch !== undefined ? `${formatNumberWithCommas(inch)} inch` : '-';
  return `${cmText} / ${inchText}`;
};

const formatKrw = (value: number) => `₩${formatNumberWithCommas(value)}`;

const toNumberOrUndefined = (value: unknown) => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
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
  onOpen: (folderId: string) => void;
  onMoveFolder: (folderId: string) => void;
  onAddFavorite: (id: string, nextStarred: boolean) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string, name: string) => void;
}> = ({
  folder,
  isSelected,
  dragSelectionIds,
  dragSelectionEntries,
  onToggleSelect,
  onPress,
  onOpen,
  onMoveFolder,
  onAddFavorite,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
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
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      id: folder.id,
    },
  });

  const setCombinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDropRef(node);
  };

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
      ref={setCombinedRef}
      style={style}
      {...listeners}
      {...attributes}
      data-selectable-item='true'
      data-item-id={folder.id}
      onClick={onPress}
      onDoubleClick={() => onOpen(folder.id)}
      className={`group relative flex cursor-grab touch-none items-center justify-between rounded-xl px-4 py-3 active:cursor-grabbing dark:bg-gray-800/70 ${
        isSelected
          ? 'bg-violet-100 ring-2 ring-violet-300 dark:bg-violet-500/20 dark:ring-violet-500/60'
          : isOver
            ? 'bg-gray-100 ring-2 ring-violet-300 dark:bg-gray-700/60 dark:ring-violet-500/50'
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
        <span className='text-md font-medium text-gray-800 dark:text-gray-100'>{folder.name}</span>
        {folder.isStarred ? (
          <svg
            className='h-4 w-4 shrink-0 fill-amber-400'
            viewBox='0 0 20 20'
            aria-label='즐겨찾기 폴더'
          >
            <path d='M9.05 2.93a1 1 0 0 1 1.9 0l1.33 4.1a1 1 0 0 0 .95.69h4.32a1 1 0 0 1 .59 1.81l-3.5 2.55a1 1 0 0 0-.36 1.12l1.33 4.1a1 1 0 0 1-1.54 1.12L10.6 16a1 1 0 0 0-1.18 0l-3.48 2.52a1 1 0 0 1-1.54-1.12l1.33-4.1a1 1 0 0 0-.36-1.12l-3.5-2.55a1 1 0 0 1 .59-1.81h4.32a1 1 0 0 0 .95-.69l1.33-4.1Z' />
          </svg>
        ) : null}
      </div>

      <div
        className={`absolute top-2 right-2 z-10 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <PopoverPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button
              type='button'
              className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white/95 text-gray-600 shadow-sm hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700/60 dark:bg-gray-800/95 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
              aria-label='폴더 메뉴'
            >
              <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16' aria-hidden='true'>
                <circle cx='4' cy='8' r='1.25' />
                <circle cx='8' cy='8' r='1.25' />
                <circle cx='12' cy='8' r='1.25' />
              </svg>
            </button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align='end'
              side='bottom'
              sideOffset={6}
              className='z-50 w-36 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700/60 dark:bg-gray-800'
            >
              <button
                type='button'
                className='w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                onClick={() => {
                  setMenuOpen(false);
                  onMoveFolder(folder.id);
                }}
              >
                폴더 이동
              </button>
              <button
                type='button'
                className='w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                onClick={() => {
                  setMenuOpen(false);
                  onAddFavorite(folder.id, !folder.isStarred);
                }}
              >
                {folder.isStarred ? '즐겨찾기 취소' : '즐겨 찾기'}
              </button>
              <button
                type='button'
                className='w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                onClick={() => {
                  setMenuOpen(false);
                  onRenameFolder(folder.id, folder.name);
                }}
              >
                폴더 이름 수정
              </button>
              <button
                type='button'
                className='w-full rounded-md px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10'
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteFolder(folder.id, folder.name);
                }}
              >
                삭제하기
              </button>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>
    </div>
  );
};

const DriveFolderTileSkeleton = () => (
  <div className='relative flex items-center justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800/70'>
    <div className='flex items-center gap-3'>
      <div className='h-5 w-5 animate-pulse rounded bg-gray-300/80 dark:bg-gray-600/70' />
      <div className='h-4 w-28 animate-pulse rounded bg-gray-300/80 dark:bg-gray-600/70' />
    </div>
    <div className='h-8 w-8 animate-pulse rounded-md bg-gray-300/80 dark:bg-gray-600/70' />
  </div>
);

const DriveItemCardSkeleton = () => (
  <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-700/60 dark:bg-gray-800'>
    <div className='aspect-[16/10] w-full animate-pulse bg-gray-200 dark:bg-gray-700/70' />
    <div className='space-y-3 p-[clamp(12px,1.2vw,20px)]'>
      <div className='h-5 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700/70' />
      <div className='space-y-2'>
        <div className='h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70' />
        <div className='h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700/70' />
        <div className='h-4 w-11/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70' />
      </div>
      <div className='space-y-1.5'>
        <div className='h-3.5 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700/70' />
        <div className='h-3.5 w-10/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70' />
        <div className='h-3.5 w-9/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70' />
        <div className='h-3.5 w-8/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70' />
      </div>
      <div className='h-3.5 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70' />
    </div>
  </div>
);

const DriveListRow: React.FC<{
  entry: DriveListEntry;
  isSelected: boolean;
  isActive: boolean;
  dragSelectionIds: string[];
  dragSelectionEntries: DragSelectionEntry[];
  onToggleSelect: (checked: boolean) => void;
  onRowClick: (entry: DriveListEntry, event: React.MouseEvent<HTMLTableRowElement>) => void;
  onRowDoubleClick: (entry: DriveListEntry, event: React.MouseEvent<HTMLTableRowElement>) => void;
}> = ({
  entry,
  isSelected,
  isActive,
  dragSelectionIds,
  dragSelectionEntries,
  onToggleSelect,
  onRowClick,
  onRowDoubleClick,
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
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: entry.id,
    disabled: entry.kind !== 'folder',
    data: {
      type: entry.kind === 'folder' ? 'folder' : 'file',
      id: entry.id,
    },
  });

  const setCombinedRef = (node: HTMLTableRowElement | null) => {
    setNodeRef(node);
    setDropRef(node);
  };

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
      ref={setCombinedRef}
      style={style}
      {...attributes}
      {...listeners}
      data-selectable-item='true'
      data-item-id={entry.id}
      onClick={(event) => onRowClick(entry, event)}
      onDoubleClick={(event) => onRowDoubleClick(entry, event)}
      className={`cursor-grab border-t active:cursor-grabbing dark:border-gray-700/60 ${
        isSelected || isActive
          ? 'border-violet-200 bg-violet-50/40 dark:border-violet-500/40 dark:bg-violet-500/10'
          : isOver && entry.kind === 'folder'
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
  const {
    items,
    setItems,
    driveFolders,
    setDriveFolders,
    createFolder,
    deleteItems,
    restoreItems,
    moveItems,
    setItemsStarred,
    getItemParentId,
    workspaces,
    favorites,
    loadFolderChildren,
    loadFolderView,
    currentFolderPath,
    currentFolderIdPath,
    rootFolderId,
    currentFolderId,
    refreshDrive,
  } = useDrive();
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const authUser = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const rootFolderFromAuth = useAuthStore((state) => state.user?.rootFolder);
  const userId = useAuthStore((state) => state.user?.userId);
  const currentUserName = useAuthStore((state) => state.user?.name);
  const currentUserProfileImg = useAuthStore((state) => state.user?.profileImg);
  const materialsByFileSystemId = useDriveStore((state) => state.materialsByFileSystemId);
  const setMaterialsForFile = useDriveStore((state) => state.setMaterialsForFile);
  const searchLoading = useDriveStore((state) => state.searchLoading);
  const driveLoading = useDriveStore((state) => state.driveLoading);
  const setSearchLoading = useDriveStore((state) => state.setSearchLoading);
  const setDriveLoading = useDriveStore((state) => state.setDriveLoading);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingMaterial, setIsCreatingMaterial] = useState(false);
  const [isCreatingWorksheet, setIsCreatingWorksheet] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [createWorksheetModalOpen, setCreateWorksheetModalOpen] = useState(false);
  const [templateCreateModalOpen, setTemplateCreateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeItemId, setActiveItemId] = useState<string>('');
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [detailPanelEditMode, setDetailPanelEditMode] = useState(false);
  const [detailSaveLoading, setDetailSaveLoading] = useState(false);
  const [editFileName, setEditFileName] = useState('');
  const [editCodeInternal, setEditCodeInternal] = useState('');
  const [editVendorName, setEditVendorName] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editOriginCountry, setEditOriginCountry] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState<string | null>(null);
  const [editImageDragging, setEditImageDragging] = useState(false);
  const [editMaterialFieldDefs, setEditMaterialFieldDefs] = useState<MaterialFieldDef[]>([]);
  const [editMaterialFieldDefsLoading, setEditMaterialFieldDefsLoading] = useState(false);
  const [editAttributes, setEditAttributes] = useState<Record<string, unknown>>({});
  const [deleteToastOpen, setDeleteToastOpen] = useState(false);
  const [searchTotalCount, setSearchTotalCount] = useState(0);
  const [resultFilterOpen, setResultFilterOpen] = useState(false);
  const [draftSearchCategories, setDraftSearchCategories] = useState<DriveSearchCategory[]>([]);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [deletedMessage, setDeletedMessage] = useState('');
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveSourceId, setMoveSourceId] = useState<string>('');
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState('');
  const [renameFolderName, setRenameFolderName] = useState('');
  const [currentLocationMenuOpen, setCurrentLocationMenuOpen] = useState(false);
  const [expandedMoveFolders, setExpandedMoveFolders] = useState<Record<string, boolean>>({});
  const [favoriteToastOpen, setFavoriteToastOpen] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState('즐겨찾기가 완료되었습니다');
  const gridSelectionRef = useRef<HTMLDivElement | null>(null);
  const gridContentRef = useRef<HTMLDivElement | null>(null);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);
  const keepNextDetailEditModeRef = useRef(false);
  const resultFilterRef = useRef<HTMLDivElement | null>(null);
  const resultSearchInputRef = useRef<HTMLInputElement | null>(null);
  const suppressBlankClearRef = useRef(false);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const { setNodeRef: setRootDropRef } = useDroppable({
    id: 'drive-root-container',
    data: {
      type: 'root-container',
      id: 'drive-root-container',
    },
  });

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const fileIdFromQuery = searchParams.get('file') || '';
  const searchModeParam = searchParams.get('mode') || '';
  const searchKeyword = (searchParams.get('q') || '').trim();
  const searchCategoriesParam = searchParams.get('categories') || '';
  const searchCategories = useMemo(
    () =>
      searchCategoriesParam
        .split(',')
        .map((value) => value.trim())
        .filter((value): value is DriveSearchCategory => Boolean(value) && isSearchCategory(value)),
    [searchCategoriesParam],
  );
  const isSearchMode = searchModeParam === 'search' || Boolean(searchKeyword);

  const categoryLabelMap: Record<string, string> = {
    fabric: '원단',
    rib_fabric: '시보리원단',
    label: '라벨',
    trim: '부자재',
    worksheet: '작업지시서',
    schematic: '도식화',
    pattern: '패턴',
    print: '프린트',
    etc: '부자재',
    faddit: '파일',
  };

  const searchFilterLabelMap: Record<DriveSearchCategory, string> = {
    folder: '폴더',
    worksheet: '작업지시서',
    schematic: '도식화',
    etc: '기타',
    pattern: '패턴',
    print: '인쇄',
    faddit: 'faddit',
    fabric: '원단',
    label: '라벨',
  };

  const attributeLabelMap: Record<string, string> = {
    type: '타입',
    material: '소재',
    size: '규격',
    size_mm: '규격',
    thickness: '두께',
    thickness_mm: '두께',
    finishing: '마감',
    print_method: '인쇄 방식',
    print_artwork: '인쇄물',
    color_mode: '컬러',
    pantone_color: '팬톤 컬러',
    blend_ratio: '혼용률',
    weave: '조직',
    pattern: '패턴',
    width: '폭',
    width_type: '폭 타입',
    pattern_width: '패턴폭',
    pattern_width_mm: '패턴폭',
    pattern_width_type: '폭 타입',
    weight: '중량',
    weight_gsm: '중량',
    stretch: '신축성',
    shrinkage_pct: '수축률',
    moq: '최소 발주수량',
    processing_fee: '가공비',
    processing: '가공여부',
    price_amount: '단가',
    price_unit: '단위',
    price_per_unit: '단가/단위',
    rib_spec: '리브 스펙',
    rib_direction: '리브 방향',
    grain_direction: '결 방향',
    size_spec: '규격',
    gauge_no: '호수',
    post_processing: '후가공',
    color: '컬러',
  };

  const getAttributeLabel = (key: string) => {
    return attributeLabelMap[key] || key.replace(/_/g, ' ');
  };

  const getCategoryLabel = (fileId: string, fallbackTag?: string) => {
    const linkedMaterials = materialsByFileSystemId[fileId] || [];
    const primaryMaterial = linkedMaterials[0];
    if (primaryMaterial?.category) {
      return categoryLabelMap[primaryMaterial.category] || primaryMaterial.category;
    }
    if (fallbackTag) {
      return categoryLabelMap[fallbackTag] || fallbackTag;
    }
    return '파일';
  };

  const getDisplayImageSrc = (fileId: string, fallbackImageSrc: string) => {
    const linkedMaterials = materialsByFileSystemId[fileId] || [];
    const primaryMaterial = linkedMaterials[0];
    if (primaryMaterial?.image_url) {
      return primaryMaterial.image_url;
    }
    return fallbackImageSrc;
  };

  const formatAttributeValue = (value: unknown, fieldKey?: string): string => {
    const isPriceField = (fieldKey || '').includes('price') || (fieldKey || '').includes('fee');

    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      if (typeof value === 'number' && isPriceField) {
        return formatKrw(value);
      }
      if (typeof value === 'string' && isPriceField) {
        const numeric = toNumberOrUndefined(value);
        if (numeric !== undefined) {
          return formatKrw(numeric);
        }
      }
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => formatAttributeValue(item, fieldKey)).join(', ');
    }
    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;

      if ('selected' in objectValue) {
        const selected = String(objectValue.selected ?? '').trim();
        const customText = String(objectValue.customText ?? '').trim();
        if (selected === '기타') {
          return customText || '기타';
        }
        return selected || '-';
      }

      if ('value' in objectValue || 'unit' in objectValue) {
        const rawValue = objectValue.value;
        const rawUnit = objectValue.unit;
        const valueText =
          typeof rawValue === 'number'
            ? isPriceField
              ? formatKrw(rawValue)
              : formatNumberWithCommas(rawValue)
            : String(rawValue ?? '').trim();
        const unitText = String(rawUnit ?? '').trim();
        if (valueText && unitText) {
          return `${valueText}/${unitText}`;
        }
        if (valueText) {
          return valueText;
        }
      }

      if ('first' in objectValue || 'second' in objectValue) {
        const firstRaw = objectValue.first;
        const secondRaw = objectValue.second;
        const firstText =
          typeof firstRaw === 'number'
            ? isPriceField
              ? formatKrw(firstRaw)
              : formatNumberWithCommas(firstRaw)
            : String(firstRaw ?? '').trim();
        const secondText =
          typeof secondRaw === 'number'
            ? formatNumberWithCommas(secondRaw)
            : String(secondRaw ?? '').trim();
        if (firstText && secondText) {
          return `${firstText}/${secondText}`;
        }
        return firstText || secondText || '-';
      }

      const dualLengthText = formatDualLengthText(objectValue);
      if (dualLengthText) return dualLengthText;
      if (
        ('width' in objectValue || 'height' in objectValue) &&
        ('unit' in objectValue || 'width' in objectValue || 'height' in objectValue)
      ) {
        const width = objectValue.width ? String(objectValue.width) : '-';
        const height = objectValue.height ? String(objectValue.height) : '-';
        const unit = objectValue.unit ? String(objectValue.unit) : '';
        return `${width} x ${height}${unit ? ` ${unit}` : ''}`;
      }

      return (
        Object.values(objectValue)
          .map((nestedValue) => formatAttributeValue(nestedValue, fieldKey))
          .filter((text) => text !== '-' && text !== '')
          .join(' / ') || '-'
      );
    }
    return String(value);
  };

  const breadcrumbParts = useMemo(() => {
    if (!currentFolderPath) {
      return ['홈'];
    }

    const segments = currentFolderPath
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    return segments.length > 0 ? segments : ['홈'];
  }, [currentFolderPath]);

  const breadcrumbIds = useMemo(() => {
    if (!currentFolderIdPath) {
      return [] as string[];
    }
    return currentFolderIdPath
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
  }, [currentFolderIdPath]);

  const visibleBreadcrumbParts = useMemo(
    () => breadcrumbParts.filter((part) => part !== '홈'),
    [breadcrumbParts],
  );

  const breadcrumbIdStartIndex = useMemo(
    () => Math.max(0, breadcrumbIds.length - visibleBreadcrumbParts.length),
    [breadcrumbIds.length, visibleBreadcrumbParts.length],
  );

  const pageTitle = isSearchMode ? '검색결과' : breadcrumbParts[breadcrumbParts.length - 1] || '홈';
  const effectiveRootFolderId = rootFolderId || rootFolderFromAuth || '';

  const favoriteFolderIdSet = useMemo(() => {
    const ids = new Set<string>();

    const walk = (nodes: SidebarItem[]) => {
      nodes.forEach((node) => {
        if (node.type === 'folder') {
          ids.add(node.id);
        }
        if (node.children?.length) {
          walk(node.children);
        }
      });
    };

    walk(favorites);
    return ids;
  }, [favorites]);

  const currentLocationFolderId = !isSearchMode ? currentFolderId || effectiveRootFolderId : '';
  const canShowCurrentLocationMenu =
    Boolean(currentLocationFolderId) && currentLocationFolderId !== effectiveRootFolderId;
  const isCurrentLocationStarred = canShowCurrentLocationMenu
    ? favoriteFolderIdSet.has(currentLocationFolderId)
    : false;

  useEffect(() => {
    setDraftSearchCategories(searchCategories);
    if (!isSearchMode) {
      setResultFilterOpen(false);
    }
  }, [searchCategories, isSearchMode]);

  useEffect(() => {
    setSearchInputValue(searchKeyword);
    if (!isSearchMode) {
      return;
    }

    const timer = window.setTimeout(() => {
      resultSearchInputRef.current?.focus();
      resultSearchInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isSearchMode, searchKeyword]);

  const navigateToFolder = (nextFolderId: string) => {
    window.getSelection()?.removeAllRanges();
    navigate(`/faddit/drive/${nextFolderId}`);
  };

  const setFileQuery = (fileId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (fileId) {
      next.set('file', fileId);
    } else {
      next.delete('file');
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!isSearchMode) {
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      try {
        setSearchLoading(true);
        const searchResult = await searchDriveItems({
          search: searchKeyword || undefined,
          page: 1,
          categories: searchCategories.length ? searchCategories : undefined,
          category: searchCategories.length === 1 ? searchCategories[0] : undefined,
        });

        const hiddenRootFolderCount = searchResult.data.filter(
          (node) => node.type === 'folder' && node.isRoot,
        ).length;

        const folders = searchResult.data
          .filter((node) => node.type === 'folder' && !node.isRoot)
          .map((node) => ({
            id: node.fileSystemId,
            name: node.name,
            shared: false,
            updatedAt: node.updatedAt || '',
            updatedBy: '',
            parentId: node.parentId,
            isStarred: node.isStarred,
          }));

        const files = await Promise.all(
          searchResult.data
            .filter((node) => node.type !== 'folder')
            .map(async (node) => {
              const previewUrl = isImageFile(node.mimetype)
                ? await getDriveFilePreviewUrl(node.fileSystemId).catch(() => '')
                : '';

              return {
                id: node.fileSystemId,
                worksheetId: node.worksheetId,
                nodeType: node.type,
                imageSrc: previewUrl || ChildClothImage,
                imageAlt: node.name,
                title: node.name,
                subtitle: node.mimetype ? `.${node.mimetype}` : 'file',
                badge: node.tag ? String(node.tag) : '파일',
                isStarred: node.isStarred,
                owner: node.creatorName || undefined,
                ownerProfileImg: node.creatorProfileImg || undefined,
                date: node.updatedAt ? String(node.updatedAt).slice(0, 10) : '-',
                size: formatBytes(node.size),
                parentId: node.parentId,
                sourcePath: node.path,
                stateStoreKey: 'Drive.search.items',
              } as DriveItem;
            }),
        );

        if (cancelled) {
          return;
        }

        setDriveFolders(folders);
        setItems(files);
        setSearchTotalCount(Math.max(0, searchResult.count - hiddenRootFolderCount));
        clearSelectionEffects();
      } catch (error) {
        console.error('Failed to load search results', error);
        if (!cancelled) {
          setDriveFolders([]);
          setItems([]);
          setSearchTotalCount(0);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [isSearchMode, searchCategories, searchKeyword, setDriveFolders, setItems]);

  useEffect(() => {
    const effectiveRootFolderId = rootFolderId || rootFolderFromAuth;
    if (!effectiveRootFolderId || isSearchMode) {
      return;
    }

    let cancelled = false;
    setSearchLoading(false);
    setSearchTotalCount(0);
    const targetFolderId = folderId || effectiveRootFolderId;
    setDriveLoading(true);
    loadFolderView(targetFolderId)
      .catch((error) => {
        console.error('Failed to load drive folder view', error);
      })
      .finally(() => {
        if (!cancelled) {
          setDriveLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [folderId, isSearchMode, loadFolderView, rootFolderFromAuth, rootFolderId]);

  useEffect(() => {
    if (!fileIdFromQuery) {
      return;
    }

    const keepEditMode = keepNextDetailEditModeRef.current;
    keepNextDetailEditModeRef.current = false;

    const queryItem = items.find((item) => item.id === fileIdFromQuery);
    if (!queryItem) {
      if (items.length > 0) {
        setActiveItemId('');
        setDetailPanelOpen(false);
      }
      return;
    }

    setActiveItemId(queryItem.id);
    setDetailPanelEditMode(keepEditMode);
    setDetailPanelOpen(true);
  }, [fileIdFromQuery, items]);

  const clearSelectionEffects = () => {
    setSelectedIds([]);
    setActiveItemId('');
    setDetailPanelEditMode(false);
    setDetailPanelOpen(false);
    setFileQuery(null);
  };

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
      setDetailPanelEditMode(false);
      setDetailPanelOpen(false);
      return;
    }

    if (activeItemId && !items.some((item) => item.id === activeItemId)) {
      setActiveItemId('');
      setDetailPanelEditMode(false);
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
    if (!favoriteToastOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFavoriteToastOpen(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [favoriteToastOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (resultFilterOpen) {
          setResultFilterOpen(false);
          return;
        }
        clearSelectionEffects();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resultFilterOpen]);

  useEffect(() => {
    if (!resultFilterOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!resultFilterRef.current?.contains(target)) {
        setResultFilterOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [resultFilterOpen]);

  useEffect(() => {
    const resolveBreakpoint = (width: number) => {
      if (width >= 1536) {
        return '2xl';
      }
      if (width >= 1280) {
        return 'xl';
      }
      if (width >= 1024) {
        return 'lg';
      }
      if (width >= 768) {
        return 'md';
      }
      if (width >= 640) {
        return 'sm';
      }
      return 'xs';
    };

    let previous = '';
    const logBreakpoint = () => {
      const next = resolveBreakpoint(window.innerWidth);
      if (next === previous) {
        return;
      }
      previous = next;
      console.log('[Drive breakpoint helper]', next, `${window.innerWidth}px`);
    };

    logBreakpoint();
    window.addEventListener('resize', logBreakpoint);
    return () => window.removeEventListener('resize', logBreakpoint);
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
    if (isMultiSelectGesture(event)) {
      return;
    }

    setFileQuery(itemId);
    setActiveItemId(itemId);
    setDetailPanelEditMode(false);
    setDetailPanelOpen(true);
  };

  const isWorksheetDriveItem = (item: Pick<DriveItem, 'nodeType' | 'badge'>) => {
    if (item.nodeType === 'worksheet') {
      return true;
    }

    const normalizedTag = String(item.badge || '')
      .trim()
      .toLowerCase();
    return normalizedTag === 'worksheet' || normalizedTag === 'faddit';
  };

  const handleOpenWorksheetFromDrive = (item: Pick<DriveItem, 'id' | 'worksheetId'>) => {
    const targetWorksheetId = item.worksheetId || item.id;
    navigate(`/faddit/worksheet/${targetWorksheetId}`);
  };

  const handleFileCardDoubleClick = (itemId: string) => {
    const targetItem = items.find((item) => item.id === itemId);
    if (!targetItem || !isWorksheetDriveItem(targetItem)) {
      return;
    }

    handleOpenWorksheetFromDrive(targetItem);
  };

  const handleOpenFileEditPanel = (itemId: string) => {
    keepNextDetailEditModeRef.current = true;
    setFileQuery(itemId);
    setActiveItemId(itemId);
    setDetailPanelEditMode(true);
    setDetailPanelOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    const idsToDelete = [...selectedIds];
    const deleteSet = new Set(idsToDelete);

    const deletingItems = items.filter((item) => deleteSet.has(item.id));
    const deletingFolders = driveFolders.filter((folder) => deleteSet.has(folder.id));
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

    if (activeItemId && deleteSet.has(activeItemId)) {
      setDetailPanelOpen(false);
      setActiveItemId('');
      setFileQuery(null);
    }

    setSelectedIds([]);

    try {
      await deleteItems(idsToDelete);
      setDeletedIds(idsToDelete);
      setDeleteToastOpen(true);
    } catch (error) {
      console.error('Failed to delete drive items', error);
      setDeletedMessage('삭제 중 오류가 발생했습니다');
      setDeletedIds([]);
      setDeleteToastOpen(true);
      await refreshDrive();
    }
  };

  const handleUndoDelete = async () => {
    if (deletedIds.length === 0) {
      return;
    }

    try {
      await restoreItems(deletedIds);
      setDeleteToastOpen(false);
      setDeletedIds([]);
    } catch (error) {
      console.error('Failed to restore drive items', error);
      setDeletedMessage('복원 중 오류가 발생했습니다');
      setDeleteToastOpen(true);
      await refreshDrive();
    }
  };

  const handleOpenMoveDialog = (id: string) => {
    const effectiveRoot = rootFolderId || rootFolderFromAuth || '';
    setMoveSourceId(id);
    setMoveTargetFolderId(currentFolderId || effectiveRoot);
    setExpandedMoveFolders({});
    setMoveDialogOpen(true);
  };

  const toggleMoveFolderExpand = (folderId: string) => {
    setExpandedMoveFolders((prev) => {
      const nextOpen = !prev[folderId];
      if (nextOpen) {
        loadFolderChildren(folderId).catch((error) => {
          console.error('Failed to load move target folder children', error);
        });
      }
      return {
        ...prev,
        [folderId]: nextOpen,
      };
    });
  };

  const handleConfirmMoveFromMenu = async () => {
    if (!moveSourceId || !moveTargetFolderId) {
      return;
    }

    const effectiveRoot = rootFolderId || rootFolderFromAuth || '';
    const sourceParentId = getItemParentId(moveSourceId) || currentFolderId || effectiveRoot;

    if (
      !sourceParentId ||
      sourceParentId === moveTargetFolderId ||
      moveSourceId === moveTargetFolderId
    ) {
      setMoveDialogOpen(false);
      return;
    }

    try {
      await moveItems([moveSourceId], moveTargetFolderId, sourceParentId);
      setMoveDialogOpen(false);
    } catch (error) {
      console.error('Failed to move drive item from kebab menu', error);
      setMoveDialogOpen(false);
      await refreshDrive();
    }
  };

  const handleAddFavoriteFromMenu = async (id: string, nextStarred: boolean) => {
    try {
      await setItemsStarred([id], nextStarred);
      setFavoriteMessage(nextStarred ? '즐겨찾기가 완료되었습니다' : '즐겨찾기가 취소되었습니다');
      setFavoriteToastOpen(true);
    } catch (error) {
      console.error('Failed to set favorite from kebab menu', error);
      await refreshDrive();
    }
  };

  const handleDeleteSingleItem = async (id: string, itemName: string) => {
    if (!id) {
      return;
    }

    setDeletedMessage(`${itemName}(이) 삭제되었습니다`);

    if (activeItemId === id) {
      setDetailPanelOpen(false);
      setActiveItemId('');
      setFileQuery(null);
    }

    setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));

    try {
      await deleteItems([id]);
      setDeletedIds([id]);
      setDeleteToastOpen(true);
    } catch (error) {
      console.error('Failed to delete drive item from kebab menu', error);
      setDeletedMessage('삭제 중 오류가 발생했습니다');
      setDeletedIds([]);
      setDeleteToastOpen(true);
      await refreshDrive();
    }
  };

  const handleOpenRenameFolderDialog = (folderId: string, currentName: string) => {
    setRenameFolderId(folderId);
    setRenameFolderName(currentName);
    setRenameDialogOpen(true);
  };

  const handleConfirmRenameFolder = async () => {
    const nextName = renameFolderName.trim();
    if (!renameFolderId || !nextName) {
      return;
    }

    try {
      await updateDriveItems({
        id: [renameFolderId],
        name: nextName,
      });
      setRenameDialogOpen(false);
      await refreshDrive();
    } catch (error) {
      console.error('Failed to rename folder from kebab menu', error);
      setRenameDialogOpen(false);
      await refreshDrive();
    }
  };

  const renderMoveFolderTree = (nodes: SidebarItem[], depth = 0): React.ReactNode => {
    return nodes
      .filter((node) => node.type === 'folder')
      .map((folder) => {
        const isOpen = Boolean(expandedMoveFolders[folder.id]);
        const hasChildren = Boolean(folder.children && folder.children.length > 0);

        return (
          <div key={folder.id}>
            <div
              className={`flex items-center rounded-md px-2 py-1.5 text-sm ${
                moveTargetFolderId === folder.id
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60'
              }`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              <button
                type='button'
                className='mr-1 flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200/70 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                onClick={() => toggleMoveFolderExpand(folder.id)}
                aria-label={isOpen ? '폴더 닫기' : '폴더 열기'}
              >
                <svg className='h-3 w-3 fill-current' viewBox='0 0 12 12' aria-hidden='true'>
                  {isOpen ? <path d='M2 4h8L6 8z' /> : <path d='M4 2v8l4-4z' />}
                </svg>
              </button>
              <button
                type='button'
                onClick={() => setMoveTargetFolderId(folder.id)}
                className='flex min-w-0 flex-1 items-center gap-2 text-left'
              >
                <svg
                  className='h-4 w-4 shrink-0 fill-gray-500 dark:fill-gray-300'
                  viewBox='0 0 20 20'
                >
                  <path d='M2.5 4.75A2.25 2.25 0 0 1 4.75 2.5h3.21a2 2 0 0 1 1.41.59l.75.75c.19.19.44.29.71.29h4.42a2.25 2.25 0 0 1 2.25 2.25v6.87a2.25 2.25 0 0 1-2.25 2.25H4.75A2.25 2.25 0 0 1 2.5 13.25V4.75Z' />
                </svg>
                <span className='truncate'>{folder.name}</span>
              </button>
            </div>

            {isOpen && hasChildren ? renderMoveFolderTree(folder.children || [], depth + 1) : null}
          </div>
        );
      });
  };

  const activeItem = items.find((item) => item.id === activeItemId) || null;

  const displayedFolders = useMemo(() => {
    if (isSearchMode || searchCategories.length === 0) {
      return driveFolders;
    }

    if (searchCategories.includes('folder')) {
      return driveFolders;
    }

    return [] as DriveFolder[];
  }, [driveFolders, isSearchMode, searchCategories]);

  const displayedItems = useMemo(() => {
    if (isSearchMode || searchCategories.length === 0) {
      return items;
    }

    const normalizedCategories = searchCategories.map((value) => value.toLowerCase());
    const hasWorksheetFilter =
      normalizedCategories.includes('worksheet') || normalizedCategories.includes('faddit');

    return items.filter((item) => {
      const tag = (item.badge || '').toLowerCase();
      if (!tag) {
        return false;
      }

      if (hasWorksheetFilter && (tag === 'worksheet' || tag === 'faddit')) {
        return true;
      }

      return normalizedCategories.includes(tag);
    });
  }, [isSearchMode, items, searchCategories]);

  const listEntries = useMemo<DriveListEntry[]>(
    () => [
      ...displayedFolders.map((folder) => ({
        id: folder.id,
        kind: 'folder' as const,
        title: folder.name,
        date: `${folder.updatedAt} ${folder.updatedBy}`,
        size: '—',
      })),
      ...displayedItems.map((item) => ({
        id: item.id,
        kind: 'file' as const,
        nodeType: item.nodeType,
        title: item.title,
        subtitle: item.subtitle,
        date: `${item.date || '-'} ${item.owner || ''}`.trim(),
        size: item.size || '-',
      })),
    ],
    [displayedItems, displayedFolders],
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
    if (entry.kind === 'file') {
      if (isMultiSelectGesture(event)) {
        return;
      }
      setFileQuery(entry.id);
      setActiveItemId(entry.id);
      setDetailPanelEditMode(false);
      setDetailPanelOpen(true);
      return;
    }

    handleToggleWithGesture(entry.id, event);
  };

  const handleListRowDoubleClick = (
    entry: DriveListEntry,
    event: React.MouseEvent<HTMLTableRowElement>,
  ) => {
    if (entry.kind !== 'file') {
      return;
    }
    if (isMultiSelectGesture(event)) {
      return;
    }

    const targetItem = items.find((item) => item.id === entry.id);
    if (!targetItem || !isWorksheetDriveItem(targetItem)) {
      return;
    }

    handleOpenWorksheetFromDrive(targetItem);
  };

  const handleCloseDetailPanel = () => {
    setDetailPanelEditMode(false);
    setDetailPanelOpen(false);
    setFileQuery(null);
  };

  const handleEditAttributeChange = (key: string, value: unknown) => {
    setEditAttributes((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDropEditImageFile = (nextFile: File | null) => {
    setEditImageFile(nextFile);
    setEditImageDragging(false);
  };

  const handleSaveFileEdits = async () => {
    if (!activeItem || !userId) {
      return;
    }

    const trimmedName = editFileName.trim();
    if (!trimmedName) {
      return;
    }

    try {
      setDetailSaveLoading(true);
      if (trimmedName !== activeItem.title) {
        await updateDriveItems({ id: [activeItem.id], name: trimmedName });
      }

      if (primaryActiveMaterial) {
        const nextAttributes: Record<string, unknown> = {};
        editableAttributeKeys.forEach((key) => {
          nextAttributes[key] = editAttributes[key];
        });

        const hasAttributeChange = Object.entries(nextAttributes).some(
          ([key, value]) => value !== (primaryActiveMaterial.attributes || {})[key],
        );
        const normalizedImageUrl = editImageFile
          ? await fileToDataUrl(editImageFile)
          : editImageUrl;
        const hasImageChange = normalizedImageUrl !== (primaryActiveMaterial.image_url || '');
        const normalizedCodeInternal = editCodeInternal.trim();
        const normalizedVendorName = editVendorName.trim();
        const normalizedItemName = editItemName.trim();
        const normalizedOriginCountry = editOriginCountry.trim();
        const hasTopFieldChange =
          normalizedCodeInternal !== (primaryActiveMaterial.code_internal || '') ||
          normalizedVendorName !== (primaryActiveMaterial.vendor_name || '') ||
          normalizedItemName !== (primaryActiveMaterial.item_name || '') ||
          normalizedOriginCountry !== (primaryActiveMaterial.origin_country || '');

        if (hasAttributeChange || hasImageChange || hasTopFieldChange) {
          await updateMaterial(primaryActiveMaterial.id, {
            userId,
            codeInternal: normalizedCodeInternal,
            vendorName: normalizedVendorName,
            itemName: normalizedItemName,
            originCountry: normalizedOriginCountry,
            attributes: nextAttributes,
            imageUrl: normalizedImageUrl,
          });
        }
      }

      await refreshDrive();
      if (primaryActiveMaterial) {
        const nextMaterials = await getMaterialsByFileSystem(activeItem.id, userId);
        setMaterialsForFile(activeItem.id, nextMaterials);
      }
      setDetailPanelEditMode(false);
    } catch (error) {
      console.error('Failed to save file edit changes', error);
      await refreshDrive();
    } finally {
      setDetailSaveLoading(false);
    }
  };

  const toggleDraftSearchCategory = (category: DriveSearchCategory) => {
    setDraftSearchCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
    );
  };

  const applySearchFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (draftSearchCategories.length) {
      next.set('categories', draftSearchCategories.join(','));
    } else {
      next.delete('categories');
    }

    if (isSearchMode) {
      next.set('mode', 'search');
    }

    setSearchParams(next);
    setResultFilterOpen(false);
  };

  const clearSearchFilters = () => {
    setDraftSearchCategories([]);
    const next = new URLSearchParams(searchParams);
    next.delete('categories');

    if (isSearchMode && !searchKeyword) {
      next.delete('mode');
    }

    setSearchParams(next);
    setResultFilterOpen(false);
  };

  const submitResultSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next = new URLSearchParams(searchParams);
    const trimmed = searchInputValue.trim();
    next.set('mode', 'search');

    if (trimmed) {
      next.set('q', trimmed);
    } else {
      next.delete('q');
    }

    setSearchParams(next);
  };

  const handleCreateFolder = async (folderName: string) => {
    try {
      setIsCreatingFolder(true);
      await createFolder(folderName);
    } catch (error) {
      console.error('Failed to create folder', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCreateMaterial = async (value: CreateMaterialFormValue) => {
    if (!userId || !rootFolderId) {
      return;
    }

    try {
      setIsCreatingMaterial(true);

      const parentId = currentFolderId ?? rootFolderId;
      const tagByCategory: Record<CreateMaterialFormValue['category'], DriveUploadTag> = {
        fabric: 'fabric',
        rib_fabric: 'fabric',
        label: 'label',
        trim: 'etc',
      };

      const uploadResult = await createDriveFile({
        parentId,
        userId,
        files: [value.file],
        tags: [tagByCategory[value.category]],
      });

      if (authUser) {
        setAuthUser({
          ...authUser,
          storageUsed:
            typeof uploadResult.storageUsed === 'number'
              ? uploadResult.storageUsed
              : authUser.storageUsed,
          storageLimit:
            typeof uploadResult.storageLimit === 'number'
              ? uploadResult.storageLimit
              : authUser.storageLimit,
        });
      }

      const createdFile = uploadResult.result.find((entry) => entry.success && entry.result);
      if (!createdFile?.result?.fileSystemId) {
        throw new Error('File upload failed');
      }

      await createMaterial({
        userId,
        category: value.category,
        codeInternal: value.codeInternal,
        vendorName: value.vendorName,
        itemName: value.itemName,
        originCountry: value.originCountry,
        fileSystemId: createdFile.result.fileSystemId,
        attributes: value.attributes,
      });

      await refreshDrive();
    } catch (error) {
      console.error('Failed to create material', error);
    } finally {
      setIsCreatingMaterial(false);
    }
  };

  const handleCreateWorksheet = async (value: CreateWorksheetFormValue) => {
    if (!userId || !rootFolderId) {
      return;
    }

    try {
      setIsCreatingWorksheet(true);

      const created = await createWorksheet({
        userId,
        parentId: currentFolderId ?? rootFolderId,
        name: value.title || '새 작업지시서',
        default_name: true,
        manager_name: currentUserName || '담당자',
        brand_name: '',
        season_year: new Date().getFullYear(),
        season_type: '',
        gender: 0,
        category: 0,
        clothes: '',
        size_spec: value.description || '',
      });

      const worksheetId = created.worksheetId || created.worksheet_id;
      await refreshDrive();

      if (worksheetId) {
        navigate(`/faddit/worksheet/${worksheetId}`);
      } else {
        navigate('/faddit/worksheet');
      }
    } catch (error) {
      console.error('Failed to create worksheet', error);
    } finally {
      setIsCreatingWorksheet(false);
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

  const activeLinkedMaterials = activeItem ? materialsByFileSystemId[activeItem.id] || [] : [];
  const primaryActiveMaterial = activeLinkedMaterials[0] || null;
  const activeCategoryLabel = activeItem
    ? getCategoryLabel(activeItem.id, activeItem.badge)
    : '파일';
  const activeDisplayImageSrc = activeItem
    ? getDisplayImageSrc(activeItem.id, activeItem.imageSrc)
    : '';
  const activeAttributeEntries = primaryActiveMaterial
    ? Object.entries(primaryActiveMaterial.attributes || {})
    : [];

  const visibleEditMaterialFieldDefs = useMemo(
    () =>
      editMaterialFieldDefs
        .filter((fieldDef) => fieldDef.input_type !== 'group')
        .filter((fieldDef) => !MATERIAL_TOP_FIELDS.has(fieldDef.field_key))
        .filter((fieldDef) => shouldShowMaterialField(fieldDef, editAttributes)),
    [editAttributes, editMaterialFieldDefs],
  );

  const editableAttributeKeys = useMemo(() => {
    const keySet = new Set<string>();
    visibleEditMaterialFieldDefs.forEach((fieldDef) => {
      keySet.add(fieldDef.field_key);
    });
    Object.keys(primaryActiveMaterial?.attributes || {}).forEach((key) => {
      if (MATERIAL_TOP_FIELDS.has(key)) {
        return;
      }
      keySet.add(key);
    });

    const orderedFromDefs = visibleEditMaterialFieldDefs
      .map((fieldDef) => fieldDef.field_key)
      .filter((fieldKey) => keySet.has(fieldKey));
    const extras = Array.from(keySet).filter((fieldKey) => !orderedFromDefs.includes(fieldKey));

    return [...orderedFromDefs, ...extras];
  }, [primaryActiveMaterial?.attributes, visibleEditMaterialFieldDefs]);

  const materialFieldDefByKey = useMemo(() => {
    const map = new Map<string, MaterialFieldDef>();
    editMaterialFieldDefs.forEach((fieldDef) => {
      map.set(fieldDef.field_key, fieldDef);
    });
    return map;
  }, [editMaterialFieldDefs]);

  const renderEditAttributeInput = (key: string) => {
    const fieldDef = materialFieldDefByKey.get(key);
    const value = editAttributes[key];

    if (!fieldDef) {
      return (
        <input
          type='text'
          value={String(value ?? '')}
          onChange={(event) => handleEditAttributeChange(key, event.target.value)}
          className='form-input w-full'
          placeholder={key}
        />
      );
    }

    if (fieldDef.input_type === 'number') {
      return (
        <input
          type='text'
          inputMode='decimal'
          value={formatNumberWithCommas(typeof value === 'number' ? value : undefined)}
          onChange={(event) =>
            handleEditAttributeChange(key, parseFormattedNumber(event.target.value) ?? '')
          }
          className='form-input w-full'
          placeholder={key}
        />
      );
    }

    if (fieldDef.input_type === 'option_with_other') {
      const options = getSelectOptions(fieldDef);
      const optionValue =
        typeof value === 'object' && value !== null
          ? (value as { selected?: string; customText?: string })
          : ({ selected: '', customText: '' } as { selected?: string; customText?: string });
      return (
        <div className='space-y-2'>
          <select
            className='form-select w-full'
            value={optionValue.selected ?? ''}
            onChange={(event) =>
              handleEditAttributeChange(key, {
                ...optionValue,
                selected: event.target.value,
              })
            }
          >
            <option value=''>선택</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {optionValue.selected === '기타' ? (
            <input
              type='text'
              className='form-input w-full'
              placeholder='기타 입력'
              value={optionValue.customText ?? ''}
              onChange={(event) =>
                handleEditAttributeChange(key, {
                  ...optionValue,
                  customText: event.target.value,
                })
              }
            />
          ) : null}
        </div>
      );
    }

    if (fieldDef.input_type === 'number_with_option') {
      const units = getUnitOptions(fieldDef);
      const numberWithUnit =
        typeof value === 'object' && value !== null
          ? (value as { value?: number; unit?: string })
          : ({ value: undefined, unit: units[0] ?? '' } as { value?: number; unit?: string });
      const dualLengthText = formatDualLengthText(numberWithUnit);
      return (
        <div className='space-y-2'>
          <div className='grid grid-cols-3 gap-2'>
            <input
              type='text'
              inputMode='decimal'
              className='form-input col-span-2 w-full'
              value={formatNumberWithCommas(numberWithUnit.value)}
              onChange={(event) =>
                handleEditAttributeChange(key, {
                  ...numberWithUnit,
                  value: parseFormattedNumber(event.target.value),
                })
              }
            />
            <select
              className='form-select w-full'
              value={numberWithUnit.unit ?? ''}
              onChange={(event) =>
                handleEditAttributeChange(key, {
                  ...numberWithUnit,
                  unit: event.target.value,
                })
              }
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          {dualLengthText ? (
            <div className='text-xs text-gray-500 dark:text-gray-400'>{dualLengthText}</div>
          ) : null}
        </div>
      );
    }

    if (fieldDef.input_type === 'number_pair') {
      const pair =
        typeof value === 'object' && value !== null
          ? (value as { first?: number; second?: number | string })
          : ({ first: undefined, second: undefined } as {
              first?: number;
              second?: number | string;
            });
      const { firstLabel, secondLabel } = getNumberPairLabels(fieldDef);
      const pairKind = getNumberPairKind(fieldDef);
      return (
        <div className='grid grid-cols-2 gap-2'>
          <input
            type='text'
            inputMode='decimal'
            className='form-input w-full'
            placeholder={firstLabel}
            value={formatNumberWithCommas(pair.first)}
            onChange={(event) =>
              handleEditAttributeChange(key, {
                ...pair,
                first: parseFormattedNumber(event.target.value),
              })
            }
          />
          <input
            type='text'
            inputMode={pairKind === 'price_quantity' ? undefined : 'decimal'}
            className='form-input w-full'
            placeholder={secondLabel}
            value={
              pairKind === 'price_quantity'
                ? String(pair.second ?? '')
                : formatNumberWithCommas(pair.second as number | undefined)
            }
            onChange={(event) =>
              handleEditAttributeChange(key, {
                ...pair,
                second:
                  pairKind === 'price_quantity'
                    ? event.target.value
                    : parseFormattedNumber(event.target.value),
              })
            }
          />
        </div>
      );
    }

    return (
      <input
        type='text'
        value={String(value ?? '')}
        onChange={(event) => handleEditAttributeChange(key, event.target.value)}
        className='form-input w-full'
        placeholder={key}
      />
    );
  };

  const cardGridClass = detailPanelOpen
    ? 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'
    : 'grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))]';

  const isDriveListLoading = driveLoading || searchLoading;
  const folderSkeletonCount = detailPanelOpen ? 4 : 6;
  const fileSkeletonCount = detailPanelOpen ? 6 : 8;

  useEffect(() => {
    if (!detailPanelEditMode || !primaryActiveMaterial) {
      setEditMaterialFieldDefs([]);
      return;
    }

    let cancelled = false;
    setEditMaterialFieldDefsLoading(true);
    getMaterialFieldDefs(primaryActiveMaterial.category)
      .then((defs) => {
        if (cancelled) {
          return;
        }
        setEditMaterialFieldDefs(defs);
      })
      .catch((error) => {
        console.error('Failed to load material field defs in edit panel', error);
        if (!cancelled) {
          setEditMaterialFieldDefs([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEditMaterialFieldDefsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detailPanelEditMode, primaryActiveMaterial]);

  useEffect(() => {
    if (!editImageFile) {
      setEditImagePreviewUrl(null);
      return;
    }

    if (!editImageFile.type.startsWith('image/')) {
      setEditImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(editImageFile);
    setEditImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [editImageFile]);

  useEffect(() => {
    if (!detailPanelEditMode || !activeItem) {
      return;
    }

    setEditFileName(activeItem.title);
    setEditCodeInternal(primaryActiveMaterial?.code_internal || '');
    setEditVendorName(primaryActiveMaterial?.vendor_name || '');
    setEditItemName(primaryActiveMaterial?.item_name || '');
    setEditOriginCountry(primaryActiveMaterial?.origin_country || '');
    setEditImageUrl(primaryActiveMaterial?.image_url || '');
    setEditImageFile(null);
    setEditImageDragging(false);
    setEditAttributes(() => {
      const next: Record<string, unknown> = {};
      if (!primaryActiveMaterial) {
        return next;
      }
      Object.entries(primaryActiveMaterial.attributes || {}).forEach(([key, value]) => {
        next[key] = toEditableAttributeValue(value);
      });
      return next;
    });
  }, [
    activeItem,
    detailPanelEditMode,
    primaryActiveMaterial?.attributes,
    primaryActiveMaterial?.code_internal,
    primaryActiveMaterial?.vendor_name,
    primaryActiveMaterial?.item_name,
    primaryActiveMaterial?.origin_country,
    primaryActiveMaterial?.image_url,
  ]);

  useEffect(() => {
    if (!detailPanelEditMode || editMaterialFieldDefs.length === 0) {
      return;
    }

    setEditAttributes((prev) => {
      const next = { ...prev };
      editMaterialFieldDefs
        .filter((fieldDef) => fieldDef.input_type !== 'group')
        .forEach((fieldDef) => {
          if (next[fieldDef.field_key] === undefined) {
            next[fieldDef.field_key] = getDefaultEditFieldValue(fieldDef);
          }
        });
      return next;
    });
  }, [detailPanelEditMode, editMaterialFieldDefs]);

  const detailPanelContent =
    detailPanelOpen && activeItem ? (
      <>
        <div className='overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-700/60 dark:bg-gray-800'>
          <img
            src={
              detailPanelEditMode
                ? editImagePreviewUrl || editImageUrl || activeDisplayImageSrc
                : activeDisplayImageSrc
            }
            alt={activeItem.imageAlt}
            className='h-52 w-full object-cover'
          />
          <div className='space-y-3 p-5'>
            <div className='inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200'>
              {activeCategoryLabel}
            </div>
            {detailPanelEditMode ? (
              <div className='space-y-2'>
                <div className='mb-1 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                  파일 이름
                </div>
                <input
                  type='text'
                  value={editFileName}
                  onChange={(event) => setEditFileName(event.target.value)}
                  className='form-input w-full'
                  placeholder='파일 이름'
                />
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={editCodeInternal}
                    onChange={(event) => setEditCodeInternal(event.target.value)}
                    className='form-input w-full'
                    placeholder='코드(내부)'
                  />
                  <input
                    type='text'
                    value={editVendorName}
                    onChange={(event) => setEditVendorName(event.target.value)}
                    className='form-input w-full'
                    placeholder='업체명'
                  />
                  <input
                    type='text'
                    value={editItemName}
                    onChange={(event) => setEditItemName(event.target.value)}
                    className='form-input w-full'
                    placeholder='원단품명'
                  />
                  <input
                    type='text'
                    value={editOriginCountry}
                    onChange={(event) => setEditOriginCountry(event.target.value)}
                    className='form-input w-full'
                    placeholder='원산지'
                  />
                </div>
              </div>
            ) : (
              <h2 className='text-2xl leading-tight font-bold text-gray-900 dark:text-gray-100'>
                {activeItem.title}
              </h2>
            )}
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              {activeItem.subtitle || 'file'} · {activeItem.size || '-'}
            </p>
          </div>
        </div>

        {detailPanelEditMode ? (
          <>
            <div className='mt-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700/60 dark:bg-gray-800'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                이미지 변경
              </h3>
              <div
                role='button'
                tabIndex={0}
                className={`mt-3 cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${
                  editImageDragging
                    ? 'border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-500/10'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700/60 dark:hover:border-gray-600 dark:hover:bg-gray-700/40'
                }`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    editImageInputRef.current?.click();
                  }
                }}
                onClick={() => editImageInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setEditImageDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setEditImageDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  const related = event.relatedTarget as Node | null;
                  if (!event.currentTarget.contains(related)) {
                    setEditImageDragging(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const droppedFile = event.dataTransfer.files?.[0] ?? null;
                  handleDropEditImageFile(droppedFile);
                }}
              >
                <input
                  ref={editImageInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={(event) => handleDropEditImageFile(event.target.files?.[0] ?? null)}
                />
                {editImageFile || editImageUrl ? (
                  <div className='space-y-2'>
                    <div className='text-sm font-medium text-gray-800 dark:text-gray-100'>
                      {editImageFile ? editImageFile.name : '현재 이미지'}
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                      드래그 앤 드랍 또는 클릭해서 이미지 변경
                    </div>
                  </div>
                ) : (
                  <div className='space-y-1'>
                    <div className='text-sm font-medium text-gray-800 dark:text-gray-100'>
                      이미지를 드래그하여 업로드
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                      또는 클릭해서 이미지 선택
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className='mt-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700/60 dark:bg-gray-800'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                소재 속성 수정
              </h3>
              {editMaterialFieldDefsLoading ? (
                <p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
                  속성 필드를 불러오는 중입니다...
                </p>
              ) : editableAttributeKeys.length === 0 ? (
                <p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
                  수정 가능한 속성이 없습니다.
                </p>
              ) : (
                <div className='mt-3 space-y-3'>
                  {editableAttributeKeys.map((key) => (
                    <div key={key}>
                      <div className='mb-1 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                        {materialFieldDefByKey.get(key)?.label || getAttributeLabel(key)}
                      </div>
                      {renderEditAttributeInput(key)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setDetailPanelEditMode(false)}
                className='btn border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
              >
                취소
              </button>
              <button
                type='button'
                onClick={handleSaveFileEdits}
                disabled={detailSaveLoading}
                className='btn border-gray-200 bg-white text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
              >
                {detailSaveLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className='mt-5 grid grid-cols-2 gap-3'>
              <div className='rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700/60 dark:bg-gray-800'>
                <div className='text-xs text-gray-500 dark:text-gray-400'>생성자</div>
                <div className='mt-1 text-sm font-medium break-all text-gray-800 dark:text-gray-100'>
                  {activeItem.owner || currentUserName || '알 수 없음'}
                </div>
              </div>
              <div className='rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700/60 dark:bg-gray-800'>
                <div className='text-xs text-gray-500 dark:text-gray-400'>수정일</div>
                <div className='mt-1 text-sm font-medium text-gray-800 dark:text-gray-100'>
                  {activeItem.date || '-'}
                </div>
              </div>
              <div className='rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700/60 dark:bg-gray-800'>
                <div className='text-xs text-gray-500 dark:text-gray-400'>폴더 경로</div>
                <div className='mt-1 text-sm font-medium break-all text-gray-800 dark:text-gray-100'>
                  {activeItem.sourcePath || '-'}
                </div>
              </div>
              <div className='rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700/60 dark:bg-gray-800'>
                <div className='text-xs text-gray-500 dark:text-gray-400'>속성 개수</div>
                <div className='mt-1 text-sm font-medium text-gray-800 dark:text-gray-100'>
                  {activeAttributeEntries.length}
                </div>
              </div>
            </div>

            <div className='mt-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700/60 dark:bg-gray-800'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>소재 요약</h3>
              {primaryActiveMaterial ? (
                <div className='mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300'>
                  <div>
                    코드:{' '}
                    <span className='font-medium'>
                      {primaryActiveMaterial.code_internal || '-'}
                    </span>
                  </div>
                  <div>
                    업체명:{' '}
                    <span className='font-medium'>{primaryActiveMaterial.vendor_name || '-'}</span>
                  </div>
                  <div>
                    품명:{' '}
                    <span className='font-medium'>{primaryActiveMaterial.item_name || '-'}</span>
                  </div>
                  <div>
                    원산지:{' '}
                    <span className='font-medium'>
                      {primaryActiveMaterial.origin_country || '-'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
                  연결된 소재 정보가 없습니다.
                </p>
              )}
            </div>

            <div className='mt-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700/60 dark:bg-gray-800'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>속성 정보</h3>
              {activeAttributeEntries.length === 0 ? (
                <p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
                  등록된 속성이 없습니다.
                </p>
              ) : (
                <div className='mt-3 space-y-2'>
                  {activeAttributeEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className='flex items-start justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700/60'
                    >
                      <div className='text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400'>
                        {getAttributeLabel(key)}
                      </div>
                      <div className='text-right text-sm text-gray-800 dark:text-gray-100'>
                        {formatAttributeValue(value, key)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isWorksheetDriveItem(activeItem) ? (
              <div className='mt-5 flex justify-end'>
                <button
                  type='button'
                  onClick={() => handleOpenWorksheetFromDrive(activeItem)}
                  className='btn cursor-pointer border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
                >
                  작업지시서 열기
                </button>
              </div>
            ) : null}
          </>
        )}
      </>
    ) : null;

  return (
    <div className='h-[calc(100dvh-64px)] w-full overflow-hidden'>
      <div className='flex h-full'>
        <main
          className={`flex h-full min-w-0 flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-700/60 dark:bg-gray-900 ${
            detailPanelOpen ? 'lg:w-[64%] xl:w-[66%]' : 'w-full'
          }`}
        >
          <div
            ref={(node) => {
              gridSelectionRef.current = node;
              setRootDropRef(node);
            }}
            onMouseDown={handleGridMarqueeSelect}
            onClick={handleContainerBlankClick}
            className='scrollbar-drive relative h-full w-full overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 lg:px-8'
          >
            <div className='mb-8 sm:flex sm:items-center sm:justify-between'>
              <div className='mb-4 sm:mb-0'>
                {!isSearchMode && canShowCurrentLocationMenu ? (
                  <PopoverPrimitive.Root
                    open={currentLocationMenuOpen}
                    onOpenChange={setCurrentLocationMenuOpen}
                  >
                    <PopoverPrimitive.Trigger asChild>
                      <button
                        type='button'
                        className='inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-2xl font-bold text-gray-800 hover:bg-gray-100 md:text-3xl dark:text-gray-100 dark:hover:bg-gray-800'
                        aria-label='현재 폴더 메뉴'
                      >
                        <span>{pageTitle}</span>
                        {isCurrentLocationStarred && (
                          <svg
                            className='ml-1 h-4 w-4 shrink-0 fill-amber-400 md:h-5 md:w-5'
                            viewBox='0 0 20 20'
                            aria-hidden='true'
                          >
                            <path d='M9.05 2.93a1 1 0 0 1 1.9 0l1.33 4.1a1 1 0 0 0 .95.69h4.32a1 1 0 0 1 .59 1.81l-3.5 2.55a1 1 0 0 0-.36 1.12l1.33 4.1a1 1 0 0 1-1.54 1.12L10.6 16a1 1 0 0 0-1.18 0l-3.48 2.52a1 1 0 0 1-1.54-1.12l1.33-4.1a1 1 0 0 0-.36-1.12l-3.5-2.55a1 1 0 0 1 .59-1.81h4.32a1 1 0 0 0 .95-.69l1.33-4.1Z' />
                          </svg>
                        )}
                        <svg
                          className='h-4 w-4 fill-current text-gray-500 dark:text-gray-300'
                          viewBox='0 0 12 12'
                          aria-hidden='true'
                        >
                          <path d='M2 4h8L6 8z' />
                        </svg>
                      </button>
                    </PopoverPrimitive.Trigger>
                    <PopoverPrimitive.Portal>
                      <PopoverPrimitive.Content
                        align='start'
                        side='bottom'
                        sideOffset={6}
                        className='z-50 w-36 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700/60 dark:bg-gray-800'
                      >
                        <button
                          type='button'
                          className='w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                          onClick={() => {
                            setCurrentLocationMenuOpen(false);
                            handleOpenMoveDialog(currentLocationFolderId);
                          }}
                        >
                          폴더 이동
                        </button>
                        <button
                          type='button'
                          className='w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                          onClick={() => {
                            setCurrentLocationMenuOpen(false);
                            handleAddFavoriteFromMenu(
                              currentLocationFolderId,
                              !isCurrentLocationStarred,
                            );
                          }}
                        >
                          {isCurrentLocationStarred ? '즐겨찾기 취소' : '즐겨 찾기'}
                        </button>
                        <button
                          type='button'
                          className='w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                          onClick={() => {
                            setCurrentLocationMenuOpen(false);
                            handleOpenRenameFolderDialog(currentLocationFolderId, pageTitle);
                          }}
                        >
                          폴더 이름 수정
                        </button>
                        <button
                          type='button'
                          className='w-full rounded-md px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10'
                          onClick={() => {
                            setCurrentLocationMenuOpen(false);
                            handleDeleteSingleItem(currentLocationFolderId, pageTitle);
                          }}
                        >
                          삭제하기
                        </button>
                      </PopoverPrimitive.Content>
                    </PopoverPrimitive.Portal>
                  </PopoverPrimitive.Root>
                ) : (
                  <h1 className='text-2xl font-bold text-gray-800 md:text-3xl dark:text-gray-100'>
                    {pageTitle}
                  </h1>
                )}
                {!isSearchMode && (
                  <div className='mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300'>
                    <button
                      type='button'
                      onClick={() => navigate('/faddit/drive')}
                      className='rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                    >
                      홈
                    </button>
                    {visibleBreadcrumbParts.map((part, index) => {
                      const breadcrumbId = breadcrumbIds[breadcrumbIdStartIndex + index];

                      return (
                        <React.Fragment key={`${part}-${index}`}>
                          <span className='text-gray-400'>/</span>
                          {breadcrumbId ? (
                            <button
                              type='button'
                              onClick={() => navigate(`/faddit/drive/${breadcrumbId}`)}
                              className='rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                            >
                              {part}
                            </button>
                          ) : (
                            <span className='px-1.5'>{part}</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
                {isSearchMode && (
                  <div className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
                    {searchLoading ? '검색 중...' : `총 ${searchTotalCount}개 결과`}
                  </div>
                )}
                {isSearchMode && (
                  <form onSubmit={submitResultSearch} className='mt-3 w-full max-w-[520px]'>
                    <div className='relative'>
                      <input
                        ref={resultSearchInputRef}
                        id='drive-result-search'
                        type='search'
                        className='form-input w-full pl-9'
                        placeholder='검색어를 입력하세요'
                        value={searchInputValue}
                        onChange={(event) => setSearchInputValue(event.target.value)}
                      />
                      <button
                        type='submit'
                        className='group absolute inset-0 right-auto cursor-pointer'
                        aria-label='검색'
                      >
                        <svg
                          className='mr-2 ml-3 shrink-0 fill-current text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'
                          width='16'
                          height='16'
                          viewBox='0 0 16 16'
                          xmlns='http://www.w3.org/2000/svg'
                        >
                          <path d='M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z' />
                          <path d='M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z' />
                        </svg>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className='grid grid-flow-col justify-start gap-2 sm:auto-cols-max sm:justify-end'>
                <div className='flex flex-wrap'>
                  <div ref={resultFilterRef} className='relative'>
                    <GlobalTooltip content='필터' position='bottom'>
                      <button
                        type='button'
                        onClick={() => setResultFilterOpen((prev) => !prev)}
                        className='btn inline-flex h-[38px] w-[42px] cursor-pointer items-center justify-center rounded-r-none border-gray-200 bg-white p-0 text-gray-500 hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-900'
                        aria-label='검색 필터'
                      >
                        <SlidersHorizontal className='h-4 w-4' strokeWidth={2} />
                      </button>
                    </GlobalTooltip>

                    {resultFilterOpen && (
                      <div className='absolute top-full left-0 z-20 mt-2 w-60 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700/60 dark:bg-gray-900'>
                        <div className='mb-2 text-xs font-semibold text-gray-400 uppercase'>
                          Filters
                        </div>
                        <div className='space-y-2'>
                          {SEARCH_CATEGORY_VALUES.map((category) => (
                            <label
                              key={category}
                              className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200'
                            >
                              <input
                                type='checkbox'
                                className='form-checkbox'
                                checked={draftSearchCategories.includes(category)}
                                onChange={() => toggleDraftSearchCategory(category)}
                              />
                              <span>{searchFilterLabelMap[category]}</span>
                            </label>
                          ))}
                        </div>
                        <div className='mt-3 flex items-center justify-between'>
                          <button
                            type='button'
                            className='btn-xs border-gray-200 bg-white text-red-500 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:hover:border-gray-600'
                            onClick={clearSearchFilters}
                          >
                            리셋
                          </button>
                          <button
                            type='button'
                            className='btn border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
                            onClick={applySearchFilters}
                          >
                            적용하기
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <GlobalTooltip content='리스트로 보기' position='bottom'>
                    <button
                      type='button'
                      onClick={() => setViewMode('list')}
                      className={`btn -ml-px inline-flex h-[38px] w-[42px] cursor-pointer items-center justify-center rounded-none border-gray-200 p-0 dark:border-gray-700/60 ${
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
                      className={`btn -ml-px inline-flex h-[38px] w-[42px] cursor-pointer items-center justify-center rounded-l-none border-gray-200 p-0 dark:border-gray-700/60 ${
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

                <PopoverPrimitive.Root open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
                  <PopoverPrimitive.Trigger asChild>
                    <button
                      type='button'
                      disabled={isCreatingFolder || isCreatingWorksheet || isCreatingMaterial}
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
                      <span className='max-xs:sr-only'>생성하기</span>
                    </button>
                  </PopoverPrimitive.Trigger>
                  <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Content
                      align='end'
                      side='bottom'
                      sideOffset={8}
                      className='z-50 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700/60 dark:bg-gray-800'
                    >
                      <button
                        type='button'
                        className='w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                        onClick={() => {
                          setCreateMenuOpen(false);
                          setCreateFolderModalOpen(true);
                        }}
                      >
                        폴더 생성
                      </button>
                      <button
                        type='button'
                        className='w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                        onClick={() => {
                          setCreateMenuOpen(false);
                          setCreateWorksheetModalOpen(true);
                        }}
                      >
                        작업지시서 생성
                      </button>
                      <button
                        type='button'
                        className='w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                        onClick={() => {
                          setCreateMenuOpen(false);
                          setTemplateCreateModalOpen(true);
                        }}
                      >
                        기타 파일 업로드
                      </button>
                    </PopoverPrimitive.Content>
                  </PopoverPrimitive.Portal>
                </PopoverPrimitive.Root>
              </div>
            </div>

            <div ref={gridContentRef} className='mt-8'>
              {viewMode === 'grid' ? (
                <div className='space-y-6'>
                  {isDriveListLoading ? (
                    <>
                      <div className={`grid gap-5 ${cardGridClass}`}>
                        {Array.from({ length: folderSkeletonCount }).map((_, index) => (
                          <DriveFolderTileSkeleton key={`folder-skeleton-${index + 1}`} />
                        ))}
                      </div>
                      <div className={`grid gap-5 ${cardGridClass}`}>
                        {Array.from({ length: fileSkeletonCount }).map((_, index) => (
                          <DriveItemCardSkeleton key={`file-skeleton-${index + 1}`} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`grid gap-5 ${cardGridClass}`}>
                        {displayedFolders.map((folder) => {
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
                              onOpen={navigateToFolder}
                              onMoveFolder={handleOpenMoveDialog}
                              onAddFavorite={handleAddFavoriteFromMenu}
                              onRenameFolder={handleOpenRenameFolderDialog}
                              onDeleteFolder={handleDeleteSingleItem}
                            />
                          );
                        })}
                      </div>

                      <div className={`grid gap-5 ${cardGridClass}`}>
                        {displayedItems.map((item) => {
                          const dragSelection = getDragSelection(item.id, 'file', item.title);
                          const linkedMaterials = materialsByFileSystemId[item.id] || [];
                          const primaryMaterial = linkedMaterials[0] || null;
                          const displayImageSrc = getDisplayImageSrc(item.id, item.imageSrc);
                          const categoryLabel = getCategoryLabel(item.id, item.badge);
                          const attributesCount = linkedMaterials.reduce((count, material) => {
                            const attrs = material.attributes || {};
                            return count + Object.keys(attrs).length;
                          }, 0);
                          const summaryText = primaryMaterial
                            ? [
                                primaryMaterial.code_internal
                                  ? `코드 ${primaryMaterial.code_internal}`
                                  : '',
                                primaryMaterial.vendor_name || '',
                                primaryMaterial.item_name || '',
                              ]
                                .filter((value): value is string => Boolean(value))
                                .join(' · ')
                            : [item.isStarred ? '즐겨찾기된 파일' : '', item.subtitle]
                                .filter((value): value is string => Boolean(value))
                                .join(' · ');
                          return (
                            <DriveItemCard
                              key={item.id}
                              id={item.id}
                              materialFetchedFromBackend={item.id in materialsByFileSystemId}
                              materialAttributesCount={attributesCount}
                              categoryLabel={categoryLabel}
                              summaryText={summaryText}
                              materialCardMeta={
                                primaryMaterial
                                  ? {
                                      codeInternal: primaryMaterial.code_internal || '',
                                      vendorName: primaryMaterial.vendor_name || '',
                                      itemName: primaryMaterial.item_name || '',
                                      originCountry: primaryMaterial.origin_country || '',
                                    }
                                  : undefined
                              }
                              creatorName={item.owner || currentUserName}
                              creatorAvatarUrl={
                                item.ownerProfileImg ||
                                ((item.owner || currentUserName) === currentUserName
                                  ? currentUserProfileImg
                                  : undefined)
                              }
                              isStarred={Boolean(item.isStarred)}
                              imageSrc={displayImageSrc}
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
                              onCardDoubleClick={handleFileCardDoubleClick}
                              onEdit={handleOpenFileEditPanel}
                              onMoveToFolder={handleOpenMoveDialog}
                              onAddFavorite={handleAddFavoriteFromMenu}
                              onDelete={(id) => handleDeleteSingleItem(id, item.title)}
                              dragSelectionIds={dragSelection.ids}
                              dragSelectionEntries={dragSelection.entries}
                              className='min-w-0'
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
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
                            onRowDoubleClick={handleListRowDoubleClick}
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
          className={`hidden h-full overflow-hidden border-l border-gray-200 bg-[#f9f9f9] transition-all duration-300 ease-out lg:block dark:border-gray-700/60 dark:bg-gray-900 ${
            detailPanelOpen && activeItem ? 'w-[36%] xl:w-[34%]' : 'w-0'
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
                <div className='mb-2 flex justify-end gap-2'>
                  <GlobalTooltip content='수정' position='bottom'>
                    <button
                      type='button'
                      onClick={() => setDetailPanelEditMode(true)}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-xs transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-violet-500/60 dark:hover:bg-violet-500/10 dark:hover:text-violet-300'
                      aria-label='상세 패널 수정'
                    >
                      <svg className='h-4 w-4' viewBox='0 0 20 20' aria-hidden='true'>
                        <path
                          d='M13.6 2.7a1.7 1.7 0 0 1 2.4 0l1.3 1.3a1.7 1.7 0 0 1 0 2.4L8.2 15.5l-3.7.7.7-3.7 8.4-8.4Z'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='1.7'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                        <path
                          d='M11.9 4.4l3.7 3.7'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='1.7'
                          strokeLinecap='round'
                        />
                      </svg>
                    </button>
                  </GlobalTooltip>
                  <GlobalTooltip content='닫기' position='bottom'>
                    <button
                      type='button'
                      onClick={handleCloseDetailPanel}
                      className='rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                      aria-label='상세 패널 닫기'
                    >
                      <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
                        <path d='M7.95 6.536 12.192 2.293a1 1 0 1 1 1.415 1.414L9.364 7.95l4.243 4.242a1 1 0 1 1-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 0 1-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 0 1 1.414-1.414L7.95 6.536Z' />
                      </svg>
                    </button>
                  </GlobalTooltip>
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
        onClick={handleCloseDetailPanel}
      >
        <div
          className={`h-full w-full overflow-y-auto bg-[#f9f9f9] p-4 transition-transform duration-300 sm:p-6 dark:bg-gray-900 ${
            detailPanelOpen && activeItem ? 'translate-y-0' : 'translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {activeItem ? (
            <>
              <div className='mb-2 flex justify-end gap-2'>
                <GlobalTooltip content='수정' position='bottom'>
                  <button
                    type='button'
                    onClick={() => setDetailPanelEditMode(true)}
                    className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-xs transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-violet-500/60 dark:hover:bg-violet-500/10 dark:hover:text-violet-300'
                    aria-label='상세 패널 수정'
                  >
                    <svg className='h-4 w-4' viewBox='0 0 20 20' aria-hidden='true'>
                      <path
                        d='M13.6 2.7a1.7 1.7 0 0 1 2.4 0l1.3 1.3a1.7 1.7 0 0 1 0 2.4L8.2 15.5l-3.7.7.7-3.7 8.4-8.4Z'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.7'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M11.9 4.4l3.7 3.7'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.7'
                        strokeLinecap='round'
                      />
                    </svg>
                  </button>
                </GlobalTooltip>
                <GlobalTooltip content='닫기' position='bottom'>
                  <button
                    type='button'
                    onClick={handleCloseDetailPanel}
                    className='rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                    aria-label='상세 패널 닫기'
                  >
                    <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
                      <path d='M7.95 6.536 12.192 2.293a1 1 0 1 1 1.415 1.414L9.364 7.95l4.243 4.242a1 1 0 1 1-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 0 1-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 0 1 1.414-1.414L7.95 6.536Z' />
                    </svg>
                  </button>
                </GlobalTooltip>
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
              되돌리기
            </button>
          </div>
        </div>
      </Notification>

      <Notification
        type='warning'
        open={favoriteToastOpen}
        setOpen={setFavoriteToastOpen}
        showAction={false}
        className='fixed right-4 bottom-4 z-50'
      >
        <div className='mb-1 font-medium text-gray-800 dark:text-gray-100'>즐겨찾기</div>
        <div>
          <span>{favoriteMessage}</span>
        </div>
      </Notification>

      {moveDialogOpen ? (
        <div className='fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/45 px-4'>
          <div className='w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700/60 dark:bg-gray-800'>
            <div className='text-base font-semibold text-gray-800 dark:text-gray-100'>
              폴더 이동
            </div>
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
              이동할 폴더를 선택하세요.
            </p>

            <div className='mt-4 max-h-[320px] overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700/60'>
              <div
                className={`mb-1 flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm ${
                  moveTargetFolderId === (rootFolderId || rootFolderFromAuth || '')
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60'
                }`}
                onClick={() => setMoveTargetFolderId(rootFolderId || rootFolderFromAuth || '')}
              >
                <svg
                  className='mr-2 h-4 w-4 shrink-0 fill-gray-500 dark:fill-gray-300'
                  viewBox='0 0 20 20'
                >
                  <path d='M2.5 4.75A2.25 2.25 0 0 1 4.75 2.5h3.21a2 2 0 0 1 1.41.59l.75.75c.19.19.44.29.71.29h4.42a2.25 2.25 0 0 1 2.25 2.25v6.87a2.25 2.25 0 0 1-2.25 2.25H4.75A2.25 2.25 0 0 1 2.5 13.25V4.75Z' />
                </svg>
                <span>홈</span>
              </div>
              {renderMoveFolderTree(workspaces)}
            </div>

            <div className='mt-4 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setMoveDialogOpen(false)}
                className='btn border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
              >
                취소
              </button>
              <button
                type='button'
                onClick={handleConfirmMoveFromMenu}
                className='btn border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
              >
                이동
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {renameDialogOpen ? (
        <div className='fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/45 px-4'>
          <div className='w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700/60 dark:bg-gray-800'>
            <div className='text-base font-semibold text-gray-800 dark:text-gray-100'>
              폴더 이름 수정
            </div>
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
              새 폴더 이름을 입력하세요.
            </p>

            <div className='mt-4'>
              <input
                type='text'
                value={renameFolderName}
                onChange={(event) => setRenameFolderName(event.target.value)}
                className='form-input w-full'
                placeholder='폴더 이름'
              />
            </div>

            <div className='mt-4 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setRenameDialogOpen(false)}
                className='btn border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
              >
                취소
              </button>
              <button
                type='button'
                onClick={handleConfirmRenameFolder}
                className='btn border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CreateFolderModal
        modalOpen={createFolderModalOpen}
        setModalOpen={setCreateFolderModalOpen}
        isSubmitting={isCreatingFolder}
        onSubmit={handleCreateFolder}
      />

      <CreateWorksheetModal
        modalOpen={createWorksheetModalOpen}
        setModalOpen={setCreateWorksheetModalOpen}
        isSubmitting={isCreatingWorksheet}
        onSubmit={handleCreateWorksheet}
      />

      <TemplateCreateModal
        modalOpen={templateCreateModalOpen}
        setModalOpen={setTemplateCreateModalOpen}
        isSubmittingFolder={isCreatingFolder}
        isSubmittingMaterial={isCreatingMaterial}
        isSubmittingWorksheet={isCreatingWorksheet}
        onCreateFolder={handleCreateFolder}
        onCreateMaterial={handleCreateMaterial}
        onCreateWorksheet={handleCreateWorksheet}
        hiddenTemplateKeys={['folder', 'worksheet']}
      />
    </div>
  );
};

export default FadditDrive;

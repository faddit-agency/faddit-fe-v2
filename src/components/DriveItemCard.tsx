import React, { useId, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

export interface DriveItemCardProps {
  /** 이미지 URL */
  imageSrc: string;
  /** 이미지 대체 텍스트 */
  imageAlt: string;
  /** 카드 제목 */
  title: string;
  /** 부제목/설명 (선택) */
  subtitle?: string;
  /** 가격 표시 (예: "$89.00") */
  price?: string;
  /** 평점 (1~5, 소수 가능) */
  rating?: number;
  /** 리뷰 수 (평점 옆에 표시, 예: 478) */
  ratingCount?: number;
  /** 이미지 아래 배지 텍스트 (예: "Popular") */
  badge?: string;
  /** 액션 버튼 라벨 (예: "Buy Now", "Buy Tickets") */
  actionLabel: string;
  /** 액션 버튼 링크 (기본: "#0") */
  actionHref?: string;
  /** 이미지 위 오른쪽 오버레이 (좋아요 버튼 등) */
  imageOverlay?: React.ReactNode;
  /** 카드 본문 (특징 목록 등) */
  children?: React.ReactNode;
  /** 그리드 컬럼 클래스 (기본: col-span-full sm:col-span-6 xl:col-span-3) */
  id?: string;
  /** 그리드 컬럼 클래스 (기본: col-span-full sm:col-span-6 xl:col-span-3) */
  className?: string;
  isSelected?: boolean;
  isActive?: boolean;
  onSelectChange?: (id: string, checked: boolean) => void;
  onCardClick?: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  dragSelectionIds?: string[];
  dragSelectionEntries?: Array<{ id: string; type: 'file' | 'folder'; name: string }>;
  fileSystemId?: string;
  parentId?: string | null;
  sourcePath?: string;
  stateStoreKey?: string;
  materialAttributesCount?: number;
  materialFetchedFromBackend?: boolean;
  categoryLabel?: string;
  summaryText?: string;
  creatorName?: string;
}

const PencilIcon = ({ className }: { className?: string }) => (
  // ... (unchanged)
  <svg
    className={className}
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M11.33 2.67l2.12 2.12-8.48 8.48-2.12.01.01-2.12 8.46-8.47z' />
    <path d='M13.5 1.5l1 1' />
  </svg>
);

const MoreIcon = ({ className }: { className?: string }) => (
  // ... (unchanged)
  <svg className={className} width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
    <circle cx='4' cy='8' r='1.25' />
    <circle cx='8' cy='8' r='1.25' />
    <circle cx='12' cy='8' r='1.25' />
  </svg>
);

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface EditableTag {
  id: string;
  label: string;
  tone: TagTone;
}

type TagTone =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red';

const TONE_STYLES: Record<TagTone, { chip: string; swatch: string; label: string }> = {
  default: {
    chip: 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200',
    swatch: 'bg-gray-100 border-gray-300',
    label: '기본',
  },
  gray: {
    chip: 'border-gray-300 bg-gray-200 text-gray-700 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200',
    swatch: 'bg-gray-200 border-gray-400',
    label: '회색',
  },
  brown: {
    chip: 'border-[#D8C3B3] bg-[#EADBD0] text-[#6E4D39]',
    swatch: 'bg-[#EADBD0] border-[#D8C3B3]',
    label: '갈색',
  },
  orange: {
    chip: 'border-[#E7CBB5] bg-[#F3DFC9] text-[#8D5A31]',
    swatch: 'bg-[#F3DFC9] border-[#E7CBB5]',
    label: '주황색',
  },
  yellow: {
    chip: 'border-[#E9D8AA] bg-[#F4E9C8] text-[#7E652A]',
    swatch: 'bg-[#F4E9C8] border-[#E9D8AA]',
    label: '노란색',
  },
  green: {
    chip: 'border-[#BFD5C8] bg-[#D8E8DD] text-[#2F6A4B]',
    swatch: 'bg-[#D8E8DD] border-[#BFD5C8]',
    label: '초록색',
  },
  blue: {
    chip: 'border-[#BCD5EA] bg-[#D8E7F3] text-[#2D5F88]',
    swatch: 'bg-[#D8E7F3] border-[#BCD5EA]',
    label: '파란색',
  },
  purple: {
    chip: 'border-[#D1C2E8] bg-[#E3DAF3] text-[#5F4A8A]',
    swatch: 'bg-[#E3DAF3] border-[#D1C2E8]',
    label: '보라색',
  },
  pink: {
    chip: 'border-[#E8C4D6] bg-[#F2DCE7] text-[#8D4A69]',
    swatch: 'bg-[#F2DCE7] border-[#E8C4D6]',
    label: '분홍색',
  },
  red: {
    chip: 'border-[#E9BFC0] bg-[#F2D8D8] text-[#8B3D40]',
    swatch: 'bg-[#F2D8D8] border-[#E9BFC0]',
    label: '빨간색',
  },
};

const TAG_TONE_ORDER: TagTone[] = [
  'default',
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
];

const reorderList = (list: EditableTag[], fromId: string, toId: string) => {
  const oldIndex = list.findIndex((item) => item.id === fromId);
  const newIndex = list.findIndex((item) => item.id === toId);

  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return list;
  }

  const next = [...list];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return next;
};

const EditableTagRow = ({
  tag,
  selected,
  renameValue,
  isEditing,
  onToggle,
  onDelete,
  onRename,
  onRenameValueChange,
  onRenameStart,
  onRenameCommit,
  onToneChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}: {
  tag: EditableTag;
  selected: boolean;
  renameValue: string;
  isEditing: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  onRenameValueChange: (value: string) => void;
  onRenameStart: () => void;
  onRenameCommit: () => void;
  onToneChange: (tone: TagTone) => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent<HTMLLIElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) => {
  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-sm transition ${
        isDragging
          ? 'border-violet-300 bg-violet-50 dark:border-violet-500/60 dark:bg-violet-900/30'
          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800 dark:hover:bg-gray-700/60'
      }`}
    >
      <div className='flex min-w-0 items-center gap-2'>
        <button
          type='button'
          className='cursor-grab text-gray-400 hover:text-gray-600'
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className='sr-only'>Drag</span>
          <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
            <circle cx='5' cy='4' r='1' />
            <circle cx='11' cy='4' r='1' />
            <circle cx='5' cy='8' r='1' />
            <circle cx='11' cy='8' r='1' />
            <circle cx='5' cy='12' r='1' />
            <circle cx='11' cy='12' r='1' />
          </svg>
        </button>

        {isEditing ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onRenameCommit();
              }
            }}
            onBlur={onRenameCommit}
            className='w-28 rounded border border-violet-400 px-2 py-1 text-sm text-gray-800 outline-hidden dark:bg-gray-800 dark:text-gray-100'
          />
        ) : (
          <button
            type='button'
            onClick={onToggle}
            className={`inline-flex max-w-full items-center truncate rounded-md border px-2 py-0.5 text-sm ${
              TONE_STYLES[tag.tone].chip
            } ${selected ? 'ring-1 ring-violet-400' : ''}`}
          >
            {tag.label}
          </button>
        )}
      </div>

      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger asChild>
          <button
            type='button'
            className='rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200'
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className='sr-only'>More</span>
            <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
              <circle cx='3' cy='8' r='1.25' />
              <circle cx='8' cy='8' r='1.25' />
              <circle cx='13' cy='8' r='1.25' />
            </svg>
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Content
          align='end'
          sideOffset={4}
          className='z-50 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700/60 dark:bg-gray-800'
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className='space-y-2'>
            <div className='rounded-md border border-violet-400 px-2 py-1'>
              <input
                value={isEditing ? renameValue : tag.label}
                onFocus={onRenameStart}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onRenameCommit();
                  }
                }}
                onBlur={onRenameCommit}
                className='w-full border-none bg-transparent p-0 text-sm text-gray-800 outline-hidden dark:text-gray-100'
              />
            </div>

            <button
              type='button'
              className='w-full rounded-md px-2 py-1.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              onClick={onDelete}
            >
              삭제
            </button>

            <div className='border-t border-gray-200 pt-2 dark:border-gray-700/60'>
              <p className='mb-1 text-xs text-gray-500'>색</p>
              <div className='space-y-1'>
                {TAG_TONE_ORDER.map((tone) => (
                  <button
                    key={tone}
                    type='button'
                    className='flex w-full items-center justify-between rounded-md px-1.5 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    onClick={() => onToneChange(tone)}
                  >
                    <span className='flex items-center gap-2'>
                      <span
                        className={`inline-block h-4 w-4 rounded border ${TONE_STYLES[tone].swatch}`}
                      />
                      {TONE_STYLES[tone].label}
                    </span>
                    {tag.tone === tone ? <span>✓</span> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
    </li>
  );
};

const DriveItemCard: React.FC<DriveItemCardProps> = ({
  id,
  imageSrc,
  imageAlt,
  title,
  subtitle,
  price,
  rating,
  ratingCount,
  badge,
  actionLabel,
  actionHref = '#0',
  imageOverlay,
  children,
  className = 'col-span-full sm:col-span-6 xl:col-span-4 2xl:col-span-3',
  isSelected = false,
  isActive = false,
  onSelectChange,
  onCardClick,
  dragSelectionIds,
  dragSelectionEntries,
  materialAttributesCount,
  materialFetchedFromBackend,
  categoryLabel,
  summaryText,
  creatorName,
}) => {
  const idPrefix = useId();
  const checkboxId = id || title;
  const [chipEditorOpen, setChipEditorOpen] = useState(false);
  const [newItemValue, setNewItemValue] = useState('');
  const [tags, setTags] = useState<EditableTag[]>(() => {
    const defaults: Array<{ label: string; tone: TagTone }> = [
      { label: badge || '테스트 뱃지1', tone: 'green' },
      { label: '테스트 뱃지2', tone: 'gray' },
      { label: '테스트 뱃지3', tone: 'yellow' },
      { label: '테스트 뱃지4', tone: 'blue' },
      { label: '테스트 뱃지5', tone: 'purple' },
      { label: '테스트 뱃지6', tone: 'red' },
      { label: '테스트 뱃지7', tone: 'orange' },
      { label: '테스트 뱃지8', tone: 'brown' },
    ];

    return defaults.map((item, index) => ({
      id: `${idPrefix}-chip-${index + 1}`,
      label: item.label,
      tone: item.tone,
    }));
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);

  React.useEffect(() => {
    setSelectedTagIds((prev) => {
      if (prev.length > 0) {
        return prev.filter((tagId) => tags.some((tag) => tag.id === tagId));
      }
      return tags.slice(0, 2).map((tag) => tag.id);
    });
  }, [tags]);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id || 'draggable-item',
    disabled: !id || chipEditorOpen,
    data: {
      type: 'drive-item',
      imageSrc,
      imageAlt,
      title,
      subtitle,
      badge,
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

  const visibleChips = tags.filter((tag) => selectedTagIds.includes(tag.id)).slice(0, 3);

  const handleRowDragOver = (event: React.DragEvent<HTMLLIElement>) => {
    event.preventDefault();
  };

  const handleRowDrop = (targetId: string) => {
    if (!draggingTagId || draggingTagId === targetId) {
      setDraggingTagId(null);
      return;
    }

    setTags((prev) => reorderList(prev, draggingTagId, targetId));
    setDraggingTagId(null);
  };

  const handleRenameStart = (tag: EditableTag) => {
    setRenamingId(tag.id);
    setRenameValue(tag.label);
  };

  const handleRenameSubmit = (tagId: string) => {
    const nextLabel = renameValue.trim();
    if (!nextLabel) {
      setRenamingId(null);
      return;
    }

    setTags((prev) => prev.map((tag) => (tag.id === tagId ? { ...tag, label: nextLabel } : tag)));
    setRenamingId(null);
  };

  const handleDeleteTag = (tagId: string) => {
    setTags((prev) => prev.filter((tag) => tag.id !== tagId));
    setSelectedTagIds((prev) => prev.filter((idValue) => idValue !== tagId));
    if (renamingId === tagId) {
      setRenamingId(null);
    }
  };

  const handleAddTag = () => {
    const nextLabel = newItemValue.trim();

    if (nextLabel) {
      const existing = tags.find((tag) => tag.label.toLowerCase() === nextLabel.toLowerCase());
      if (existing) {
        setSelectedTagIds((prev) =>
          prev.includes(existing.id) ? prev : [...prev, existing.id].slice(-3),
        );
        setNewItemValue('');
        return;
      }
    }

    const createdLabel = nextLabel || `새 옵션 ${tags.length + 1}`;
    const createdId = `${idPrefix}-chip-${Date.now()}`;

    setTags((prev) => {
      if (prev.some((tag) => tag.label.toLowerCase() === createdLabel.toLowerCase())) {
        return prev;
      }
      return [...prev, { id: createdId, label: createdLabel, tone: 'default' }];
    });
    setSelectedTagIds((prev) => [...prev, createdId].slice(-3));
    setNewItemValue('');
  };

  const handleToggleSelectTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((idValue) => idValue !== tagId);
      }
      return [...prev, tagId].slice(-3);
    });
  };

  const handleChipRemove = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((idValue) => idValue !== tagId));
  };

  const handleToneChange = (tagId: string, tone: TagTone) => {
    setTags((prev) => prev.map((tag) => (tag.id === tagId ? { ...tag, tone } : tag)));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-selectable-item='true'
      data-item-id={id}
      {...listeners}
      {...attributes}
      onClick={(event) => {
        if (!id || !onCardClick) {
          return;
        }
        onCardClick(id, event);
      }}
      className={`group ${className} cursor-pointer touch-none overflow-hidden rounded-xl border bg-white shadow-xs transition-all dark:bg-gray-800 ${
        isSelected
          ? 'border-violet-300 shadow-lg shadow-violet-500/10 dark:border-violet-500/60'
          : isActive
            ? 'border-violet-300 shadow-md shadow-violet-500/10 dark:border-violet-500/60'
            : 'border-gray-200 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/10 dark:border-gray-700/60 dark:hover:border-violet-500/50'
      }`}
    >
      <div className='flex h-full flex-col'>
        {/* Image */}
        <div className='relative'>
          <label
            className={`absolute top-3 left-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white/95 shadow-sm transition-opacity dark:border-gray-600 dark:bg-gray-800/95 ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span className='sr-only'>Select file</span>
            <input
              id={checkboxId}
              className='form-checkbox'
              type='checkbox'
              checked={isSelected}
              onChange={(e) => {
                if (!id || !onSelectChange) {
                  return;
                }
                onSelectChange(id, e.target.checked);
              }}
            />
          </label>
          <img
            className='h-36 w-full object-cover sm:h-40'
            src={imageSrc}
            width='286'
            height='160'
            alt={imageAlt}
          />
          {imageOverlay && <div className='absolute top-0 right-0 mt-4 mr-4'>{imageOverlay}</div>}
          {/* Hover: 연필 / 구분선 / 더보기 */}
          <div className='absolute top-3 right-3 flex items-center rounded-lg bg-white/90 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 dark:bg-gray-800/90'>
            <button
              type='button'
              className='flex h-8 w-8 items-center justify-center rounded-l-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
              aria-label='수정'
            >
              <PencilIcon className='h-4 w-4' />
            </button>
            <span className='h-4 w-px bg-gray-200 dark:bg-gray-600' aria-hidden />
            <button
              type='button'
              className='flex h-8 w-8 items-center justify-center rounded-r-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
              aria-label='더보기'
            >
              <MoreIcon className='h-4 w-4' />
            </button>
          </div>
        </div>

        {/* Card Content */}
        <div className='flex grow flex-col p-5'>
          {/* Badge (이미지 아래) */}
          {(categoryLabel || badge) && (
            <div className=''>
              <span className='inline-flex items-center rounded-full bg-[#3ec972]/20 px-2.5 pt-1 pb-0.5 text-center text-xs font-medium text-[#239F52] dark:bg-gray-700/80 dark:text-[#239F52]'>
                {categoryLabel || badge}
              </span>
            </div>
          )}
          <div className='mt-3 grow'>
            <header className={subtitle || summaryText ? 'mb-2' : 'mb-3'}>
              <h3 className='mb-1 text-lg font-semibold text-gray-800 dark:text-gray-100'>
                {title}
              </h3>

              <PopoverPrimitive.Root open={chipEditorOpen} onOpenChange={setChipEditorOpen}>
                <PopoverPrimitive.Trigger asChild>
                  <button
                    type='button'
                    className='mb-2 flex min-h-7 w-full flex-wrap items-center gap-1 text-left'
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {visibleChips.map((tag) => {
                      const toneClass = TONE_STYLES[tag.tone].chip;

                      return (
                        <span
                          key={tag.id}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${toneClass}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setChipEditorOpen(true);
                          }}
                        >
                          {tag.label}
                          <span
                            className='cursor-pointer text-gray-500 hover:text-gray-700'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChipRemove(tag.id);
                            }}
                          >
                            x
                          </span>
                        </span>
                      );
                    })}
                  </button>
                </PopoverPrimitive.Trigger>
                <PopoverPrimitive.Portal>
                  <PopoverPrimitive.Content
                    align='start'
                    side='bottom'
                    sideOffset={4}
                    className='z-50 w-72 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700/60 dark:bg-gray-800'
                    onPointerDownOutside={(e) => e.preventDefault()}
                  >
                    <div className='space-y-2'>
                      <div className='flex justify-end'>
                        <button
                          type='button'
                          onClick={() => setChipEditorOpen(false)}
                          className='rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                          aria-label='칩 편집 닫기'
                        >
                          <svg className='h-4 w-4 fill-current' viewBox='0 0 16 16'>
                            <path d='M7.95 6.536 12.192 2.293a1 1 0 1 1 1.415 1.414L9.364 7.95l4.243 4.242a1 1 0 1 1-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 0 1-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 0 1 1.414-1.414L7.95 6.536Z' />
                          </svg>
                        </button>
                      </div>

                      {/* <div className='border-b border-gray-200 pb-2 dark:border-gray-700/60'>
                        <input
                          value={newItemValue}
                          onChange={(e) => setNewItemValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing) {
                              return;
                            }
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder='옵션 선택 또는 생성'
                          className='w-full border-none bg-transparent px-1 text-sm text-gray-700 outline-hidden dark:text-gray-200'
                        />
                      </div> */}

                      <ul className='space-y-1.5'>
                        {tags.map((tag) => {
                          return (
                            <EditableTagRow
                              key={tag.id}
                              tag={tag}
                              selected={selectedTagIds.includes(tag.id)}
                              renameValue={renameValue}
                              isEditing={renamingId === tag.id}
                              onToggle={() => handleToggleSelectTag(tag.id)}
                              onRename={() => handleRenameStart(tag)}
                              onDelete={() => handleDeleteTag(tag.id)}
                              onRenameStart={() => handleRenameStart(tag)}
                              onRenameValueChange={setRenameValue}
                              onRenameCommit={() => handleRenameSubmit(tag.id)}
                              onToneChange={(tone) => handleToneChange(tag.id, tone)}
                              onDragStart={() => setDraggingTagId(tag.id)}
                              onDragOver={handleRowDragOver}
                              onDrop={() => handleRowDrop(tag.id)}
                              onDragEnd={() => setDraggingTagId(null)}
                              isDragging={draggingTagId === tag.id}
                            />
                          );
                        })}
                      </ul>

                      <button
                        type='button'
                        onClick={handleAddTag}
                        className='w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/60'
                      >
                        새로운 카테고리 추가
                      </button>
                    </div>
                  </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
              </PopoverPrimitive.Root>

              {(summaryText || subtitle) && (
                <div className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                  {summaryText || subtitle}
                </div>
              )}

              {/* <div className='mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400'>
                {summaryText ? <div>{summaryText}</div> : null}
              </div> */}
            </header>

            {children && <div className='mb-5'>{children}</div>}
          </div>

          {/* Card footer */}
          <div className='flex items-center justify-between'>
            <div className='text-xs font-medium text-gray-500 dark:text-gray-400'>
              생성자: {creatorName || '알 수 없음'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveItemCard;

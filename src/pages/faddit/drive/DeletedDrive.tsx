import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, LayoutGrid, List, RotateCcw, Trash2 } from 'lucide-react';
import DriveItemCard from '../../../components/DriveItemCard';
import Notification from '../../../components/Notification';
import GlobalTooltip from '../../../components/ui/GlobalTooltip';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  DriveNode,
  destroyDriveItems,
  getDriveFilePreviewUrl,
  getDriveTrashAll,
  restoreDriveItems,
  updateDriveItems,
} from '../../../lib/api/driveApi';
import ChildClothImage from '../../../images/faddit/childcloth.png';

type ViewMode = 'grid' | 'list';
type ConfirmMode = 'destroy' | null;

type TrashFileNode = DriveNode & {
  previewUrl?: string;
};

type TrashListEntry = {
  id: string;
  kind: 'folder' | 'file';
  title: string;
  subtitle?: string;
  creatorName?: string;
  date: string;
  size: string;
  node?: DriveNode;
};

const isImageFile = (extension?: string) => {
  if (!extension) {
    return false;
  }
  const value = extension.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(value);
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

const DeletedDrive: React.FC = () => {
  const userId = useAuthStore((state) => state.user?.userId);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<DriveNode[]>([]);
  const [files, setFiles] = useState<TrashFileNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const folderById = useMemo(
    () =>
      folders.reduce<Record<string, DriveNode>>((acc, folder) => {
        acc[folder.fileSystemId] = folder;
        return acc;
      }, {}),
    [folders],
  );

  const allDeletedIds = useMemo(() => {
    const idSet = new Set<string>();
    folders.forEach((folder) => idSet.add(folder.fileSystemId));
    files.forEach((file) => idSet.add(file.fileSystemId));
    return idSet;
  }, [folders, files]);

  const trashParentMap = useMemo(() => {
    const parentMap: Record<string, string | null> = {};
    folders.forEach((folder) => {
      parentMap[folder.fileSystemId] = folder.parentId;
    });
    files.forEach((file) => {
      parentMap[file.fileSystemId] = file.parentId;
    });
    return parentMap;
  }, [folders, files]);

  const trashChildrenMap = useMemo(() => {
    const childMap = new Map<string | null, string[]>();

    const appendChild = (parentId: string | null, childId: string) => {
      const current = childMap.get(parentId) || [];
      current.push(childId);
      childMap.set(parentId, current);
    };

    folders.forEach((folder) => appendChild(folder.parentId, folder.fileSystemId));
    files.forEach((file) => appendChild(file.parentId, file.fileSystemId));

    return childMap;
  }, [folders, files]);

  const collectDescendantTrashIds = (ids: string[]) => {
    const resolved = new Set<string>();
    const queue = [...ids];

    while (queue.length > 0) {
      const nextId = queue.shift();
      if (!nextId || resolved.has(nextId)) {
        continue;
      }
      resolved.add(nextId);

      const children = trashChildrenMap.get(nextId) || [];
      children.forEach((childId) => {
        if (!resolved.has(childId)) {
          queue.push(childId);
        }
      });
    }

    return resolved;
  };

  const collectRestoreTrashIds = (ids: string[]) => {
    const resolved = collectDescendantTrashIds(ids);

    ids.forEach((id) => {
      let cursor = trashParentMap[id];
      const visited = new Set<string>();

      while (cursor && !visited.has(cursor) && allDeletedIds.has(cursor)) {
        visited.add(cursor);
        resolved.add(cursor);
        cursor = trashParentMap[cursor] ?? null;
      }
    });

    return resolved;
  };

  const loadTrash = async () => {
    try {
      setLoading(true);
      const response = await getDriveTrashAll();

      const nextFolders = response.folders.filter((node) => node.type === 'folder');
      const nextFiles = await Promise.all(
        response.files.map(async (node) => {
          if (node.worksheetThumbnail) {
            return { ...node, previewUrl: node.worksheetThumbnail };
          }

          if (!isImageFile(node.mimetype)) {
            return { ...node, previewUrl: ChildClothImage };
          }

          try {
            const previewUrl = await getDriveFilePreviewUrl(node.fileSystemId);
            return { ...node, previewUrl: previewUrl || ChildClothImage };
          } catch {
            return { ...node, previewUrl: ChildClothImage };
          }
        }),
      );

      setFolders(nextFolders);
      setFiles(nextFiles);
      setSelectedIds((prev) =>
        prev.filter(
          (id) =>
            nextFolders.some((folder) => folder.fileSystemId === id) ||
            nextFiles.some((file) => file.fileSystemId === id),
        ),
      );
    } catch (error) {
      console.error('Failed to load trash items', error);
      setFolders([]);
      setFiles([]);
      setSelectedIds([]);
      setCurrentFolderId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTrash();
  }, []);

  useEffect(() => {
    if (currentFolderId && !folderById[currentFolderId]) {
      setCurrentFolderId(null);
    }
  }, [currentFolderId, folderById]);

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((entryId) => entryId !== id);
    });
  };

  const openFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const visibleFolders = useMemo(() => {
    if (currentFolderId) {
      return folders.filter((folder) => folder.parentId === currentFolderId);
    }
    return folders.filter((folder) => !folder.parentId || !allDeletedIds.has(folder.parentId));
  }, [allDeletedIds, currentFolderId, folders]);

  const visibleFiles = useMemo(() => {
    if (currentFolderId) {
      return files.filter((file) => file.parentId === currentFolderId);
    }
    return files.filter((file) => !file.parentId || !allDeletedIds.has(file.parentId));
  }, [allDeletedIds, currentFolderId, files]);

  const breadcrumbFolders = useMemo(() => {
    if (!currentFolderId) {
      return [] as DriveNode[];
    }

    const chain: DriveNode[] = [];
    const visited = new Set<string>();
    let cursor: string | null = currentFolderId;

    while (cursor && folderById[cursor] && !visited.has(cursor)) {
      const folder = folderById[cursor];
      chain.unshift(folder);
      visited.add(cursor);
      cursor = folder.parentId && folderById[folder.parentId] ? folder.parentId : null;
    }

    return chain;
  }, [currentFolderId, folderById]);

  const restoreByIds = async (ids: string[]) => {
    if (!ids.length || !userId) {
      return;
    }

    const restoreSet = collectRestoreTrashIds(ids);
    const restoreIds = Array.from(restoreSet);
    const starredRestoreIds = [
      ...folders.filter((folder) => restoreSet.has(folder.fileSystemId) && folder.isStarred),
      ...files.filter((file) => restoreSet.has(file.fileSystemId) && file.isStarred),
    ].map((node) => node.fileSystemId);

    await restoreDriveItems({ userId, ids: restoreIds });
    if (starredRestoreIds.length > 0) {
      await updateDriveItems({ id: starredRestoreIds, isStarred: true });
    }

    const idSet = restoreSet;
    setFolders((prev) => prev.filter((node) => !idSet.has(node.fileSystemId)));
    setFiles((prev) => prev.filter((node) => !idSet.has(node.fileSystemId)));
    setSelectedIds((prev) => prev.filter((id) => !idSet.has(id)));
    setToastMessage(
      restoreIds.length === 1
        ? '항목이 복원되었습니다'
        : `${restoreIds.length}개 항목이 복원되었습니다`,
    );
    setToastOpen(true);
  };

  const handleRestoreSelected = async () => {
    try {
      await restoreByIds(selectedIds);
    } catch (error) {
      console.error('Failed to restore selected trash items', error);
      setToastMessage('복원 중 오류가 발생했습니다');
      setToastOpen(true);
      await loadTrash();
    }
  };

  const executeDestroySelected = async () => {
    if (!selectedIds.length || !userId) {
      return;
    }

    try {
      const removeSet = collectDescendantTrashIds(selectedIds);
      await destroyDriveItems({ userId, ids: Array.from(removeSet) });
      setFolders((prev) => prev.filter((node) => !removeSet.has(node.fileSystemId)));
      setFiles((prev) => prev.filter((node) => !removeSet.has(node.fileSystemId)));
      setSelectedIds([]);
      setToastMessage(
        removeSet.size === 1
          ? '항목이 완전 삭제되었습니다'
          : `${removeSet.size}개 항목이 완전 삭제되었습니다`,
      );
      setToastOpen(true);
    } catch (error) {
      console.error('Failed to destroy selected trash items', error);
      setToastMessage('완전 삭제 중 오류가 발생했습니다');
      setToastOpen(true);
      await loadTrash();
    }
  };

  const listEntries = useMemo<TrashListEntry[]>(
    () => [
      ...visibleFolders.map((folder) => ({
        id: folder.fileSystemId,
        kind: 'folder' as const,
        title: folder.name,
        subtitle: undefined,
        creatorName: folder.creatorName,
        date: folder.updatedAt ? String(folder.updatedAt).slice(0, 10) : '-',
        size: '—',
        node: folder,
      })),
      ...visibleFiles.map((file) => ({
        id: file.fileSystemId,
        kind: 'file' as const,
        title: file.name,
        subtitle: file.mimetype ? `.${file.mimetype}` : 'file',
        creatorName: file.creatorName,
        date: file.updatedAt ? String(file.updatedAt).slice(0, 10) : '-',
        size: formatBytes(file.size),
      })),
    ],
    [visibleFiles, visibleFolders],
  );

  return (
    <div className='h-full bg-[#f9f9f9] text-gray-800 dark:bg-gray-900 dark:text-gray-100'>
      <div className='flex h-full overflow-hidden'>
        <main className='flex-1 overflow-hidden'>
          <div className='scrollbar-drive relative h-full overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 lg:px-8'>
            <div className='mb-8 sm:flex sm:items-center sm:justify-between'>
              <div className='mb-4 sm:mb-0'>
                <h1 className='text-2xl font-bold text-gray-800 md:text-3xl dark:text-gray-100'>
                  휴지통
                </h1>
                <p className='mt-2 text-sm font-medium text-gray-500 dark:text-gray-400'>
                  삭제된 폴더와 파일을 복원할 수 있습니다.
                </p>
                <div className='mt-3 flex flex-wrap items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400'>
                  <button
                    type='button'
                    onClick={() => setCurrentFolderId(null)}
                    className='cursor-pointer text-left hover:text-gray-700 dark:hover:text-gray-200'
                  >
                    휴지통
                  </button>
                  {breadcrumbFolders.map((folder) => (
                    <React.Fragment key={folder.fileSystemId}>
                      <ChevronRight className='h-4 w-4' />
                      <button
                        type='button'
                        onClick={() => setCurrentFolderId(folder.fileSystemId)}
                        className='cursor-pointer text-left hover:text-gray-700 dark:hover:text-gray-200'
                      >
                        {folder.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-3'>
                <div className='inline-flex rounded-lg shadow-xs'>
                  <GlobalTooltip content='리스트로 보기' position='bottom'>
                    <button
                      type='button'
                      onClick={() => setViewMode('list')}
                      className={`btn inline-flex h-[38px] w-[42px] cursor-pointer items-center justify-center rounded-r-none border-gray-200 p-0 dark:border-gray-700/60 ${
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

                {selectedIds.length > 0 ? (
                  <button
                    type='button'
                    onClick={handleRestoreSelected}
                    disabled={!userId}
                    className='btn border-gray-200 bg-white text-[var(--color-faddit)] hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700/60 dark:bg-gray-800'
                  >
                    <RotateCcw className='h-4 w-4 shrink-0' strokeWidth={2.5} />
                    <span className='ml-2'>복원하기</span>
                  </button>
                ) : null}

                {selectedIds.length > 0 ? (
                  <button
                    type='button'
                    onClick={() => setConfirmMode('destroy')}
                    disabled={!userId}
                    className='btn border-red-200 bg-white text-red-500 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/40 dark:bg-gray-800 dark:text-red-300'
                  >
                    <Trash2 className='h-4 w-4 shrink-0' strokeWidth={2.5} />
                    <span className='ml-2'>완전 삭제</span>
                  </button>
                ) : null}
              </div>
            </div>

            {loading ? (
              <div className='rounded-xl bg-white p-6 text-sm text-gray-500 shadow-xs dark:bg-gray-800 dark:text-gray-300'>
                휴지통 데이터를 불러오는 중입니다...
              </div>
            ) : viewMode === 'grid' ? (
              <div className='space-y-6'>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                  {visibleFolders.map((folder) => {
                    const isSelected = selectedSet.has(folder.fileSystemId);
                    return (
                      <div
                        key={folder.fileSystemId}
                        className={`group relative flex items-center justify-between rounded-xl px-4 py-3 dark:bg-gray-800/70 ${
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
                            onChange={(event) =>
                              toggleSelection(folder.fileSystemId, event.target.checked)
                            }
                          />
                        </label>

                        <button
                          type='button'
                          onClick={() => openFolder(folder.fileSystemId)}
                          className='flex min-w-0 flex-1 items-center gap-3 text-left'
                        >
                          <svg
                            className='h-5 w-5 shrink-0 fill-gray-600 dark:fill-gray-300'
                            viewBox='0 0 20 20'
                            aria-hidden='true'
                          >
                            <path d='M2.5 4.75A2.25 2.25 0 0 1 4.75 2.5h3.21a2 2 0 0 1 1.41.59l.75.75c.19.19.44.29.71.29h4.42a2.25 2.25 0 0 1 2.25 2.25v6.87a2.25 2.25 0 0 1-2.25 2.25H4.75A2.25 2.25 0 0 1 2.5 13.25V4.75Z' />
                          </svg>
                          <span className='truncate text-xl font-medium text-gray-800 dark:text-gray-100'>
                            {folder.name}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className='grid grid-cols-12 gap-5'>
                  {visibleFiles.map((file) => (
                    <DriveItemCard
                      key={file.fileSystemId}
                      id={file.fileSystemId}
                      imageSrc={file.previewUrl || ChildClothImage}
                      imageAlt={file.name}
                      title={file.name}
                      subtitle={file.mimetype ? `.${file.mimetype}` : 'file'}
                      badge={file.tag ? String(file.tag) : '파일'}
                      actionLabel='View'
                      actionHref='#0'
                      isSelected={selectedSet.has(file.fileSystemId)}
                      onSelectChange={(id, checked) => toggleSelection(id, checked)}
                      onCardClick={(id) => toggleSelection(id, !selectedSet.has(id))}
                      creatorName={file.creatorName || undefined}
                      hideHoverTools
                      className='col-span-full sm:col-span-6 xl:col-span-4 2xl:col-span-3'
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className='overflow-x-auto rounded-xl bg-white shadow-xs dark:bg-gray-800'>
                <table className='w-full table-auto text-sm dark:text-gray-300'>
                  <thead className='bg-gray-50 text-xs font-semibold text-gray-500 dark:bg-gray-900/20 dark:text-gray-400'>
                    <tr>
                      <th className='px-4 py-3 text-left'>이름</th>
                      <th className='px-4 py-3 text-left'>생성자</th>
                      <th className='px-4 py-3 text-left'>수정 날짜</th>
                      <th className='px-4 py-3 text-left'>파일 정보</th>
                      <th className='w-px px-4 py-3 text-right'>정렬</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listEntries.map((entry) => {
                      const isSelected = selectedSet.has(entry.id);
                      return (
                        <tr
                          key={entry.id}
                          className={`group border-t dark:border-gray-700/60 ${
                            isSelected
                              ? 'border-violet-200 bg-violet-50/40 dark:border-violet-500/40 dark:bg-violet-500/10'
                              : 'border-gray-100 hover:bg-gray-50/70 dark:hover:bg-gray-800/50'
                          }`}
                          onClick={() => toggleSelection(entry.id, !isSelected)}
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
                                  onChange={(event) =>
                                    toggleSelection(entry.id, event.target.checked)
                                  }
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
                                <svg
                                  className='h-5 w-5 shrink-0 fill-blue-500'
                                  viewBox='0 0 20 20'
                                  aria-hidden='true'
                                >
                                  <path d='M5 2.5A1.5 1.5 0 0 0 3.5 4v12A1.5 1.5 0 0 0 5 17.5h10a1.5 1.5 0 0 0 1.5-1.5V7.25a1.5 1.5 0 0 0-.44-1.06l-3.75-3.75A1.5 1.5 0 0 0 11.25 2H5v.5Zm6.5.56V6a.5.5 0 0 0 .5.5h2.94l-3.44-3.44Z' />
                                </svg>
                              )}
                              <div>
                                {entry.kind === 'folder' ? (
                                  <button
                                    type='button'
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (entry.node?.fileSystemId) {
                                        openFolder(entry.node.fileSystemId);
                                      }
                                    }}
                                    className='cursor-pointer font-medium text-gray-800 hover:text-violet-500 dark:text-gray-100 dark:hover:text-violet-300'
                                  >
                                    {entry.title}
                                  </button>
                                ) : (
                                  <div className='font-medium text-gray-800 dark:text-gray-100'>
                                    {entry.title}
                                  </div>
                                )}
                                {entry.kind === 'file' && entry.subtitle ? (
                                  <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                                    {entry.subtitle}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className='px-4 py-3 text-gray-600 dark:text-gray-300'>
                            {entry.creatorName || '-'}
                          </td>
                          <td className='px-4 py-3 text-gray-600 dark:text-gray-300'>
                            {entry.date}
                          </td>
                          <td className='px-4 py-3 text-gray-600 dark:text-gray-300'>
                            {entry.size}
                          </td>
                          <td className='w-px px-4 py-3 text-right'></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {confirmMode ? (
        <div className='fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/45 px-4'>
          <div className='w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700/60 dark:bg-gray-800'>
            <div className='text-base font-semibold text-gray-800 dark:text-gray-100'>
              완전 삭제
            </div>
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
              선택한 항목을 완전 삭제하시겠습니까?
            </p>
            <div className='mt-4 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setConfirmMode(null)}
                className='btn border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700/60 dark:bg-gray-800 dark:text-gray-200'
              >
                취소
              </button>
              <button
                type='button'
                onClick={() => {
                  setConfirmMode(null);
                  void executeDestroySelected();
                }}
                className='btn border-red-200 bg-red-50 text-red-600 hover:border-red-300 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300'
              >
                예
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Notification
        type='warning'
        open={toastOpen}
        setOpen={setToastOpen}
        showAction={false}
        className='fixed right-4 bottom-4 z-50'
      >
        <div className='mb-1 font-medium text-gray-800 dark:text-gray-100'>휴지통</div>
        <div>
          <span>{toastMessage}</span>
        </div>
      </Notification>
    </div>
  );
};

export default DeletedDrive;

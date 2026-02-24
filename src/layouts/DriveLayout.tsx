import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  Modifier,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import Drivebar from '../partials/Drivebar';
import Header from '../partials/Header';
import { DriveProvider, useDrive } from '../context/DriveContext';
import { useAuthStore } from '../store/useAuthStore';
import DriveSearchModal from '../pages/faddit/drive/components/DriveSearchModal';

const getPointerCoordinates = (event: Event | null) => {
  if (!event) {
    return null;
  }

  if (event instanceof MouseEvent) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  if (event instanceof TouchEvent) {
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) {
      return null;
    }

    return {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  return null;
};

const cursorTopLeftModifier: Modifier = ({ transform, activeNodeRect, activatorEvent }) => {
  const coordinates = getPointerCoordinates(activatorEvent);
  if (!coordinates || !activeNodeRect) {
    return transform;
  }

  return {
    ...transform,
    x: transform.x + (coordinates.x - activeNodeRect.left),
    y: transform.y + (coordinates.y - activeNodeRect.top),
  };
};

// Inner component to use the context
const DriveLayoutContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const {
    activeDragItem,
    setActiveDragItem,
    items,
    rootFolderId,
    currentFolderId,
    hydrateDrive,
    moveItems,
    setItemsStarred,
    getItemParentId,
    setSidebarAutoOpenFolderId,
  } = useDrive();
  const rootFolderFromAuth = useAuthStore((state) => state.user?.rootFolder);

  useEffect(() => {
    if (!rootFolderFromAuth) {
      return;
    }

    hydrateDrive(rootFolderFromAuth).catch((error) => {
      console.error('Failed to hydrate drive', error);
    });
  }, [rootFolderFromAuth, hydrateDrive]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeType = active.data.current?.type;
    const selectedEntries =
      (active.data.current?.selectedEntries as
        | Array<{ id: string; type: 'file' | 'folder'; name: string }>
        | undefined) || [];

    if (selectedEntries.length > 1) {
      setActiveDragItem({
        id: active.id.toString(),
        type: 'drive-item',
        title: `${selectedEntries.length}개 항목`,
        subtitle: '선택됨',
        count: selectedEntries.length,
      });
      return;
    }

    if (activeType === 'drive-item') {
      const item = items.find((i) => i.id === active.id);
      if (item) {
        setActiveDragItem({
          id: item.id,
          type: 'drive-item',
          imageSrc: item.imageSrc,
          imageAlt: item.imageAlt,
          title: item.title,
          subtitle: item.subtitle,
        });
        return;
      }
    }

    if (activeType === 'drive-folder') {
      setActiveDragItem({
        id: active.id.toString(),
        type: 'drive-folder',
        title: String(active.data.current?.title || 'Folder'),
        subtitle: String(active.data.current?.subtitle || '폴더'),
        shared: Boolean(active.data.current?.shared),
      });
      return;
    }

    if (activeType === 'sidebar-item') {
      const sidebarItemType = String(active.data.current?.itemType || 'file');
      if (sidebarItemType === 'folder') {
        setActiveDragItem({
          id: active.id.toString(),
          type: 'drive-folder',
          title: String(active.data.current?.title || 'Folder'),
          subtitle: String(active.data.current?.subtitle || '폴더'),
          shared: Boolean(active.data.current?.shared),
        });
      } else {
        setActiveDragItem({
          id: active.id.toString(),
          type: 'drive-item',
          title: String(active.data.current?.title || 'File'),
          subtitle: String(active.data.current?.subtitle || '파일'),
        });
      }
      return;
    }

    if (activeType !== 'drive-item' && activeType !== 'drive-folder') {
      setActiveDragItem(null);
      return;
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Logic to open folders on hover will be handled in Drivebar (or SidebarLinkGroup)
    // by monitoring drag position or using useDndMonitor, but simpler to just let
    // droppable zones handle their own 'over' state if possible.
    // However, for Auto-expanding, we might need to know which folder we are over.
    const { over } = event;
    // console.log('Dragging over:', over?.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeType = active.data.current?.type;

    if (!over || active.id === over.id) {
      setActiveDragItem(null);
      return;
    }

    if (!rootFolderId) {
      setActiveDragItem(null);
      return;
    }

    const targetId = over.id.toString();
    const overType = String(over.data.current?.type || '');
    const overDataFolderId =
      typeof over.data.current?.id === 'string' ? over.data.current.id : null;
    const sidebarFolderTargetId = targetId.startsWith('sidebar-folder-')
      ? targetId.replace('sidebar-folder-', '')
      : null;
    const isWorkspaceRootTarget = targetId === 'my-workspace' || targetId === 'section-workspace';
    const isFolderDropTarget = overType === 'folder' || Boolean(sidebarFolderTargetId);
    const normalizedTargetId =
      targetId === 'drive-root-container' || isWorkspaceRootTarget
        ? rootFolderId
        : isFolderDropTarget && (overDataFolderId || sidebarFolderTargetId)
          ? overDataFolderId
            ? overDataFolderId
            : sidebarFolderTargetId
          : targetId;

    const resolveSourceParentId = (itemId: string, fallbackParentId?: string | null) =>
      getItemParentId(itemId) || fallbackParentId || rootFolderId;

    try {
      if (activeType === 'sidebar-item') {
        const activeId = active.id.toString();
        const sourceParentIdFromDrag =
          typeof active.data.current?.parentId === 'string' ? active.data.current.parentId : null;
        const sourceParentId =
          sourceParentIdFromDrag ||
          getItemParentId(activeId) ||
          resolveSourceParentId(activeId, currentFolderId);

        if (targetId === 'section-favorite') {
          await setItemsStarred([activeId], true);
        } else if (
          isFolderDropTarget ||
          targetId === 'drive-root-container' ||
          isWorkspaceRootTarget
        ) {
          const shouldSkipSameParent = isWorkspaceRootTarget
            ? false
            : sourceParentId === normalizedTargetId;

          if (activeId !== normalizedTargetId && !shouldSkipSameParent) {
            await moveItems([activeId], normalizedTargetId, sourceParentId);
            if (isFolderDropTarget) {
              setSidebarAutoOpenFolderId(normalizedTargetId);
            }
          } else if (import.meta.env.DEV) {
            console.debug('Skipped sidebar move', {
              activeId,
              targetId,
              normalizedTargetId,
              sourceParentId,
              overType,
              sourceParentIdFromDrag,
            });
          }
        }

        setActiveDragItem(null);
        return;
      }

      if (activeType === 'drive-item' || activeType === 'drive-folder') {
        const selectedEntries =
          (active.data.current?.selectedEntries as
            | Array<{ id: string; type: 'file' | 'folder'; name: string }>
            | undefined) || [];

        const entries =
          selectedEntries.length > 0
            ? selectedEntries
            : [
                {
                  id: active.id.toString(),
                  type: activeType === 'drive-folder' ? ('folder' as const) : ('file' as const),
                  name: String(active.data.current?.title || ''),
                },
              ];

        if (targetId === 'section-favorite') {
          await setItemsStarred(
            entries.map((entry) => entry.id),
            true,
          );
        } else {
          if (
            !(isFolderDropTarget || targetId === 'drive-root-container' || isWorkspaceRootTarget)
          ) {
            setActiveDragItem(null);
            return;
          }

          const moveTargetFolderId = normalizedTargetId;

          const groupedBySource = new Map<string, string[]>();
          entries.forEach((entry) => {
            const sourceParentId = resolveSourceParentId(entry.id, currentFolderId);
            if (sourceParentId === moveTargetFolderId) {
              return;
            }

            const current = groupedBySource.get(sourceParentId) || [];
            current.push(entry.id);
            groupedBySource.set(sourceParentId, current);
          });

          for (const [sourceParentId, ids] of groupedBySource.entries()) {
            await moveItems(ids, moveTargetFolderId, sourceParentId);
          }

          if (isFolderDropTarget) {
            setSidebarAutoOpenFolderId(moveTargetFolderId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update drive folder state', error);
    }

    setActiveDragItem(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className='flex h-[100dvh] overflow-hidden'>
        <Drivebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onOpenSearch={() => setSearchModalOpen(true)}
        />

        <div className='relative flex flex-1 flex-col overflow-hidden'>
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onOpenSearch={() => setSearchModalOpen(true)}
            searchModalOpen={searchModalOpen}
          />

          <main className='grow'>
            <Outlet />
          </main>
        </div>
      </div>
      <DriveSearchModal modalOpen={searchModalOpen} setModalOpen={setSearchModalOpen} />
      <DragOverlay modifiers={[cursorTopLeftModifier]}>
        {activeDragItem ? (
          <div className='pointer-events-none w-[200px] rounded-xl border-2 border-violet-500 bg-white opacity-90 shadow-2xl dark:bg-gray-800'>
            <div className='flex items-center p-2'>
              {activeDragItem.type === 'drive-folder' ? (
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700'>
                  {activeDragItem.shared ? (
                    <svg
                      className='h-5 w-5 fill-gray-600 dark:fill-gray-200'
                      viewBox='0 0 20 20'
                      aria-hidden='true'
                    >
                      <path d='M3.5 6A2.5 2.5 0 0 1 6 3.5h3.33c.44 0 .86.18 1.17.48l.69.69c.31.31.73.48 1.17.48H14A2.5 2.5 0 0 1 16.5 7v1.17a3.25 3.25 0 0 0-1-.17h-1.3A3.2 3.2 0 0 0 11 10.9v2.1a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 13V6Zm10.7 2a2.3 2.3 0 0 1 2.3 2.3v.2a2.9 2.9 0 1 1-4.6 2.35V10.9A2.9 2.9 0 0 1 14.8 8Zm0 1.4a1.5 1.5 0 0 0-1.5 1.5v1.9a1.5 1.5 0 0 0 3 0v-1.9a1.5 1.5 0 0 0-1.5-1.5Z' />
                    </svg>
                  ) : (
                    <svg
                      className='h-5 w-5 fill-gray-600 dark:fill-gray-200'
                      viewBox='0 0 20 20'
                      aria-hidden='true'
                    >
                      <path d='M2.5 4.75A2.25 2.25 0 0 1 4.75 2.5h3.21a2 2 0 0 1 1.41.59l.75.75c.19.19.44.29.71.29h4.42a2.25 2.25 0 0 1 2.25 2.25v6.87a2.25 2.25 0 0 1-2.25 2.25H4.75A2.25 2.25 0 0 1 2.5 13.25V4.75Z' />
                    </svg>
                  )}
                </div>
              ) : (
                <>
                  {activeDragItem.count && activeDragItem.count > 1 ? (
                    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700'>
                      <svg
                        className='h-5 w-5 fill-gray-600 dark:fill-gray-200'
                        viewBox='0 0 20 20'
                        aria-hidden='true'
                      >
                        <path d='M4 2.5A1.5 1.5 0 0 0 2.5 4v10A1.5 1.5 0 0 0 4 15.5h8A1.5 1.5 0 0 0 13.5 14V4A1.5 1.5 0 0 0 12 2.5H4Zm4.5 2h5.5A1.5 1.5 0 0 1 15.5 6v10A1.5 1.5 0 0 1 14 17.5H6A1.5 1.5 0 0 1 4.5 16v-.5H12A2.5 2.5 0 0 0 14.5 13V4.5H8.5Z' />
                      </svg>
                    </div>
                  ) : activeDragItem.imageSrc ? (
                    <div className='h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-200'>
                      <img
                        src={activeDragItem.imageSrc}
                        alt={activeDragItem.imageAlt || activeDragItem.title}
                        className='h-full w-full object-cover'
                      />
                    </div>
                  ) : (
                    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700'>
                      <svg
                        className='h-5 w-5 fill-gray-600 dark:fill-gray-200'
                        viewBox='0 0 20 20'
                        aria-hidden='true'
                      >
                        <path d='M5 2.5A1.5 1.5 0 0 0 3.5 4v12A1.5 1.5 0 0 0 5 17.5h10a1.5 1.5 0 0 0 1.5-1.5V7.25a1.5 1.5 0 0 0-.44-1.06l-3.75-3.75A1.5 1.5 0 0 0 11.25 2H5v.5Zm6.5.56V6a.5.5 0 0 0 .5.5h2.94l-3.44-3.44Z' />
                      </svg>
                    </div>
                  )}
                </>
              )}
              <div className='ml-3 overflow-hidden'>
                <h3 className='truncate text-sm font-semibold text-gray-800 dark:text-gray-100'>
                  {activeDragItem.title}
                </h3>
                <p className='truncate text-xs text-gray-500'>{activeDragItem.subtitle}</p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

const DriveLayout: React.FC = () => {
  return (
    <DriveProvider>
      <DriveLayoutContent />
    </DriveProvider>
  );
};

export default DriveLayout;

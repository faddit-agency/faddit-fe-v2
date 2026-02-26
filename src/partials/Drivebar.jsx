import { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDrive } from '../context/DriveContext';
import { useAuthStore } from '../store/useAuthStore';

import LogoOnly from '../images/icons/faddit-logo-only.svg?react';

//icons svg from lucide
import {
  House,
  Search,
  MessagesSquare,
  FolderOpen,
  FolderClosed,
  FileText,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// Helper component for droppable sections
const DragDropSection = ({ id, title, children, className, droppable = true }) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !droppable,
    data: { type: 'section', id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? '-mx-2 rounded-lg bg-violet-100/50 px-2 transition-colors dark:bg-violet-900/20' : ''}`}
    >
      <span className='lg:sidebar-expanded:block my-5 font-extrabold text-gray-400 lg:hidden 2xl:block'>
        {title}
      </span>
      {children}
    </div>
  );
};

const toDisplayStorage = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const fixed = value >= 100 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(fixed)}${units[unitIndex]}`;
};

const SidebarTreeNode = ({
  item,
  depth,
  expandedFolders,
  setExpandedFolders,
  setSidebarExpanded,
  pointedFolderId,
  setPointedFolderId,
  loadFolderChildren,
  onNavigateFolder,
  onOpenFile,
}) => {
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: 'sidebar-item',
      itemType: item.type,
      itemId: item.id,
      title: item.name,
      subtitle: item.type === 'folder' ? '폴더' : '파일',
      shared: false,
      parentId: item.parentId ?? null,
    },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `sidebar-folder-${item.id}`,
    disabled: item.type !== 'folder',
    data: {
      type: 'folder',
      id: item.id,
    },
  });
  const setCombinedRef = (node) => {
    setNodeRef(node);
    setDropRef(node);
  };

  const isOpen = expandedFolders[item.id] ?? false;
  const isPointed = pointedFolderId === item.id;

  const toggleFolder = async () => {
    if (item.type !== 'folder') {
      return;
    }

    const nextOpen = !isOpen;
    setExpandedFolders((prev) => ({ ...prev, [item.id]: nextOpen }));
    if (nextOpen && !item.childrenLoaded) {
      await loadFolderChildren(item.id);
    }
    setSidebarExpanded(true);
  };

  useEffect(() => {
    if (item.type !== 'folder') {
      return;
    }

    if (!item.childrenLoaded) {
      setLoadAttempted(false);
    }
  }, [item.childrenLoaded, item.type]);

  useEffect(() => {
    if (!isOpen) {
      setLoadAttempted(false);
      return;
    }

    if (item.type !== 'folder' || item.childrenLoaded || loadingChildren || loadAttempted) {
      return;
    }

    let cancelled = false;
    setLoadAttempted(true);
    setLoadingChildren(true);

    loadFolderChildren(item.id)
      .catch((error) => {
        console.error('Failed to load sidebar node children', error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingChildren(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    item.childrenLoaded,
    item.id,
    item.type,
    loadFolderChildren,
    loadingChildren,
    loadAttempted,
  ]);

  const handleFolderRowClick = () => {
    if (item.type !== 'folder') {
      onOpenFile(item.id, item.parentId ?? null);
      return;
    }

    setPointedFolderId(item.id);
    onNavigateFolder(item.id);
  };

  const handleChevronClick = (event) => {
    event.stopPropagation();
    if (item.type !== 'folder') {
      return;
    }
    setPointedFolderId(item.id);
    void toggleFolder();
  };

  const nodeStyle = isDragging
    ? {
        opacity: 0.45,
      }
    : transform
      ? {
          transform: CSS.Translate.toString(transform),
        }
      : undefined;

  return (
    <li>
      <div
        ref={setCombinedRef}
        style={nodeStyle}
        {...listeners}
        {...attributes}
        className={`mb-0.5 rounded-md py-2 pr-3 transition duration-150 ${
          item.type === 'folder'
            ? 'cursor-pointer hover:bg-white/80 dark:hover:bg-gray-700/70'
            : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40'
        } ${isPointed && item.type === 'folder' ? 'bg-violet-50 dark:bg-violet-500/15' : ''} ${
          isOver && item.type === 'folder'
            ? 'bg-violet-100/70 outline outline-1 outline-violet-300 dark:bg-violet-500/20 dark:outline-violet-500/60'
            : ''
        }`}
        onClick={handleFolderRowClick}
      >
        <div
          className='flex items-center justify-between'
          style={{ paddingLeft: `${16 + depth * 16}px` }}
        >
          <div className='flex min-w-0 items-center'>
            {item.type === 'folder' ? (
              isOpen ? (
                <FolderOpen
                  width={16}
                  height={16}
                  strokeWidth={3}
                  className='text-faddit dark:text-faddit shrink-0'
                />
              ) : (
                <FolderClosed
                  width={16}
                  height={16}
                  strokeWidth={3}
                  className='shrink-0 text-gray-400 dark:text-gray-500'
                />
              )
            ) : (
              <FileText
                width={16}
                height={16}
                strokeWidth={2.5}
                className='shrink-0 text-gray-400'
              />
            )}

            {item.type === 'folder' ? (
              <span className='ml-4 truncate text-sm font-medium text-gray-800 dark:text-gray-100'>
                {item.name}
              </span>
            ) : (
              <button
                type='button'
                className='ml-4 truncate text-left text-sm font-medium text-gray-500/90 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenFile(item.id, item.parentId ?? null);
                }}
              >
                {item.name}
              </button>
            )}
          </div>

          {item.type === 'folder' && (
            <button
              type='button'
              className='lg:sidebar-expanded:flex ml-2 flex shrink-0 cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100/80 hover:text-gray-600 lg:hidden 2xl:flex dark:text-gray-500 dark:hover:bg-gray-700/60 dark:hover:text-gray-200'
              onClick={handleChevronClick}
              aria-label={isOpen ? '폴더 닫기' : '폴더 열기'}
            >
              {isOpen ? (
                <ChevronUp
                  width={16}
                  height={16}
                  strokeWidth={3}
                  className='text-faddit dark:text-faddit'
                />
              ) : (
                <ChevronDown
                  width={16}
                  height={16}
                  strokeWidth={3}
                  className='text-gray-400 dark:text-gray-500'
                />
              )}
            </button>
          )}
        </div>
      </div>

      {item.type === 'folder' && isOpen && item.children?.length ? (
        <ul>
          {item.children.map((child) => (
            <SidebarTreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              setExpandedFolders={setExpandedFolders}
              setSidebarExpanded={setSidebarExpanded}
              pointedFolderId={pointedFolderId}
              setPointedFolderId={setPointedFolderId}
              loadFolderChildren={loadFolderChildren}
              onNavigateFolder={onNavigateFolder}
              onOpenFile={onOpenFile}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
};

function Drivebar({ sidebarOpen, setSidebarOpen, variant = 'default', onOpenSearch }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname, search } = location;
  const sidebarQuery = new URLSearchParams(search);
  const hasSearchQuery =
    Boolean((sidebarQuery.get('q') || '').trim()) ||
    Boolean((sidebarQuery.get('categories') || '').trim()) ||
    sidebarQuery.get('mode') === 'search';
  const isSearchActive = pathname.startsWith('/faddit/drive') && hasSearchQuery;
  const isHomeActive = pathname === '/faddit/drive' && !isSearchActive;
  const isDeletedActive = pathname === '/faddit/deleted';
  const {
    workspaces,
    favorites,
    sidebarAutoOpenFolderId,
    setSidebarAutoOpenFolderId,
    loadFolderChildren,
    getItemParentId,
    currentFolderIdPath,
    rootFolderId,
  } = useDrive();

  const trigger = useRef(null);
  const sidebar = useRef(null);

  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [myWorkspaceOpen, setMyWorkspaceOpen] = useState(true);
  const [pointedFolderId, setPointedFolderId] = useState('my-workspace');
  const storageUsed = useAuthStore((state) => state.user?.storageUsed ?? 0);
  const storageLimit = useAuthStore((state) => state.user?.storageLimit ?? 0);
  const rootFolderFromAuth = useAuthStore((state) => state.user?.rootFolder ?? null);
  const { setNodeRef: setMyWorkspaceDropRef, isOver: isMyWorkspaceOver } = useDroppable({
    id: 'my-workspace',
    data: { type: 'folder', id: 'my-workspace' },
  });

  const usagePercent = useMemo(() => {
    if (!Number.isFinite(storageLimit) || storageLimit <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (storageUsed / storageLimit) * 100));
  }, [storageLimit, storageUsed]);

  const usedLabel = useMemo(() => toDisplayStorage(storageUsed), [storageUsed]);
  const limitLabel = useMemo(() => toDisplayStorage(storageLimit), [storageLimit]);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target) || trigger.current.contains(target))
        return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded);
    if (sidebarExpanded) {
      document.querySelector('body').classList.add('sidebar-expanded');
    } else {
      document.querySelector('body').classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

  useEffect(() => {
    if (!sidebarAutoOpenFolderId) {
      return;
    }

    const buildFolderChain = (folderId) => {
      const chain = [];
      const visited = new Set();
      let cursor = folderId;

      while (cursor && !visited.has(cursor)) {
        visited.add(cursor);
        chain.push(cursor);
        const parentId = getItemParentId(cursor);
        if (!parentId) {
          break;
        }
        cursor = parentId;
      }

      return chain.reverse();
    };

    const applySidebarAutoOpenState = async () => {
      const folderChain = buildFolderChain(sidebarAutoOpenFolderId);

      setMyWorkspaceOpen(true);
      setPointedFolderId(sidebarAutoOpenFolderId);
      setExpandedFolders((prev) => {
        const next = { ...prev };
        folderChain.forEach((folderId) => {
          next[folderId] = true;
        });
        return next;
      });
      setSidebarExpanded(true);
      for (const folderId of folderChain) {
        await loadFolderChildren(folderId);
      }
    };

    applySidebarAutoOpenState()
      .catch((error) => {
        console.error('Failed to load sidebar folder children', error);
      })
      .finally(() => {
        setSidebarAutoOpenFolderId(null);
      });
  }, [getItemParentId, sidebarAutoOpenFolderId, loadFolderChildren, setSidebarAutoOpenFolderId]);

  useEffect(() => {
    if (!pathname.startsWith('/faddit/drive')) {
      return;
    }

    const folderIdsInPath = currentFolderIdPath
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (folderIdsInPath.length === 0) {
      return;
    }

    const ancestorFolderIds = folderIdsInPath.slice(0, -1);

    setMyWorkspaceOpen(true);
    setPointedFolderId(folderIdsInPath[folderIdsInPath.length - 1]);
    setExpandedFolders((prev) => {
      let changed = false;
      const next = { ...prev };

      ancestorFolderIds.forEach((folderId) => {
        if (!next[folderId]) {
          next[folderId] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    let cancelled = false;
    const loadAncestors = async () => {
      for (const folderId of ancestorFolderIds) {
        if (cancelled) {
          return;
        }
        await loadFolderChildren(folderId);
      }
    };

    loadAncestors().catch((error) => {
      console.error('Failed to sync sidebar folder chain from route', error);
    });

    return () => {
      cancelled = true;
    };
  }, [currentFolderIdPath, loadFolderChildren, pathname]);

  const navigateToFolder = (folderId) => {
    navigate(`/faddit/drive/${folderId}`);
  };

  const findParentFolderIdInTree = (nodes, targetFileId, currentParentId = null) => {
    for (const node of nodes || []) {
      if (node.type === 'file' && node.id === targetFileId) {
        return currentParentId;
      }

      if (node.type === 'folder') {
        const nextParentId = node.id;
        const foundInChildren = findParentFolderIdInTree(
          node.children || [],
          targetFileId,
          nextParentId,
        );
        if (foundInChildren) {
          return foundInChildren;
        }
      }
    }

    return null;
  };

  const openFileDetail = (fileId, parentFolderId) => {
    const resolvedParentFolderId =
      parentFolderId ||
      getItemParentId(fileId) ||
      findParentFolderIdInTree(workspaces, fileId) ||
      findParentFolderIdInTree(favorites, fileId);
    const pathname = resolvedParentFolderId
      ? `/faddit/drive/${resolvedParentFolderId}`
      : '/faddit/drive';
    navigate({
      pathname,
      search: `?file=${fileId}`,
    });
  };

  return (
    <div className='min-w-fit'>
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/30 transition-opacity duration-200 lg:z-auto lg:hidden ${
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden='true'
      ></div>

      {/* Sidebar */}
      <div
        id='sidebar'
        ref={sidebar}
        className={`lg:sidebar-expanded:!w-64 absolute top-0 left-0 z-40 flex h-[100dvh] w-64 shrink-0 flex-col overflow-hidden bg-gray-100 p-4 transition-all duration-200 ease-in-out lg:static lg:top-auto lg:left-auto lg:flex! lg:w-20 lg:translate-x-0 2xl:w-64! dark:bg-gray-800 ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'} ${variant === 'v2' ? 'border-r border-gray-200 dark:border-gray-700/60' : 'rounded-r-2xl shadow-xs'}`}
      >
        {/* Sidebar header */}
        <div className='mb-10 flex justify-between pr-3 sm:px-2'>
          {/* Close button */}
          <button
            ref={trigger}
            className='text-gray-500 hover:text-gray-400 lg:hidden'
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls='sidebar'
            aria-expanded={sidebarOpen}
          >
            <span className='sr-only'>Close sidebar</span>
            <svg
              className='h-6 w-6 fill-current'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path d='M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z' />
            </svg>
          </button>
          {/* Logo */}
          <NavLink end to='/' className='block'>
            <LogoOnly className='h-[23px] w-[18px] fill-[#2f2f2f] dark:fill-[#fff]' />
          </NavLink>
        </div>

        <div className='mb-4'>
          <h3 className='pl-3 text-xs font-semibold text-gray-400 uppercase dark:text-gray-500'>
            <span
              className='lg:sidebar-expanded:hidden hidden w-6 text-center lg:block 2xl:hidden'
              aria-hidden='true'
            >
              •••
            </span>
          </h3>
          <ul className='mt-3'>
            <li
              className={`mb-3 rounded-lg bg-linear-to-r py-2 pr-3 pl-4 last:mb-0 ${
                isHomeActive
                  ? 'from-violet-500/[0.12] to-violet-500/[0.04] dark:from-violet-500/[0.24]'
                  : ''
              }`}
            >
              <NavLink
                end
                to='/faddit/drive'
                className={`block truncate text-gray-800 transition duration-150 dark:text-gray-100 ${
                  isHomeActive ? '' : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className='flex items-center'>
                  <House
                    className={`shrink-0 ${
                      isHomeActive ? 'text-violet-500' : 'text-gray-400 dark:text-gray-400'
                    }`}
                    width='18'
                    height='18'
                    strokeWidth={3}
                  />
                  <span className='lg:sidebar-expanded:opacity-100 ml-3 text-sm font-bold duration-200 lg:opacity-0 2xl:opacity-100'>
                    홈
                  </span>
                </div>
              </NavLink>
            </li>
            <li
              className={`mb-3 rounded-lg bg-linear-to-r py-2 pr-3 pl-4 last:mb-0 ${
                isSearchActive
                  ? 'from-violet-500/[0.12] to-violet-500/[0.04] dark:from-violet-500/[0.24]'
                  : ''
              }`}
            >
              <button
                type='button'
                onClick={onOpenSearch}
                className='block w-full cursor-pointer truncate text-left text-gray-800 transition duration-150 hover:text-gray-900 dark:text-gray-100 dark:hover:text-white'
              >
                <div className='flex items-center'>
                  <Search
                    className={`shrink-0 ${
                      isSearchActive ? 'text-violet-500' : 'text-gray-400 dark:text-gray-400'
                    }`}
                    width='18'
                    height='18'
                    strokeWidth={3}
                  />
                  <span className='lg:sidebar-expanded:opacity-100 ml-3 text-sm font-bold duration-200 lg:opacity-0 2xl:opacity-100'>
                    검색
                  </span>
                </div>
              </button>
            </li>
            <li
              className={`mb-3 rounded-lg bg-linear-to-r py-2 pr-3 pl-4 last:mb-0 ${pathname.includes('messages') && 'from-violet-500/[0.12] to-violet-500/[0.04] dark:from-violet-500/[0.24]'}`}
            >
              <NavLink
                end
                to='/messages'
                className={`block truncate text-gray-800 transition duration-150 dark:text-gray-100 ${
                  pathname.includes('messages') ? '' : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex grow items-center'>
                    <MessagesSquare
                      className={`shrink-0 ${
                        pathname === '/faddit/message'
                          ? 'text-violet-500'
                          : 'text-gray-400 dark:text-gray-400'
                      }`}
                      width='18'
                      height='18'
                      strokeWidth={3}
                    />
                    <span className='lg:sidebar-expanded:opacity-100 ml-3 text-sm font-bold duration-200 lg:opacity-0 2xl:opacity-100'>
                      수신함
                    </span>
                  </div>
                  <div className='ml-2 flex shrink-0'>
                    <span className='bg-faddit inline-flex h-5 items-center justify-center rounded-sm px-2 text-xs font-medium text-white'>
                      4
                    </span>
                  </div>
                </div>
              </NavLink>
            </li>
            <li
              className={`rounded-lg bg-linear-to-r py-2 pr-3 pl-4 last:mb-0 ${
                isDeletedActive
                  ? 'from-violet-500/[0.12] to-violet-500/[0.04] dark:from-violet-500/[0.24]'
                  : ''
              }`}
            >
              <NavLink
                to='/faddit/deleted'
                className={`block truncate text-gray-800 transition duration-150 dark:text-gray-100 ${
                  isDeletedActive ? '' : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className='flex items-center'>
                  <Trash2
                    className={`shrink-0 ${
                      isDeletedActive ? 'text-violet-500' : 'text-gray-400 dark:text-gray-400'
                    }`}
                    width='18'
                    height='18'
                    strokeWidth={3}
                  />
                  <span className='lg:sidebar-expanded:opacity-100 ml-3 text-sm font-bold duration-200 lg:opacity-0 2xl:opacity-100'>
                    휴지통
                  </span>
                </div>
              </NavLink>
            </li>
          </ul>
        </div>

        <div className='no-scrollbar min-h-0 flex-1 overflow-y-auto'>
          <DragDropSection id='section-workspace' title='워크스페이스' droppable={false}>
            <ul>
              <li>
                <div
                  ref={setMyWorkspaceDropRef}
                  className={`mb-0.5 cursor-pointer rounded-md py-2 pr-3 transition duration-150 hover:bg-white/80 dark:hover:bg-gray-700/70 ${
                    pointedFolderId === 'my-workspace'
                      ? 'bg-violet-50 dark:bg-violet-500/15'
                      : isMyWorkspaceOver
                        ? 'bg-violet-100/70 outline outline-1 outline-violet-300 dark:bg-violet-500/20 dark:outline-violet-500/60'
                        : ''
                  }`}
                  onClick={() => {
                    setPointedFolderId('my-workspace');
                    const workspaceRoot = rootFolderId || rootFolderFromAuth;
                    navigate(workspaceRoot ? `/faddit/drive/${workspaceRoot}` : '/faddit/drive');
                  }}
                >
                  <div className='flex items-center justify-between pl-4'>
                    <div className='flex min-w-0 items-center'>
                      {myWorkspaceOpen ? (
                        <FolderOpen
                          width={16}
                          height={16}
                          strokeWidth={3}
                          className='text-faddit dark:text-faddit shrink-0'
                        />
                      ) : (
                        <FolderClosed
                          width={16}
                          height={16}
                          strokeWidth={3}
                          className='shrink-0 text-gray-400 dark:text-gray-500'
                        />
                      )}
                      <span className='ml-4 truncate text-sm font-medium text-gray-800 dark:text-gray-100'>
                        내 워크스페이스
                      </span>
                    </div>
                    <button
                      type='button'
                      className='lg:sidebar-expanded:flex ml-2 flex shrink-0 cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100/80 hover:text-gray-600 lg:hidden 2xl:flex dark:text-gray-500 dark:hover:bg-gray-700/60 dark:hover:text-gray-200'
                      onClick={(event) => {
                        event.stopPropagation();
                        setPointedFolderId('my-workspace');
                        setMyWorkspaceOpen((prev) => !prev);
                        setSidebarExpanded(true);
                      }}
                      aria-label={myWorkspaceOpen ? '내 워크스페이스 닫기' : '내 워크스페이스 열기'}
                    >
                      {myWorkspaceOpen ? (
                        <ChevronUp
                          width={16}
                          height={16}
                          strokeWidth={3}
                          className='text-gray-500 dark:text-gray-300'
                        />
                      ) : (
                        <ChevronDown
                          width={16}
                          height={16}
                          strokeWidth={3}
                          className='text-gray-500 dark:text-gray-300'
                        />
                      )}
                    </button>
                  </div>
                </div>
              </li>
              {myWorkspaceOpen &&
                workspaces.map((item) => (
                  <SidebarTreeNode
                    key={item.id}
                    item={item}
                    depth={1}
                    expandedFolders={expandedFolders}
                    setExpandedFolders={setExpandedFolders}
                    setSidebarExpanded={setSidebarExpanded}
                    pointedFolderId={pointedFolderId}
                    setPointedFolderId={setPointedFolderId}
                    loadFolderChildren={loadFolderChildren}
                    onNavigateFolder={navigateToFolder}
                    onOpenFile={openFileDetail}
                  />
                ))}
            </ul>
          </DragDropSection>

          <DragDropSection id='section-favorite' title='즐겨찾기'>
            <ul>
              {favorites.map((item) => (
                <SidebarTreeNode
                  key={item.id}
                  item={item}
                  depth={0}
                  expandedFolders={expandedFolders}
                  setExpandedFolders={setExpandedFolders}
                  setSidebarExpanded={setSidebarExpanded}
                  pointedFolderId={pointedFolderId}
                  setPointedFolderId={setPointedFolderId}
                  loadFolderChildren={loadFolderChildren}
                  onNavigateFolder={navigateToFolder}
                  onOpenFile={openFileDetail}
                />
              ))}
            </ul>
          </DragDropSection>
        </div>

        <div className='mt-4 border-t border-gray-200 pt-4 dark:border-gray-700/60'>
          <div className='lg:sidebar-expanded:block rounded-xl p-3 shadow-xs lg:hidden 2xl:block dark:bg-gray-900/40'>
            <div className='text-sm font-semibold text-gray-700 dark:text-gray-200'>저장용량</div>
            <div className='mt-3 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700'>
              <div
                className='h-full rounded-full bg-gray-700 dark:bg-gray-300'
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className='mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200'>
              {limitLabel} 중 {usedLabel} 사용
            </div>
            <div className='mt-3 rounded-lg bg-white px-3 py-3 text-sm text-gray-700 dark:bg-gray-800/80 dark:text-gray-300'>
              <div className='text-faddit font-semibold'>✨ 저장공간 10GB 사용하기</div>
              <p className='mt-1'>
                Pro 요금제로 업그레이드하면 10GB의 저장 공간을 사용할 수 있습니다.
              </p>
              <p className='mt-2 font-semibold text-gray-400'>Pro 요금제 업그레이드 (출시 예정)</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Drivebar;

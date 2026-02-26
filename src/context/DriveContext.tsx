import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import {
  createDriveFolder,
  deleteDriveItems,
  getDriveAll,
  getDriveFilePreviewUrl,
  getDriveStarredAll,
  restoreDriveItems,
  updateDriveItems,
  DriveNode,
} from '../lib/api/driveApi';
import ChildClothImage from '../images/faddit/childcloth.png';
import { useAuthStore } from '../store/useAuthStore';
import { getMaterialsByFileSystem } from '../lib/api/materialApi';
import { useDriveMaterialStore } from '../store/useDriveMaterialStore';
import { useDriveViewStore } from '../store/useDriveViewStore';

export interface DriveItem {
  id: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  badge: string;
  isStarred?: boolean;
  owner?: string;
  date?: string;
  size?: string;
  parentId?: string | null;
  sourcePath?: string;
  stateStoreKey?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  shared: boolean;
  updatedAt: string;
  updatedBy: string;
  parentId: string | null;
  isStarred: boolean;
}

export interface SidebarItem {
  id: string;
  type: 'folder' | 'file';
  name: string;
  parentId?: string | null;
  children?: SidebarItem[];
  childrenLoaded?: boolean;
  isOpen?: boolean;
}

export interface ActiveDriveDragItem {
  id: string;
  type: 'drive-item' | 'drive-folder';
  title: string;
  subtitle?: string;
  imageSrc?: string;
  imageAlt?: string;
  shared?: boolean;
  count?: number;
}

interface DriveContextType {
  items: DriveItem[];
  setItems: React.Dispatch<React.SetStateAction<DriveItem[]>>;
  driveFolders: DriveFolder[];
  setDriveFolders: React.Dispatch<React.SetStateAction<DriveFolder[]>>;
  activeDragItem: ActiveDriveDragItem | null;
  setActiveDragItem: (item: ActiveDriveDragItem | null) => void;
  workspaces: SidebarItem[];
  favorites: SidebarItem[];
  sidebarAutoOpenFolderId: string | null;
  rootFolderId: string | null;
  currentFolderId: string | null;
  currentFolderPath: string;
  currentFolderIdPath: string;
  hydrateDrive: (rootFolderId: string) => Promise<void>;
  refreshDrive: () => Promise<void>;
  loadFolderView: (folderId: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  restoreItems: (ids: string[]) => Promise<void>;
  moveItems: (ids: string[], targetFolderId: string, currentFolderId: string) => Promise<void>;
  setItemsStarred: (ids: string[], isStarred: boolean) => Promise<void>;
  getItemParentId: (itemId: string) => string | null;
  loadFolderChildren: (folderId: string) => Promise<void>;
  setSidebarAutoOpenFolderId: (folderId: string | null) => void;
}

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
};

const toDriveFolder = (folder: DriveNode): DriveFolder => ({
  id: folder.fileSystemId,
  name: folder.name,
  shared: false,
  updatedAt: folder.updatedAt || '',
  updatedBy: '',
  parentId: folder.parentId,
  isStarred: folder.isStarred,
});

const toSidebarFolder = (folder: DriveNode): SidebarItem => ({
  id: folder.fileSystemId,
  type: 'folder',
  name: folder.name,
  parentId: folder.parentId,
  children: [],
  childrenLoaded: false,
});

const toSidebarFile = (file: DriveNode): SidebarItem => ({
  id: file.fileSystemId,
  type: 'file',
  name: file.name,
  parentId: file.parentId,
});

const dedupeSidebarNodesById = (nodes: SidebarItem[]): SidebarItem[] => {
  const byId = new Map<string, SidebarItem>();

  nodes.forEach((node) => {
    const normalizedNode =
      node.type === 'folder' && node.children?.length
        ? {
            ...node,
            children: dedupeSidebarNodesById(node.children),
          }
        : node;

    const existing = byId.get(normalizedNode.id);
    if (!existing) {
      byId.set(normalizedNode.id, normalizedNode);
      return;
    }

    if (existing.type === 'folder' && normalizedNode.type === 'folder') {
      byId.set(normalizedNode.id, {
        ...existing,
        ...normalizedNode,
        children: dedupeSidebarNodesById([
          ...(existing.children || []),
          ...(normalizedNode.children || []),
        ]),
        childrenLoaded: Boolean(existing.childrenLoaded) || Boolean(normalizedNode.childrenLoaded),
      });
    }
  });

  return Array.from(byId.values());
};

const mergeSidebarNodesPreservingLoadedDescendants = (
  previousNodes: SidebarItem[] = [],
  nextNodes: SidebarItem[],
): SidebarItem[] => {
  const normalizedNextNodes = dedupeSidebarNodesById(nextNodes);
  const previousById = new Map(previousNodes.map((item) => [item.id, item]));

  return normalizedNextNodes.map((nextNode) => {
    if (nextNode.type !== 'folder') {
      return nextNode;
    }

    const previous = previousById.get(nextNode.id);
    if (!previous || previous.type !== 'folder') {
      return nextNode;
    }

    const mergedChildren = mergeSidebarNodesPreservingLoadedDescendants(
      previous.children || [],
      nextNode.children || [],
    );

    return {
      ...nextNode,
      children: mergedChildren.length > 0 ? mergedChildren : previous.children || [],
      childrenLoaded:
        Boolean(nextNode.childrenLoaded) ||
        Boolean(previous.childrenLoaded) ||
        mergedChildren.length > 0,
    };
  });
};

const extractNodesFromSidebarTree = (
  tree: SidebarItem[],
  removeIds: Set<string>,
): { tree: SidebarItem[]; extracted: SidebarItem[] } => {
  const extracted: SidebarItem[] = [];

  const walk = (nodes: SidebarItem[]): SidebarItem[] => {
    const next: SidebarItem[] = [];

    nodes.forEach((node) => {
      if (removeIds.has(node.id)) {
        extracted.push(node);
        return;
      }

      if (node.children?.length) {
        next.push({
          ...node,
          children: walk(node.children),
        });
        return;
      }

      next.push(node);
    });

    return next;
  };

  return {
    tree: walk(tree),
    extracted,
  };
};

const insertNodesIntoSidebarFolder = (
  tree: SidebarItem[],
  folderId: string,
  nodesToInsert: SidebarItem[],
): SidebarItem[] => {
  if (nodesToInsert.length === 0) {
    return tree;
  }

  const withUpdatedParent = nodesToInsert.map((node) => ({
    ...node,
    parentId: folderId,
  }));

  return tree.map((node) => {
    if (node.type === 'folder' && node.id === folderId) {
      return {
        ...node,
        children: dedupeSidebarNodesById([...(node.children || []), ...withUpdatedParent]),
        childrenLoaded: true,
      };
    }

    if (node.children?.length) {
      return {
        ...node,
        children: insertNodesIntoSidebarFolder(node.children, folderId, withUpdatedParent),
      };
    }

    return node;
  });
};

const moveNodesWithRootSupport = (
  tree: SidebarItem[],
  movingIds: Set<string>,
  targetFolderId: string,
  rootFolderId: string | null,
): SidebarItem[] => {
  const { tree: withoutMoved, extracted } = extractNodesFromSidebarTree(tree, movingIds);
  if (!rootFolderId || targetFolderId !== rootFolderId) {
    return insertNodesIntoSidebarFolder(withoutMoved, targetFolderId, extracted);
  }

  const rootInserted = extracted.map((node) => ({
    ...node,
    parentId: rootFolderId,
  }));

  return dedupeSidebarNodesById([...withoutMoved, ...rootInserted]);
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

const toDriveItem = (node: DriveNode, imageSrc: string): DriveItem => ({
  id: node.fileSystemId,
  imageSrc,
  imageAlt: node.name,
  title: node.name,
  subtitle: node.mimetype ? `.${node.mimetype}` : 'file',
  badge: node.tag ? String(node.tag) : '파일',
  isStarred: node.isStarred,
  owner: node.creatorName || undefined,
  date: node.updatedAt ? String(node.updatedAt).slice(0, 10) : '-',
  size: formatBytes(node.size),
  parentId: node.parentId,
  sourcePath: node.path,
  stateStoreKey: 'DriveContext.items',
});

const isImageFile = (extension?: string) => {
  if (!extension) {
    return false;
  }

  const value = extension.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(value);
};

export const DriveProvider = ({ children }: { children: ReactNode }) => {
  const userId = useAuthStore((state) => state.user?.userId);
  const setMaterialsForFile = useDriveMaterialStore((state) => state.setMaterialsForFile);
  const clearMaterialsForFiles = useDriveMaterialStore((state) => state.clearMaterialsForFiles);
  const setDriveView = useDriveViewStore((state) => state.setDriveView);

  const [items, setItems] = useState<DriveItem[]>([]);
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<ActiveDriveDragItem | null>(null);
  const [workspaces, setWorkspaces] = useState<SidebarItem[]>([]);
  const [favorites, setFavorites] = useState<SidebarItem[]>([]);
  const [sidebarAutoOpenFolderId, setSidebarAutoOpenFolderId] = useState<string | null>(null);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderPath, setCurrentFolderPath] = useState('');
  const [currentFolderIdPath, setCurrentFolderIdPath] = useState('');
  const [itemParentMap, setItemParentMap] = useState<Record<string, string | null>>({});

  const pruneSidebarTree = useCallback(
    (
      tree: SidebarItem[],
      removeSet: Set<string>,
    ): { tree: SidebarItem[]; removedIds: Set<string> } => {
      const removedIds = new Set<string>();

      const walk = (nodes: SidebarItem[]): SidebarItem[] => {
        const next: SidebarItem[] = [];

        nodes.forEach((node) => {
          if (removeSet.has(node.id)) {
            removedIds.add(node.id);
            return;
          }

          const children = node.children ? walk(node.children) : undefined;
          next.push(children ? { ...node, children } : node);
        });

        return next;
      };

      return { tree: walk(tree), removedIds };
    },
    [],
  );

  const replaceChildrenInTree = useCallback(
    (tree: SidebarItem[], folderId: string, children: SidebarItem[]): SidebarItem[] => {
      return tree.map((node) => {
        if (node.id === folderId && node.type === 'folder') {
          return {
            ...node,
            children: mergeSidebarNodesPreservingLoadedDescendants(node.children || [], children),
            childrenLoaded: true,
          };
        }

        if (node.children?.length) {
          return {
            ...node,
            children: replaceChildrenInTree(node.children, folderId, children),
          };
        }

        return node;
      });
    },
    [],
  );

  const hydrateDrive = useCallback(async (nextRootFolderId: string) => {
    if (!nextRootFolderId) {
      return;
    }

    const [rootData, starredData] = await Promise.all([
      getDriveAll(nextRootFolderId),
      getDriveStarredAll(),
    ]);

    const rootFolders = rootData.folders.filter((node) => node.type === 'folder');
    const starredFolders = starredData.folders.filter((node) => node.type === 'folder');

    const nextParentMap: Record<string, string | null> = {};
    rootFolders.forEach((folder) => {
      nextParentMap[folder.fileSystemId] = folder.parentId;
    });
    starredFolders.forEach((folder) => {
      if (!(folder.fileSystemId in nextParentMap)) {
        nextParentMap[folder.fileSystemId] = folder.parentId;
      }
    });

    setRootFolderId(nextRootFolderId);
    rootData.files.forEach((file) => {
      nextParentMap[file.fileSystemId] = file.parentId;
    });
    starredData.files.forEach((file) => {
      if (!(file.fileSystemId in nextParentMap)) {
        nextParentMap[file.fileSystemId] = file.parentId;
      }
    });

    setItemParentMap((prev) => ({ ...prev, ...nextParentMap }));

    const nextWorkspaceNodes = [
      ...rootFolders.map(toSidebarFolder),
      ...rootData.files.map(toSidebarFile),
    ];
    const nextFavoriteNodes = [
      ...starredFolders.map(toSidebarFolder),
      ...starredData.files.map(toSidebarFile),
    ];

    setWorkspaces((prev) => mergeSidebarNodesPreservingLoadedDescendants(prev, nextWorkspaceNodes));
    setFavorites((prev) => mergeSidebarNodesPreservingLoadedDescendants(prev, nextFavoriteNodes));
  }, []);

  const loadFolderView = useCallback(
    async (folderId: string) => {
      if (!folderId) {
        return;
      }

      const folderData = await getDriveAll(folderId);
      const folders = folderData.folders.filter((node) => node.type === 'folder');
      const fileItems = await Promise.all(
        folderData.files.map(async (fileNode) => {
          console.log('[Drive] fetched file node -> storing to DriveContext.items', {
            fileSystemId: fileNode.fileSystemId,
            name: fileNode.name,
            parentId: fileNode.parentId,
            path: fileNode.path,
            mimetype: fileNode.mimetype,
            tag: fileNode.tag,
            targetStore: 'DriveContext.items',
          });

          if (!isImageFile(fileNode.mimetype)) {
            return toDriveItem(fileNode, ChildClothImage);
          }

          try {
            const previewUrl = await getDriveFilePreviewUrl(fileNode.fileSystemId);
            return toDriveItem(fileNode, previewUrl || ChildClothImage);
          } catch {
            return toDriveItem(fileNode, ChildClothImage);
          }
        }),
      );

      setCurrentFolderId(folderId);
      setCurrentFolderPath(folderData.path || '');
      setCurrentFolderIdPath(folderData.idPath || '');
      setDriveFolders(folders.map(toDriveFolder));
      setItems(fileItems);
      setDriveView({
        currentFolderId: folderId,
        currentFolderPath: folderData.path || '',
        currentFolderIdPath: folderData.idPath || '',
        folders: folders.map((folderNode) => ({
          id: folderNode.fileSystemId,
          name: folderNode.name,
          parentId: folderNode.parentId,
        })),
        files: fileItems.map((item) => ({
          id: item.id,
          title: item.title,
          parentId: item.parentId,
        })),
      });
      console.log('[Drive] setItems completed', {
        targetStore: 'DriveContext.items',
        count: fileItems.length,
        folderId,
      });

      const fileSystemIds = folderData.files.map((file) => file.fileSystemId);
      if (!userId) {
        clearMaterialsForFiles(fileSystemIds);
      } else {
        await Promise.all(
          folderData.files.map(async (fileNode) => {
            try {
              const materials = await getMaterialsByFileSystem(fileNode.fileSystemId, userId);
              setMaterialsForFile(fileNode.fileSystemId, materials);
              console.log('[Drive] fetched material attributes from backend', {
                fileSystemId: fileNode.fileSystemId,
                materialCount: materials.length,
                targetStore: 'useDriveMaterialStore.materialsByFileSystemId',
              });
            } catch (error) {
              setMaterialsForFile(fileNode.fileSystemId, []);
              console.log('[Drive] material fetch failed for file', {
                fileSystemId: fileNode.fileSystemId,
                targetStore: 'useDriveMaterialStore.materialsByFileSystemId',
                error,
              });
            }
          }),
        );
      }

      setItemParentMap((prev) => {
        const next = { ...prev };
        folders.forEach((folder) => {
          next[folder.fileSystemId] = folder.parentId;
        });
        folderData.files.forEach((file) => {
          next[file.fileSystemId] = file.parentId;
        });
        return next;
      });
    },
    [clearMaterialsForFiles, setDriveView, setMaterialsForFile, userId],
  );

  const refreshDrive = useCallback(async () => {
    if (!rootFolderId) {
      return;
    }

    await hydrateDrive(rootFolderId);
    if (currentFolderId) {
      await loadFolderView(currentFolderId);
    }
  }, [currentFolderId, hydrateDrive, loadFolderView, rootFolderId]);

  const loadFolderChildren = useCallback(
    async (folderId: string) => {
      const childData = await getDriveAll(folderId);
      const children = [
        ...childData.folders.filter((node) => node.type === 'folder').map(toSidebarFolder),
        ...childData.files.map(toSidebarFile),
      ];

      setWorkspaces((prev) => replaceChildrenInTree(prev, folderId, children));
      setFavorites((prev) => replaceChildrenInTree(prev, folderId, children));
      setItemParentMap((prev) => {
        const next = { ...prev };
        childData.folders.forEach((folder) => {
          next[folder.fileSystemId] = folder.parentId;
        });
        childData.files.forEach((file) => {
          next[file.fileSystemId] = file.parentId;
        });
        return next;
      });
    },
    [replaceChildrenInTree],
  );

  const moveItems = useCallback(
    async (ids: string[], targetFolderId: string, sourceFolderId: string) => {
      if (!ids.length) {
        return;
      }

      const movingIds = new Set(ids);

      setWorkspaces((prev) =>
        moveNodesWithRootSupport(prev, movingIds, targetFolderId, rootFolderId),
      );
      setFavorites((prev) =>
        moveNodesWithRootSupport(prev, movingIds, targetFolderId, rootFolderId),
      );

      await updateDriveItems({
        id: ids,
        parentId: targetFolderId,
        currentId: sourceFolderId,
      });

      setItemParentMap((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = targetFolderId;
        });
        return next;
      });

      await refreshDrive();

      const sidebarFoldersToRefresh = new Set<string>();
      if (rootFolderId && sourceFolderId !== rootFolderId) {
        sidebarFoldersToRefresh.add(sourceFolderId);
      }
      if (rootFolderId && targetFolderId !== rootFolderId) {
        sidebarFoldersToRefresh.add(targetFolderId);
      }

      for (const folderId of sidebarFoldersToRefresh) {
        try {
          await loadFolderChildren(folderId);
        } catch (error) {
          console.error('Failed to refresh sidebar folder children after move', {
            folderId,
            error,
          });
        }
      }
    },
    [loadFolderChildren, refreshDrive, rootFolderId],
  );

  const createFolder = useCallback(
    async (name: string) => {
      if (!rootFolderId) {
        throw new Error('rootFolderId is missing');
      }

      const parentFolderId = currentFolderId ?? rootFolderId;

      const nextName = name.trim();
      if (!nextName) {
        return;
      }

      await createDriveFolder({
        parentId: parentFolderId,
        name: nextName,
      });
      await refreshDrive();
    },
    [currentFolderId, refreshDrive, rootFolderId],
  );

  const deleteItems = useCallback(
    async (ids: string[]) => {
      if (!ids.length || !userId) {
        return;
      }

      const removeSet = new Set(ids);
      const prevState = {
        items,
        driveFolders,
        workspaces,
        favorites,
        itemParentMap,
      };

      const allRemovedIds = new Set<string>(Array.from(removeSet));

      let changed = true;
      while (changed) {
        changed = false;
        Object.entries(itemParentMap).forEach(([id, parentId]) => {
          if (allRemovedIds.has(id)) {
            return;
          }
          if (parentId && allRemovedIds.has(parentId)) {
            allRemovedIds.add(id);
            changed = true;
          }
        });
      }

      const workspacePruned = pruneSidebarTree(workspaces, allRemovedIds);
      const favoritePruned = pruneSidebarTree(favorites, allRemovedIds);

      const nextItems = items.filter((item) => !allRemovedIds.has(item.id));
      const nextFolders = driveFolders.filter((folder) => !allRemovedIds.has(folder.id));
      const nextParentMap: Record<string, string | null> = {};
      Object.entries(itemParentMap).forEach(([id, parentId]) => {
        if (!allRemovedIds.has(id)) {
          nextParentMap[id] = parentId;
        }
      });

      setItems(nextItems);
      setDriveFolders(nextFolders);
      setWorkspaces(workspacePruned.tree);
      setFavorites(favoritePruned.tree);
      setItemParentMap(nextParentMap);
      setDriveView({
        currentFolderId,
        currentFolderPath,
        currentFolderIdPath,
        folders: nextFolders.map((folderNode) => ({
          id: folderNode.id,
          name: folderNode.name,
          parentId: folderNode.parentId,
        })),
        files: nextItems.map((item) => ({
          id: item.id,
          title: item.title,
          parentId: item.parentId,
        })),
      });

      try {
        await deleteDriveItems({ userId, ids });
      } catch (error) {
        setItems(prevState.items);
        setDriveFolders(prevState.driveFolders);
        setWorkspaces(prevState.workspaces);
        setFavorites(prevState.favorites);
        setItemParentMap(prevState.itemParentMap);
        setDriveView({
          currentFolderId,
          currentFolderPath,
          currentFolderIdPath,
          folders: prevState.driveFolders.map((folderNode) => ({
            id: folderNode.id,
            name: folderNode.name,
            parentId: folderNode.parentId,
          })),
          files: prevState.items.map((item) => ({
            id: item.id,
            title: item.title,
            parentId: item.parentId,
          })),
        });
        throw error;
      }
    },
    [
      currentFolderId,
      currentFolderIdPath,
      currentFolderPath,
      driveFolders,
      favorites,
      itemParentMap,
      items,
      pruneSidebarTree,
      setDriveView,
      userId,
      workspaces,
    ],
  );

  const restoreItems = useCallback(
    async (ids: string[]) => {
      if (!ids.length || !userId) {
        return;
      }

      await restoreDriveItems({ userId, ids });
      await refreshDrive();
    },
    [refreshDrive, userId],
  );

  const setItemsStarred = useCallback(
    async (ids: string[], isStarred: boolean) => {
      if (!ids.length) {
        return;
      }

      await updateDriveItems({
        id: ids,
        isStarred,
      });
      await refreshDrive();
    },
    [refreshDrive],
  );

  const getItemParentId = useCallback(
    (itemId: string) => {
      if (itemId in itemParentMap) {
        return itemParentMap[itemId];
      }
      return null;
    },
    [itemParentMap],
  );

  const value = useMemo(
    () => ({
      items,
      setItems,
      driveFolders,
      setDriveFolders,
      activeDragItem,
      setActiveDragItem,
      workspaces,
      favorites,
      sidebarAutoOpenFolderId,
      rootFolderId,
      currentFolderId,
      currentFolderPath,
      currentFolderIdPath,
      hydrateDrive,
      refreshDrive,
      loadFolderView,
      createFolder,
      deleteItems,
      restoreItems,
      moveItems,
      setItemsStarred,
      getItemParentId,
      loadFolderChildren,
      setSidebarAutoOpenFolderId,
    }),
    [
      items,
      driveFolders,
      activeDragItem,
      workspaces,
      favorites,
      sidebarAutoOpenFolderId,
      rootFolderId,
      currentFolderId,
      currentFolderPath,
      currentFolderIdPath,
      hydrateDrive,
      refreshDrive,
      loadFolderView,
      createFolder,
      deleteItems,
      restoreItems,
      moveItems,
      setItemsStarred,
      getItemParentId,
      loadFolderChildren,
    ],
  );

  return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>;
};

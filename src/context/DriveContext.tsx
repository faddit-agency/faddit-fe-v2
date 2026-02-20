import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import {
  createDriveFolder,
  getDriveAll,
  getDriveFilePreviewUrl,
  getDriveStarredAll,
  updateDriveItems,
  DriveNode,
} from '../lib/api/driveApi';
import ChildClothImage from '../images/faddit/childcloth.png';

export interface DriveItem {
  id: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  badge: string;
  owner?: string;
  date?: string;
  size?: string;
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
  hydrateDrive: (rootFolderId: string) => Promise<void>;
  refreshDrive: () => Promise<void>;
  loadFolderView: (folderId: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
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
});

const toSidebarFile = (file: DriveNode): SidebarItem => ({
  id: file.fileSystemId,
  type: 'file',
  name: file.name,
  parentId: file.parentId,
});

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
  date: node.updatedAt ? String(node.updatedAt).slice(0, 10) : '-',
  size: formatBytes(node.size),
});

const isImageFile = (extension?: string) => {
  if (!extension) {
    return false;
  }

  const value = extension.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(value);
};

export const DriveProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<ActiveDriveDragItem | null>(null);
  const [workspaces, setWorkspaces] = useState<SidebarItem[]>([]);
  const [favorites, setFavorites] = useState<SidebarItem[]>([]);
  const [sidebarAutoOpenFolderId, setSidebarAutoOpenFolderId] = useState<string | null>(null);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderPath, setCurrentFolderPath] = useState('');
  const [itemParentMap, setItemParentMap] = useState<Record<string, string | null>>({});

  const replaceChildrenInTree = useCallback(
    (tree: SidebarItem[], folderId: string, children: SidebarItem[]): SidebarItem[] =>
      tree.map((node) => {
        if (node.id === folderId && node.type === 'folder') {
          return {
            ...node,
            children,
          };
        }

        if (node.children?.length) {
          return {
            ...node,
            children: replaceChildrenInTree(node.children, folderId, children),
          };
        }

        return node;
      }),
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

    setItemParentMap(nextParentMap);
    setWorkspaces([...rootFolders.map(toSidebarFolder), ...rootData.files.map(toSidebarFile)]);
    setFavorites([...starredFolders.map(toSidebarFolder), ...starredData.files.map(toSidebarFile)]);
  }, []);

  const loadFolderView = useCallback(async (folderId: string) => {
    if (!folderId) {
      return;
    }

    const folderData = await getDriveAll(folderId);
    const folders = folderData.folders.filter((node) => node.type === 'folder');
    const fileItems = await Promise.all(
      folderData.files.map(async (fileNode) => {
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
    setDriveFolders(folders.map(toDriveFolder));
    setItems(fileItems);
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
  }, []);

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
    async (ids: string[], targetFolderId: string, currentFolderId: string) => {
      if (!ids.length) {
        return;
      }

      await updateDriveItems({
        id: ids,
        parentId: targetFolderId,
        currentId: currentFolderId,
      });
      await refreshDrive();
    },
    [refreshDrive],
  );

  const createFolder = useCallback(
    async (name: string) => {
      if (!rootFolderId) {
        throw new Error('rootFolderId is missing');
      }

      const nextName = name.trim();
      if (!nextName) {
        return;
      }

      await createDriveFolder({
        parentId: rootFolderId,
        name: nextName,
      });
      await refreshDrive();
    },
    [refreshDrive, rootFolderId],
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
      hydrateDrive,
      refreshDrive,
      loadFolderView,
      createFolder,
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
      hydrateDrive,
      refreshDrive,
      loadFolderView,
      createFolder,
      moveItems,
      setItemsStarred,
      getItemParentId,
      loadFolderChildren,
    ],
  );

  return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>;
};

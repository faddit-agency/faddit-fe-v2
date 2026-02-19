import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of a Drive Item
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
}

export interface SidebarItem {
  id: string;
  type: 'folder' | 'file';
  name: string;
  children?: SidebarItem[];
  isOpen?: boolean; // For folders
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
  moveItemToFolder: (item: SidebarItem, folderId: string) => boolean;
  moveSidebarItem: (itemId: string, targetId: string) => void;
  activeDragItem: ActiveDriveDragItem | null;
  setActiveDragItem: (item: ActiveDriveDragItem | null) => void;
  workspaces: SidebarItem[];
  setWorkspaces: React.Dispatch<React.SetStateAction<SidebarItem[]>>;
  favorites: SidebarItem[];
  setFavorites: React.Dispatch<React.SetStateAction<SidebarItem[]>>;
  addFileToSection: (section: 'workspace' | 'favorite', file: SidebarItem) => void;
}

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
};

// Initial Mock Data
const initialWorkspaces: SidebarItem[] = Array.from({ length: 3 }).map((_, i) => ({
  id: `folder-workspace-${i}`,
  type: 'folder',
  name: `워크 스페이스 폴더 ${i + 1}`,
  children: [{ id: `file-workspace-${i}-1`, type: 'file', name: '작지 파일 1' }],
}));

const initialFavorites: SidebarItem[] = Array.from({ length: 3 }).map((_, i) => ({
  id: `folder-favorite-${i}`,
  type: 'folder',
  name: `좋아하는 폴더 ${i + 1}`,
  children: [{ id: `file-favorite-${i}-1`, type: 'file', name: '작지 파일 1' }],
}));

const initialDriveFolders: DriveFolder[] = [
  {
    id: 'drive-folder-1',
    name: '2026 faddit',
    shared: false,
    updatedAt: '2026. 2. 8.',
    updatedBy: '김한재',
  },
  {
    id: 'drive-folder-2',
    name: 'files',
    shared: false,
    updatedAt: '2025. 3. 30.',
    updatedBy: '최성락',
  },
  {
    id: 'drive-folder-3',
    name: 'Planning',
    shared: false,
    updatedAt: '2025. 3. 30.',
    updatedBy: '최성락',
  },
  {
    id: 'drive-folder-4',
    name: 'Templates',
    shared: true,
    updatedAt: '2025. 8. 11.',
    updatedBy: '최성락',
  },
];

const SECTION_WORKSPACE_ID = 'section-workspace';
const SECTION_FAVORITE_ID = 'section-favorite';

const removeItemFromTree = (
  tree: SidebarItem[],
  targetId: string,
): { nextTree: SidebarItem[]; removed: SidebarItem | null } => {
  let removed: SidebarItem | null = null;

  const nextTree = tree
    .map((node) => {
      if (node.id === targetId) {
        removed = node;
        return null;
      }

      if (!node.children?.length) {
        return node;
      }

      const result = removeItemFromTree(node.children, targetId);
      if (!result.removed) {
        return node;
      }

      removed = result.removed;
      return {
        ...node,
        children: result.nextTree,
      };
    })
    .filter(Boolean) as SidebarItem[];

  return { nextTree, removed };
};

const findItemInTree = (tree: SidebarItem[], targetId: string): SidebarItem | null => {
  for (const node of tree) {
    if (node.id === targetId) {
      return node;
    }

    if (node.children?.length) {
      const found = findItemInTree(node.children, targetId);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

const treeContainsId = (node: SidebarItem, targetId: string): boolean => {
  if (node.id === targetId) {
    return true;
  }

  if (!node.children?.length) {
    return false;
  }

  return node.children.some((child) => treeContainsId(child, targetId));
};

const insertItemIntoFolder = (
  tree: SidebarItem[],
  folderId: string,
  item: SidebarItem,
): { nextTree: SidebarItem[]; inserted: boolean } => {
  let inserted = false;

  const nextTree = tree.map((node) => {
    if (node.id === folderId && node.type === 'folder') {
      inserted = true;
      return {
        ...node,
        children: [...(node.children || []), item],
      };
    }

    if (!node.children?.length) {
      return node;
    }

    const result = insertItemIntoFolder(node.children, folderId, item);
    if (result.inserted) {
      inserted = true;
      return {
        ...node,
        children: result.nextTree,
      };
    }

    return node;
  });

  return { nextTree, inserted };
};

export const DriveProvider = ({
  children,
  initialItems,
}: {
  children: ReactNode;
  initialItems?: DriveItem[];
}) => {
  const [items, setItems] = useState<DriveItem[]>(initialItems || []);
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>(initialDriveFolders);
  const [activeDragItem, setActiveDragItem] = useState<ActiveDriveDragItem | null>(null);
  const [workspaces, setWorkspaces] = useState<SidebarItem[]>(initialWorkspaces);
  const [favorites, setFavorites] = useState<SidebarItem[]>(initialFavorites);

  const moveItemToFolder = (item: SidebarItem, folderId: string) => {
    const workspaceInsert = insertItemIntoFolder(workspaces, folderId, item);
    if (workspaceInsert.inserted) {
      setWorkspaces(workspaceInsert.nextTree);
      return true;
    }

    const favoriteInsert = insertItemIntoFolder(favorites, folderId, item);
    if (favoriteInsert.inserted) {
      setFavorites(favoriteInsert.nextTree);
      return true;
    }

    return false;
  };

  const moveSidebarItem = (itemId: string, targetId: string) => {
    const sourceInWorkspace = findItemInTree(workspaces, itemId);
    const sourceInFavorite = findItemInTree(favorites, itemId);
    const movingItem = sourceInWorkspace || sourceInFavorite;

    if (!movingItem) {
      return;
    }

    const targetInWorkspace = findItemInTree(workspaces, targetId);
    const targetInFavorite = findItemInTree(favorites, targetId);
    const targetFolder = targetInWorkspace || targetInFavorite;

    if (
      targetId !== SECTION_WORKSPACE_ID &&
      targetId !== SECTION_FAVORITE_ID &&
      (!targetFolder || targetFolder.type !== 'folder')
    ) {
      return;
    }

    if (
      movingItem.type === 'folder' &&
      targetFolder &&
      treeContainsId(movingItem, targetFolder.id)
    ) {
      return;
    }

    const workspaceRemoval = removeItemFromTree(workspaces, itemId);
    const favoriteRemoval = removeItemFromTree(favorites, itemId);
    const removedItem = workspaceRemoval.removed || favoriteRemoval.removed;

    if (!removedItem) {
      return;
    }

    let nextWorkspaces = workspaceRemoval.nextTree;
    let nextFavorites = favoriteRemoval.nextTree;

    if (targetId === SECTION_WORKSPACE_ID) {
      nextWorkspaces = [...nextWorkspaces, removedItem];
    } else if (targetId === SECTION_FAVORITE_ID) {
      nextFavorites = [...nextFavorites, removedItem];
    } else {
      const workspaceInsert = insertItemIntoFolder(nextWorkspaces, targetId, removedItem);
      if (workspaceInsert.inserted) {
        nextWorkspaces = workspaceInsert.nextTree;
      } else {
        const favoriteInsert = insertItemIntoFolder(nextFavorites, targetId, removedItem);
        if (!favoriteInsert.inserted) {
          return;
        }
        nextFavorites = favoriteInsert.nextTree;
      }
    }

    setWorkspaces(nextWorkspaces);
    setFavorites(nextFavorites);
  };

  const addFileToSection = (section: 'workspace' | 'favorite', file: SidebarItem) => {
    if (section === 'workspace') {
      setWorkspaces((prev) => [...prev, file]);
    } else {
      setFavorites((prev) => [...prev, file]);
    }
  };

  return (
    <DriveContext.Provider
      value={{
        items,
        setItems,
        driveFolders,
        setDriveFolders,
        moveItemToFolder,
        moveSidebarItem,
        activeDragItem,
        setActiveDragItem,
        workspaces,
        setWorkspaces,
        favorites,
        setFavorites,
        addFileToSection,
      }}
    >
      {children}
    </DriveContext.Provider>
  );
};

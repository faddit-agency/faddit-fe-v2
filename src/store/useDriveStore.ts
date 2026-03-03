import { createAppStore } from './createAppStore';
import { MaterialItem } from '../lib/api/materialApi';

export type DriveViewItem = {
  id: string;
  title: string;
  parentId?: string | null;
};

export type DriveViewFolder = {
  id: string;
  name: string;
  parentId: string | null;
};

type RecentDocsDebugFolder = {
  id: string;
  name: string;
  action_type: 'folder_enter';
};

type RecentDocsDebugFile = {
  id: string;
  name: string;
  action_type: 'file_view' | 'file_edit' | 'file_create' | null;
  created_at: string | null;
};

type RecentDocsDebugState = {
  fetchedAt: string;
  folders: RecentDocsDebugFolder[];
  files: RecentDocsDebugFile[];
};

type RecentTrackDebugEntry = {
  trackedAt: string;
  fileSystemId: string;
  action_type: 'folder_enter' | 'file_view' | 'file_edit' | 'file_create';
};

type DriveStoreState = {
  materialsByFileSystemId: Record<string, MaterialItem[]>;
  setMaterialsForFile: (fileSystemId: string, materials: MaterialItem[]) => void;
  clearMaterialsForFiles: (fileSystemIds: string[]) => void;

  currentFolderId: string | null;
  currentFolderPath: string;
  currentFolderIdPath: string;
  folders: DriveViewFolder[];
  files: DriveViewItem[];
  setDriveView: (payload: {
    currentFolderId: string | null;
    currentFolderPath: string;
    currentFolderIdPath: string;
    folders: DriveViewFolder[];
    files: DriveViewItem[];
  }) => void;
  clearDriveView: () => void;

  searchLoading: boolean;
  driveLoading: boolean;
  setSearchLoading: (next: boolean) => void;
  setDriveLoading: (next: boolean) => void;

  recentDocsDebug: RecentDocsDebugState | null;
  setRecentDocsDebug: (payload: RecentDocsDebugState) => void;
  clearRecentDocsDebug: () => void;
  recentTrackDebug: RecentTrackDebugEntry[];
  pushRecentTrackDebug: (payload: RecentTrackDebugEntry) => void;
};

export const useDriveStore = createAppStore<DriveStoreState>('drive-store', (set) => ({
  materialsByFileSystemId: {},
  setMaterialsForFile: (fileSystemId, materials) => {
    set(
      (prev) => ({
        materialsByFileSystemId: {
          ...prev.materialsByFileSystemId,
          [fileSystemId]: materials,
        },
      }),
      false,
      'drive-store/setMaterialsForFile',
    );
  },
  clearMaterialsForFiles: (fileSystemIds) => {
    set(
      (prev) => {
        const next = { ...prev.materialsByFileSystemId };
        fileSystemIds.forEach((fileSystemId) => {
          delete next[fileSystemId];
        });
        return { materialsByFileSystemId: next };
      },
      false,
      'drive-store/clearMaterialsForFiles',
    );
  },

  currentFolderId: null,
  currentFolderPath: '',
  currentFolderIdPath: '',
  folders: [],
  files: [],
  setDriveView: (payload) => {
    set(
      {
        currentFolderId: payload.currentFolderId,
        currentFolderPath: payload.currentFolderPath,
        currentFolderIdPath: payload.currentFolderIdPath,
        folders: payload.folders,
        files: payload.files,
      },
      false,
      'drive-store/setDriveView',
    );
  },
  clearDriveView: () => {
    set(
      {
        currentFolderId: null,
        currentFolderPath: '',
        currentFolderIdPath: '',
        folders: [],
        files: [],
      },
      false,
      'drive-store/clearDriveView',
    );
  },

  searchLoading: false,
  driveLoading: false,
  setSearchLoading: (next) => {
    set({ searchLoading: next }, false, 'drive-store/setSearchLoading');
  },
  setDriveLoading: (next) => {
    set({ driveLoading: next }, false, 'drive-store/setDriveLoading');
  },

  recentDocsDebug: null,
  setRecentDocsDebug: (payload) => {
    set({ recentDocsDebug: payload }, false, 'drive-store/setRecentDocsDebug');
  },
  clearRecentDocsDebug: () => {
    set({ recentDocsDebug: null }, false, 'drive-store/clearRecentDocsDebug');
  },
  recentTrackDebug: [],
  pushRecentTrackDebug: (payload) => {
    set(
      (prev) => ({
        recentTrackDebug: [payload, ...prev.recentTrackDebug].slice(0, 100),
      }),
      false,
      'drive-store/pushRecentTrackDebug',
    );
  },
}));

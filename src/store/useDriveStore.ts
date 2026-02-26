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
}));

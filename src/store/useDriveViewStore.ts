import { createAppStore } from './createAppStore';

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

type DriveViewState = {
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
};

export const useDriveViewStore = createAppStore<DriveViewState>('drive-view-store', (set) => ({
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
      'drive-view-store/setDriveView',
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
      'drive-view-store/clearDriveView',
    );
  },
}));

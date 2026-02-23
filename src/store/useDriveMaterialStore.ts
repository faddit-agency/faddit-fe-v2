import { createAppStore } from './createAppStore';
import { MaterialItem } from '../pages/faddit/drive/materialApi';

type DriveMaterialState = {
  materialsByFileSystemId: Record<string, MaterialItem[]>;
  setMaterialsForFile: (fileSystemId: string, materials: MaterialItem[]) => void;
  clearMaterialsForFiles: (fileSystemIds: string[]) => void;
};

export const useDriveMaterialStore = createAppStore<DriveMaterialState>(
  'drive-material-store',
  (set) => ({
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
        'drive-material-store/setMaterialsForFile',
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
        'drive-material-store/clearMaterialsForFiles',
      );
    },
  }),
);

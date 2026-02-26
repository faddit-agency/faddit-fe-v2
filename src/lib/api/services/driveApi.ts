import { DRIVE_ENDPOINTS } from '../endpoints';
import { baseHttpClient } from '../client/httpClient';

export type DriveNode = {
  fileSystemId: string;
  name: string;
  path: string;
  idPath: string;
  type: 'folder' | 'file' | 'worksheet' | 'resource';
  isStarred: boolean;
  isRoot: boolean;
  childrenCount: number;
  updatedAt: string;
  parentId: string | null;
  size?: number;
  mimetype?: string;
  tag?: string;
  creatorName?: string;
  creatorProfileImg?: string;
  deletedAt?: string;
  worksheetThumbnail?: string;
};

export type DriveAllResponse = {
  folders: DriveNode[];
  files: DriveNode[];
  idPath: string;
  path: string;
};

export type UpdateDriveItemsPayload = {
  id: string[];
  parentId?: string;
  currentId?: string;
  isStarred?: boolean;
  name?: string;
};

export type CreateDriveFolderPayload = {
  parentId: string;
  name: string;
};

export type DeleteDriveItemsPayload = {
  userId: string;
  ids: string[];
};

export type RestoreDriveItemsPayload = {
  userId: string;
  ids: string[];
};

export type DriveStorageSummary = {
  storageUsed?: number;
  storageLimit?: number;
};

export type DriveUploadTag =
  | 'worksheet'
  | 'schematic'
  | 'etc'
  | 'pattern'
  | 'print'
  | 'faddit'
  | 'fabric'
  | 'label';

export type DriveSearchCategory =
  | 'folder'
  | 'worksheet'
  | 'schematic'
  | 'etc'
  | 'pattern'
  | 'print'
  | 'faddit'
  | 'fabric'
  | 'label';

export type DriveSearchParams = {
  search?: string;
  page?: number;
  category?: DriveSearchCategory;
  categories?: DriveSearchCategory[];
};

export type DriveSearchResponse = {
  count: number;
  data: DriveNode[];
};

export type CreateDriveFilePayload = {
  parentId: string | null;
  userId: string;
  files: File[];
  tags: DriveUploadTag[];
};

export type CreateDriveFileResponse = {
  result: Array<{
    index: number;
    success: boolean;
    storage_path?: string;
    originalName?: string;
    result?: {
      fileSystemId: string;
      name: string;
      path: string;
      type: 'file';
      storagePath: string;
      mimetype: string;
      tag: string;
      size: number;
    };
  }>;
  storageUsed: number;
  storageLimit: number;
};

export const getDriveAll = async (path: string) => {
  const response = await baseHttpClient.get<DriveAllResponse>(DRIVE_ENDPOINTS.all, {
    params: { path },
  });
  return response.data;
};

export const getDriveStarredAll = async () => {
  const response = await baseHttpClient.get<DriveAllResponse>(DRIVE_ENDPOINTS.starredAll);
  return response.data;
};

export const getDriveTrashAll = async () => {
  const response = await baseHttpClient.get<DriveAllResponse>(DRIVE_ENDPOINTS.trashAll);
  return response.data;
};

export const updateDriveItems = async (payload: UpdateDriveItemsPayload) => {
  const response = await baseHttpClient.patch(DRIVE_ENDPOINTS.root, payload);
  return response.data;
};

export const createDriveFolder = async (payload: CreateDriveFolderPayload) => {
  const response = await baseHttpClient.post(DRIVE_ENDPOINTS.folder, payload);
  return response.data;
};

export const deleteDriveItems = async (payload: DeleteDriveItemsPayload) => {
  await baseHttpClient.delete(DRIVE_ENDPOINTS.root, {
    data: payload,
  });
};

export const destroyDriveItems = async (payload: DeleteDriveItemsPayload) => {
  const response = await baseHttpClient.delete<DriveStorageSummary>(DRIVE_ENDPOINTS.destroy, {
    data: payload,
  });
  return response.data;
};

export const restoreDriveItems = async (payload: RestoreDriveItemsPayload) => {
  await baseHttpClient.patch(DRIVE_ENDPOINTS.restore, payload);
};

export const createDriveFile = async (payload: CreateDriveFilePayload) => {
  const formData = new FormData();
  payload.files.forEach((file) => {
    formData.append('files', file);
  });
  payload.tags.forEach((tag) => {
    formData.append('tags', tag);
  });
  if (payload.parentId) {
    formData.append('parentId', payload.parentId);
  }
  formData.append('userId', payload.userId);

  const response = await baseHttpClient.post<CreateDriveFileResponse>(
    DRIVE_ENDPOINTS.file,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
};

export const getDriveFilePreviewUrl = async (fileSystemId: string) => {
  const response = await baseHttpClient.get<string | { url?: string }>(
    DRIVE_ENDPOINTS.download(fileSystemId),
  );

  if (typeof response.data === 'string') {
    return response.data;
  }

  if (response.data && typeof response.data.url === 'string') {
    return response.data.url;
  }

  return '';
};

export const searchDriveItems = async (params: DriveSearchParams) => {
  const normalizedParams: Record<string, string | number | undefined> = {
    page: params.page ?? 1,
    search: params.search?.trim() || undefined,
    category: params.category,
    categories:
      params.categories && params.categories.length > 0 ? params.categories.join(',') : undefined,
  };

  const response = await baseHttpClient.get<DriveSearchResponse>(DRIVE_ENDPOINTS.search, {
    params: normalizedParams,
  });

  return response.data;
};

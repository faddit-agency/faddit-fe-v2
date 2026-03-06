import { DRIVE_ENDPOINTS } from '../endpoints';
import { baseHttpClient } from '../client/httpClient';

export type DriveNode = {
  fileSystemId: string;
  worksheetId?: string;
  name: string;
  path: string;
  idPath: string;
  type: 'folder' | 'file' | 'worksheet' | 'resource';
  isStarred: boolean;
  isRoot: boolean;
  childrenCount: number;
  createdAt?: string;
  updatedAt: string;
  parentId: string | null;
  size?: number;
  mimetype?: string;
  tag?: string;
  creatorName?: string;
  creatorProfileImg?: string;
  recentCreatedAt?: string;
  recentActionType?: 'file_view' | 'file_edit' | 'file_create';
  recentActorName?: string;
  deletedAt?: string;
  worksheetThumbnail?: string;
  visibilityScope?: DriveVisibilityScope;
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
  visibilityScope?: DriveVisibilityScope;
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
  | 'trim'
  | 'pattern'
  | 'print'
  | 'faddit'
  | 'fabric'
  | 'rib_fabric'
  | 'label';

export type DriveVisibilityScope = 'default' | 'worksheet_upload';

export type DriveSearchCategory =
  | 'folder'
  | 'worksheet'
  | 'upload'
  | 'trim'
  | 'rib_fabric'
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

export type DriveRecentActivityType = 'folder_enter' | 'file_view' | 'file_edit' | 'file_create';

export type DriveRecentTrackPayload = {
  userId: string;
  fileSystemId: string;
  eventType: DriveRecentActivityType;
};

export type CreateDriveFilePayload = {
  parentId: string | null;
  userId: string;
  files: File[];
  tags: DriveUploadTag[];
  visibilityScope?: DriveVisibilityScope;
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

export const getDriveAll = async (
  path: string,
  options?: {
    includeHidden?: boolean;
  },
) => {
  const response = await baseHttpClient.get<DriveAllResponse>(DRIVE_ENDPOINTS.all, {
    params: {
      path,
      includeHidden: options?.includeHidden ? 'true' : undefined,
    },
  });
  return response.data;
};

export const getDriveRecent = async () => {
  const response = await baseHttpClient.get<DriveAllResponse>(DRIVE_ENDPOINTS.recent);
  return response.data;
};

export const trackDriveRecentActivity = async (payload: DriveRecentTrackPayload) => {
  await baseHttpClient.post(DRIVE_ENDPOINTS.recentTrack, payload);
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
  if (payload.visibilityScope) {
    formData.append('visibilityScope', payload.visibilityScope);
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

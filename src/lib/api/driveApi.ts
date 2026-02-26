import { baseHttpClient } from './httpClient';

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
  updatedAt: string;
  parentId: string | null;
  size?: number;
  mimetype?: string;
  tag?: string;
  creatorName?: string;
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
  const response = await baseHttpClient.get<DriveAllResponse>('/drive/all', {
    params: { path },
  });
  return response.data;
};

export const getDriveStarredAll = async () => {
  const response = await baseHttpClient.get<DriveAllResponse>('/drive/starred-all');
  return response.data;
};

export const getDriveTrashAll = async () => {
  const response = await baseHttpClient.get<DriveAllResponse>('/drive/trash-all');
  return response.data;
};

export const updateDriveItems = async (payload: UpdateDriveItemsPayload) => {
  const response = await baseHttpClient.patch('/drive', payload);
  return response.data;
};

export const createDriveFolder = async (payload: CreateDriveFolderPayload) => {
  const response = await baseHttpClient.post('/drive/folder', payload);
  return response.data;
};

export const deleteDriveItems = async (payload: DeleteDriveItemsPayload) => {
  await baseHttpClient.delete('/drive', {
    data: payload,
  });
};

export const destroyDriveItems = async (payload: DeleteDriveItemsPayload) => {
  await baseHttpClient.delete('/drive/destroy', {
    data: payload,
  });
};

export const restoreDriveItems = async (payload: RestoreDriveItemsPayload) => {
  await baseHttpClient.patch('/drive/restore', payload);
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

  const response = await baseHttpClient.post<CreateDriveFileResponse>('/drive/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const getDriveFilePreviewUrl = async (fileSystemId: string) => {
  const response = await baseHttpClient.get<string | { url?: string }>(
    `/drive/download/${fileSystemId}`,
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

  const response = await baseHttpClient.get<DriveSearchResponse>('/drive/search', {
    params: normalizedParams,
  });

  return response.data;
};

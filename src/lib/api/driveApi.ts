import { baseHttpClient } from './httpClient';

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
};

export type CreateDriveFolderPayload = {
  parentId: string;
  name: string;
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

export const updateDriveItems = async (payload: UpdateDriveItemsPayload) => {
  const response = await baseHttpClient.patch('/drive', payload);
  return response.data;
};

export const createDriveFolder = async (payload: CreateDriveFolderPayload) => {
  const response = await baseHttpClient.post('/drive/folder', payload);
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

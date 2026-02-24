import { baseHttpClient } from './httpClient';

export type CreateWorksheetPayload = {
  userId: string;
  parentId: string;
  name: string;
  default_name: boolean;
  manager_name: string;
  brand_name: string;
  season_year: number;
  season_type: string;
  gender: number;
  category: number;
  clothes: string;
  size_spec: string;
};

export type CreatedWorksheet = {
  worksheetId?: string;
  worksheet_id?: string;
  name?: string;
};

export type WorksheetDetailResponse = {
  worksheet: {
    worksheet_id: string;
    name?: string;
    ui_info_json?: string | null;
    size_spec?: string | null;
    [key: string]: unknown;
  };
  is_owner?: boolean;
  role?: string;
  owner?: {
    email?: string;
    name?: string;
    profileImg?: string;
  };
};

export const createWorksheet = async (payload: CreateWorksheetPayload) => {
  const response = await baseHttpClient.post<CreatedWorksheet>('/worksheet', payload);
  return response.data;
};

export const getWorksheetDetail = async (worksheetId: string, userId?: string) => {
  const response = await baseHttpClient.request<WorksheetDetailResponse>({
    url: `/worksheet/${worksheetId}`,
    method: 'GET',
    data: userId ? { userId } : undefined,
  });
  return response.data;
};

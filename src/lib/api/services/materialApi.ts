import { MATERIAL_ENDPOINTS } from '../endpoints';
import { baseHttpClient } from '../client/httpClient';

export type MaterialCategory = 'fabric' | 'rib_fabric' | 'label' | 'trim';

export type MaterialFieldInputType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'dimension'
  | 'textarea'
  | 'group'
  | 'option_with_other'
  | 'number_with_option'
  | 'number_pair';

export type MaterialFieldDef = {
  id: number;
  category: MaterialCategory;
  field_key: string;
  label: string;
  input_type: MaterialFieldInputType;
  required: boolean;
  unit: string | null;
  options: unknown;
  parent_field_key: string | null;
  show_if: { field: string; in: string[] } | null;
  sort_order: number;
  is_active: boolean;
};

export type CreateMaterialPayload = {
  userId: string;
  category: MaterialCategory;
  subtype?: string;
  codeInternal?: string;
  vendorName?: string;
  itemName?: string;
  originCountry?: string;
  fileSystemId?: string;
  imageUrl?: string;
  attributes?: Record<string, unknown>;
};

export type MaterialItem = {
  id: string;
  category: MaterialCategory;
  file_system?: { id: string } | null;
  attributes: Record<string, unknown>;
  code_internal?: string | null;
  vendor_name?: string | null;
  item_name?: string | null;
  origin_country?: string | null;
  image_url?: string | null;
};

export type UpdateMaterialPayload = {
  userId: string;
  category?: MaterialCategory;
  subtype?: string;
  codeInternal?: string;
  vendorName?: string;
  itemName?: string;
  originCountry?: string;
  fileSystemId?: string;
  imageUrl?: string;
  attributes?: Record<string, unknown>;
};

export const getMaterialFieldDefs = async (category: MaterialCategory) => {
  const response = await baseHttpClient.get<MaterialFieldDef[]>(
    MATERIAL_ENDPOINTS.fieldDefsByCategory(category),
  );
  return response.data;
};

export const createMaterial = async (payload: CreateMaterialPayload) => {
  const response = await baseHttpClient.post(MATERIAL_ENDPOINTS.root, payload);
  return response.data;
};

export const getMaterialsByFileSystem = async (fileSystemId: string, userId: string) => {
  const response = await baseHttpClient.request<MaterialItem[]>({
    method: 'GET',
    url: MATERIAL_ENDPOINTS.byFileSystem(fileSystemId),
    data: { userId },
  });
  return response.data;
};

export const updateMaterial = async (materialId: string, payload: UpdateMaterialPayload) => {
  const response = await baseHttpClient.patch(MATERIAL_ENDPOINTS.byId(materialId), payload);
  return response.data;
};

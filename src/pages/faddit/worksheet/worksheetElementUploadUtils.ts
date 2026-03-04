import type { DriveUploadTag } from '../../../lib/api/driveApi';
import type { WorksheetElementCategory } from '../worksheet-v2/worksheetV2Types';

export const getWorksheetElementFolderName = (worksheetId: string) => `worksheet-elements-${worksheetId}`;

export const WORKSHEET_ELEMENT_UPLOAD_REFRESH_EVENT = 'worksheet-element-upload-refresh';

export const WORKSHEET_UPLOAD_CATEGORIES = [
  '원단',
  '시보리원단',
  '라벨',
  '부자재',
  '인쇄',
  '기타',
] as const;

export type WorksheetUploadCategory = (typeof WORKSHEET_UPLOAD_CATEGORIES)[number];

export const isWorksheetElementCategory = (
  category: WorksheetUploadCategory,
): category is WorksheetElementCategory =>
  category === '원단' ||
  category === '시보리원단' ||
  category === '라벨' ||
  category === '부자재';

export const mapWorksheetUploadCategoryToDriveTag = (
  category: WorksheetUploadCategory,
): DriveUploadTag => {
  if (category === '원단' || category === '시보리원단') {
    return 'fabric';
  }
  if (category === '라벨') {
    return 'label';
  }
  if (category === '인쇄') {
    return 'print';
  }

  return 'etc';
};

export const mapWorksheetElementCategoryToUploadTag = (
  category: WorksheetElementCategory,
): DriveUploadTag => mapWorksheetUploadCategoryToDriveTag(category);

export const normalizeWorksheetElementUploadFile = (
  file: File,
  category: WorksheetUploadCategory,
) => {
  if (category !== '시보리원단' || file.name.includes('시보리')) {
    return file;
  }

  return new File([file], `시보리_${file.name}`, { type: file.type });
};

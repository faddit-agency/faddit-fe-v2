import type { DriveUploadTag } from '../../../lib/api/driveApi';
import type { WorksheetElementCategory } from '../worksheet-v2/worksheetV2Types';

export const getWorksheetElementFolderName = (worksheetId: string) => `worksheet-elements-${worksheetId}`;

export const WORKSHEET_ELEMENT_UPLOAD_REFRESH_EVENT = 'worksheet-element-upload-refresh';

export const mapWorksheetElementCategoryToUploadTag = (
  category: WorksheetElementCategory,
): DriveUploadTag => {
  if (category === '원단' || category === '시보리원단') {
    return 'fabric';
  }
  if (category === '라벨') {
    return 'label';
  }

  return 'etc';
};

export const normalizeWorksheetElementUploadFile = (
  file: File,
  category: WorksheetElementCategory,
) => {
  if (category !== '시보리원단' || file.name.includes('시보리')) {
    return file;
  }

  return new File([file], `시보리_${file.name}`, { type: file.type });
};

export const AUTH_ENDPOINTS = {
  emailVerification: '/user/email-verification',
  checkVerificationEmail: '/user/check-verification-email',
  signUp: '/user/sign-up',
  signIn: '/user/sign-in',
  signOut: '/user/sign-out',
  updateSnsUser: '/user/update-sns-user',
  requestResetPassword: '/user/request-reset-password',
  verifyResetPassword: '/user/verification-reset-password',
  updatePassword: '/user/update-password',
  me: '/user/me',
  refresh: '/user/refresh',
} as const;

export const DRIVE_ENDPOINTS = {
  all: '/drive/all',
  starredAll: '/drive/starred-all',
  trashAll: '/drive/trash-all',
  root: '/drive',
  folder: '/drive/folder',
  destroy: '/drive/destroy',
  restore: '/drive/restore',
  file: '/drive/file',
  search: '/drive/search',
  download: (fileSystemId: string) => `/drive/download/${fileSystemId}`,
} as const;

export const WORKSHEET_ENDPOINTS = {
  root: '/worksheet',
  byId: (worksheetId: string) => `/worksheet/${worksheetId}`,
} as const;

export const MATERIAL_ENDPOINTS = {
  root: '/drive/material',
  byId: (materialId: string) => `/drive/material/${materialId}`,
  fieldDefsByCategory: (category: string) => `/drive/material/field-defs/${category}`,
  byFileSystem: (fileSystemId: string) => `/drive/material/by-file/${fileSystemId}`,
} as const;

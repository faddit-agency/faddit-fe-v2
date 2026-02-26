import {
  baseHttpClient,
  clearAuthSession,
  cookieHttpClient,
  getCurrentUserId,
  refreshAccessToken,
  setAuthSession,
} from './httpClient';
import { useAuthStore } from '../../store/useAuthStore';

export type SignUpRequest = {
  name: string;
  email: string;
  password: string;
  serviceAgreement: boolean;
  userAgreement: boolean;
  marketingAgreement: boolean;
};

export type SignInRequest = {
  email: string;
  password: string;
};

export type SignOutRequest = {
  userId: string;
};

export type SignInResponse = {
  userId: string;
  rootFolder?: string;
  storageUsed?: number;
  storageLimit?: number;
  accessToken: string;
  accessTokenExpiresAt: string;
  serverNow: string;
  [key: string]: unknown;
};

export type SignUpResponse = {
  userId: string;
  name: string;
  profileImg?: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  [key: string]: unknown;
};

export type CheckVerificationEmailRequest = {
  email: string;
  code: number;
};

const toAuthUser = (payload: Record<string, unknown>) => {
  const userIdValue = payload.userId ?? payload.user_id;
  const userId = typeof userIdValue === 'string' ? userIdValue : '';

  if (!userId) {
    return null;
  }

  return {
    userId,
    rootFolder:
      typeof payload.rootFolder === 'string'
        ? payload.rootFolder
        : typeof payload.root_folder === 'string'
          ? payload.root_folder
          : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    profileImg:
      typeof payload.profileImg === 'string'
        ? payload.profileImg
        : typeof payload.profile_img === 'string'
          ? payload.profile_img
          : undefined,
    storageUsed:
      typeof payload.storageUsed === 'number'
        ? payload.storageUsed
        : typeof payload.storage_used === 'number'
          ? payload.storage_used
          : undefined,
    storageLimit:
      typeof payload.storageLimit === 'number'
        ? payload.storageLimit
        : typeof payload.storage_limit === 'number'
          ? payload.storage_limit
          : undefined,
  };
};

export const requestEmailVerification = async (email: string) => {
  await cookieHttpClient.post('/user/email-verification', { email }, { _skipAuth: true });
};

export const checkVerificationEmail = async (payload: CheckVerificationEmailRequest) => {
  const response = await cookieHttpClient.post('/user/check-verification-email', payload, {
    _skipAuth: true,
  });
  return response.data;
};

export const signUp = async (payload: SignUpRequest) => {
  const response = await cookieHttpClient.post<SignUpResponse>('/user/sign-up', payload, {
    _skipAuth: true,
  });

  return response.data;
};

export const signIn = async (payload: SignInRequest) => {
  const response = await cookieHttpClient.post<SignInResponse>('/user/sign-in', payload, {
    _skipAuth: true,
  });

  setAuthSession({
    userId: response.data.userId,
    accessToken: response.data.accessToken,
    accessTokenExpiresAt: response.data.accessTokenExpiresAt,
    serverNow: response.data.serverNow,
  });

  const authUser = toAuthUser(response.data as Record<string, unknown>);
  if (authUser) {
    useAuthStore.getState().setUser(authUser);
  } else {
    useAuthStore.getState().setAuthenticated(true);
  }

  return response.data;
};

export const signOut = async (payload: SignOutRequest) => {
  await baseHttpClient.post('/user/sign-out', payload, { withCredentials: true });
  clearAuthSession();
};

export const updateSnsUser = async (payload: {
  email: string;
  name: string;
  serviceAgreement: boolean;
  userAgreement: boolean;
  marketingAgreement: boolean;
  snsAccessToken: string;
}) => {
  const response = await cookieHttpClient.patch('/user/update-sns-user', payload, {
    _skipAuth: true,
  });

  if (response.data?.accessToken) {
    setAuthSession({
      userId: response.data.userId,
      accessToken: response.data.accessToken,
      accessTokenExpiresAt: response.data.accessTokenExpiresAt,
      serverNow: response.data.serverNow || new Date().toISOString(),
    });

    const authUser = toAuthUser(response.data as Record<string, unknown>);
    if (authUser) {
      useAuthStore.getState().setUser(authUser);
    } else {
      useAuthStore.getState().setAuthenticated(true);
    }
  }

  return response.data;
};

export const requestResetPassword = async (email: string) => {
  await baseHttpClient.post('/user/request-reset-password', { email }, { _skipAuth: true });
};

export const verifyResetPassword = async (payload: {
  userId: string;
  passwordResetToken: string;
}) => {
  await baseHttpClient.post('/user/verification-reset-password', payload, {
    _skipAuth: true,
  });
};

export const updatePassword = async (payload: {
  userId: string;
  passwordResetToken: string;
  password: string;
}) => {
  await baseHttpClient.patch('/user/update-password', payload, { _skipAuth: true });
};

export const logoutAndClearClient = async () => {
  const userId = getCurrentUserId();

  try {
    if (userId) {
      await signOut({ userId });
    }
  } catch (error) {
    console.error('Logout request failed', error);
  } finally {
    clearAuthSession();
    localStorage.clear();
    sessionStorage.clear();
  }
};

export const getMe = async () => {
  const response = await baseHttpClient.get('/user/me');

  const authUser = toAuthUser(response.data as Record<string, unknown>);
  if (authUser) {
    useAuthStore.getState().setUser(authUser);
  }

  return response.data;
};

export const bootstrapAuthSession = async () => {
  try {
    await refreshAccessToken();

    const { user } = useAuthStore.getState();
    const hasRenderableProfile = Boolean(
      user?.userId && user?.rootFolder && (user?.name || user?.email || user?.profileImg),
    );

    if (!hasRenderableProfile) {
      await getMe();
    }

    return true;
  } catch (error) {
    useAuthStore.getState().setAuthenticated(false);
    return false;
  }
};

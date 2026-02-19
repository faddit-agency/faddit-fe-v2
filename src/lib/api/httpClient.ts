import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../store/useAuthStore';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuth?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _skipAuth?: boolean;
  }
}

type TokenLifecyclePayload = {
  userId?: string;
  accessToken: string;
  accessTokenExpiresAt?: string;
  serverNow?: string;
};

type RefreshResponse = {
  userId?: string;
  name?: string;
  email?: string;
  profileImg?: string;
  profile_img?: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  serverNow: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:1004';
const REFRESH_BUFFER_MS = 90 * 1000;

let accessToken = '';
let accessTokenExpiresAt = '';
let serverNow = '';
let currentUserId = '';
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<string> | null = null;

const clearRefreshTimer = () => {
  if (!refreshTimer) {
    return;
  }

  clearTimeout(refreshTimer);
  refreshTimer = null;
};

const toEpoch = (value?: string) => {
  if (!value) {
    return NaN;
  }
  return new Date(value).getTime();
};

const scheduleRefresh = () => {
  clearRefreshTimer();

  if (!accessToken || !accessTokenExpiresAt) {
    return;
  }

  const expiresAtMs = toEpoch(accessTokenExpiresAt);
  const serverNowMs = toEpoch(serverNow);
  const nowMs = Number.isNaN(serverNowMs) ? Date.now() : serverNowMs;

  if (Number.isNaN(expiresAtMs)) {
    return;
  }

  const delay = Math.max(expiresAtMs - nowMs - REFRESH_BUFFER_MS, 0);

  refreshTimer = setTimeout(() => {
    refreshAccessToken().catch(() => {
      clearAuthSession();
    });
  }, delay);
};

export const setAuthSession = (payload: TokenLifecyclePayload) => {
  accessToken = payload.accessToken || '';
  accessTokenExpiresAt = payload.accessTokenExpiresAt || '';
  serverNow = payload.serverNow || new Date().toISOString();
  if (payload.userId !== undefined) {
    currentUserId = payload.userId || '';
  }
  scheduleRefresh();
};

export const clearAuthSession = () => {
  accessToken = '';
  accessTokenExpiresAt = '';
  serverNow = '';
  currentUserId = '';
  clearRefreshTimer();
  useAuthStore.getState().clearAuth();
};

export const getAccessToken = () => accessToken;
export const getCurrentUserId = () => currentUserId;

export const baseHttpClient = axios.create({
  baseURL: API_BASE_URL,
});

export const cookieHttpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const refreshAccessToken = async () => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = cookieHttpClient
    .post<RefreshResponse>('/user/refresh', undefined, {
      headers: {
        'Content-Type': 'application/json',
      },
      _skipAuth: true,
    })
    .then((response) => {
      const nextToken = response.data.accessToken;
      setAuthSession({
        userId: response.data.userId,
        accessToken: response.data.accessToken,
        accessTokenExpiresAt: response.data.accessTokenExpiresAt,
        serverNow: response.data.serverNow,
      });
      const { user, setUser, setAuthenticated } = useAuthStore.getState();

      const profileImg = response.data.profileImg || response.data.profile_img;
      const mergedUser = response.data.userId
        ? {
            userId: response.data.userId,
            name: response.data.name || user?.name,
            email: response.data.email || user?.email,
            profileImg: profileImg || user?.profileImg,
          }
        : user;

      if (mergedUser) {
        setUser(mergedUser);
      } else if (user) {
        setAuthenticated(true);
      } else {
        setAuthenticated(true);
      }
      return nextToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
};

baseHttpClient.interceptors.request.use((config) => {
  if (config._skipAuth) {
    return config;
  }

  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

cookieHttpClient.interceptors.request.use((config) => {
  if (config._skipAuth) {
    return config;
  }

  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

baseHttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const shouldRetry =
      error.response?.status === 401 && !originalRequest._retry && !originalRequest._skipAuth;

    if (!shouldRetry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const nextToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return baseHttpClient(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      return Promise.reject(refreshError);
    }
  },
);

import { createAppStore } from './createAppStore';

export type AuthUser = {
  userId: string;
  rootFolder?: string;
  name?: string;
  email?: string;
  profileImg?: string;
};

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  clearAuth: () => void;
};

const AUTH_STORAGE_KEY = 'faddit-auth-store';

const loadPersistedAuth = () => {
  if (typeof window === 'undefined') {
    return {
      user: null as AuthUser | null,
      isAuthenticated: false,
    };
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return {
      user: null as AuthUser | null,
      isAuthenticated: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      user?: AuthUser | null;
      isAuthenticated?: boolean;
    };

    return {
      user: parsed.user || null,
      isAuthenticated: Boolean(parsed.isAuthenticated && parsed.user),
    };
  } catch {
    return {
      user: null as AuthUser | null,
      isAuthenticated: false,
    };
  }
};

const persistAuth = (payload: { user: AuthUser | null; isAuthenticated: boolean }) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
};

const initialAuth = loadPersistedAuth();

export const useAuthStore = createAppStore<AuthState>('auth-store', (set, get) => ({
  user: initialAuth.user,
  isAuthenticated: initialAuth.isAuthenticated,
  setAuthenticated: (isAuthenticated) => {
    const nextState = {
      user: get().user,
      isAuthenticated,
    };
    set({ isAuthenticated });
  },
  setUser: (user) => {
    const nextState = {
      user,
      isAuthenticated: Boolean(user),
    };
    set(nextState);
  },
  clearAuth: () => {
    set({ user: null, isAuthenticated: false });
  },
}));

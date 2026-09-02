import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'PROJECT_LEAD' | 'TEAM_MEMBER';
  memberType?: 'STUDENT' | 'EMPLOYEE';
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  youtubeUrl?: string;
  facebookUrl?: string;
  rawPassword?: string;
  mustChangePassword?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  fetchProfile: () => Promise<void>;
}

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const BASE_URL = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:3001/api/v1' : 'https://project-tracker-backend-303t.onrender.com/api/v1');

// Fast-Boot Cache: Read user and token immediately from localStorage to skip full-page loading screen
const getInitialUser = (): User | null => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialUser = getInitialUser();
const initialToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
const hasLoggedIn = typeof localStorage !== 'undefined' ? Boolean(localStorage.getItem('has_logged_in')) : false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  accessToken: initialToken,
  isAuthenticated: Boolean(initialUser && hasLoggedIn),
  // If user is already in fast-cache, don't block the UI with full-screen loader!
  isLoading: hasLoggedIn && !initialUser,

  setAuth: (user, accessToken) => {
    localStorage.setItem('has_logged_in', 'true');
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (accessToken) localStorage.setItem('auth_token', accessToken);
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    // Purge all credentials & temporary data from storage
    localStorage.removeItem('has_logged_in');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    sessionStorage.clear();

    try {
      await fetch(`${BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore logout fetch errors
    } finally {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshSession: async () => {
    if (!localStorage.getItem('has_logged_in')) {
      set({ isLoading: false });
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('has_logged_in');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_token');
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        }
        return false;
      }

      const data = await res.json();
      if (data.success && data.data?.accessToken) {
        const token = data.data.accessToken;
        const user = data.data.user || get().user;

        localStorage.setItem('auth_token', token);
        if (user) {
          localStorage.setItem('auth_user', JSON.stringify(user));
        }

        set({
          accessToken: token,
          user: user || get().user,
          isAuthenticated: true,
          isLoading: false,
        });

        // If user wasn't included in refresh response, fetch profile quietly in background
        if (!data.data.user && !get().user) {
          get().fetchProfile();
        }

        return true;
      }
      set({ isLoading: false });
      return false;
    } catch {
      // On network timeout/error, retain cached session so user is not kicked out offline
      set({ isLoading: false });
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  fetchProfile: async () => {
    const token = get().accessToken;
    if (!token) {
      set({ isLoading: false });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('auth_user', JSON.stringify(data.data));
          set({ user: data.data, isAuthenticated: true, isLoading: false });
        }
      }
    } catch {
      // Quiet background failure
    } finally {
      clearTimeout(timeoutId);
      set({ isLoading: false });
    }
  },
}));

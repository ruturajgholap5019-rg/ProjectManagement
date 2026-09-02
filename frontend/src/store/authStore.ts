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

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken) => {
    localStorage.setItem('has_logged_in', 'true');
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    localStorage.removeItem('has_logged_in');
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

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        localStorage.removeItem('has_logged_in');
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        return false;
      }

      const data = await res.json();
      if (data.success && data.data?.accessToken) {
        set({ accessToken: data.data.accessToken });
        await get().fetchProfile();
        return true;
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      return false;
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  fetchProfile: async () => {
    const token = get().accessToken;
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({ user: data.data, isAuthenticated: true, isLoading: false });
        }
      } else {
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

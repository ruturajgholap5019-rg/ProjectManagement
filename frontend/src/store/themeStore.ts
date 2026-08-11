import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const initialTheme = (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
document.documentElement.setAttribute('data-theme', initialTheme);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('app_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    set({ theme: nextTheme });
  },

  setTheme: (theme) => {
    localStorage.setItem('app_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));

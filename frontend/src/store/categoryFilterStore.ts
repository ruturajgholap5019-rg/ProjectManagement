import { create } from 'zustand';
import { apiFetch } from '../services/api';

export interface CategoryItem {
  id: string;
  code: string;
  name: string;
  icon: string;
  description?: string;
  sortOrder: number;
}

interface CategoryFilterState {
  selectedCategory: string;
  categories: CategoryItem[];
  isLoading: boolean;
  setSelectedCategory: (category: string) => void;
  fetchCategories: () => Promise<void>;
  createCategory: (data: { code: string; name: string; icon?: string; description?: string }) => Promise<void>;
  updateCategory: (id: string, data: { name?: string; icon?: string; description?: string; sortOrder?: number }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useCategoryFilterStore = create<CategoryFilterState>((set, get) => ({
  selectedCategory: '',
  categories: [],
  isLoading: false,
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  fetchCategories: async () => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<CategoryItem[]>('/categories');
      set({ categories: data || [] });
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      set({ isLoading: false });
    }
  },
  createCategory: async (payload) => {
    await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await get().fetchCategories();
  },
  updateCategory: async (id, payload) => {
    await apiFetch(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await get().fetchCategories();
  },
  deleteCategory: async (id) => {
    await apiFetch(`/categories/${id}`, {
      method: 'DELETE',
    });
    await get().fetchCategories();
  },
}));

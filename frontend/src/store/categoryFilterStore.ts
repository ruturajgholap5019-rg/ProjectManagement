import { create } from 'zustand';

export type ProjectCategoryType =
  | ''
  | 'WEBSITE_WEBAPP'
  | 'MOBILE_APP'
  | 'BMS'
  | 'UNIVERSITY_NEP'
  | 'DESIGN_SOCIAL_MEDIA'
  | 'PODCAST_MEDIA'
  | 'RESEARCH'
  | 'OTHER';

interface CategoryFilterState {
  selectedCategory: ProjectCategoryType;
  setSelectedCategory: (category: ProjectCategoryType) => void;
}

export const useCategoryFilterStore = create<CategoryFilterState>((set) => ({
  selectedCategory: '',
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
}));

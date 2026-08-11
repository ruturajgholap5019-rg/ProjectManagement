import { create } from 'zustand';

export type DateRangeType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

interface DateFilterState {
  rangeType: DateRangeType;
  startDate: string;
  endDate: string;
  setDateRange: (rangeType: DateRangeType, startDate?: string, endDate?: string) => void;
}

export const useDateFilterStore = create<DateFilterState>((set) => ({
  rangeType: 'all',
  startDate: '',
  endDate: '',
  setDateRange: (rangeType, startDate = '', endDate = '') => set({ rangeType, startDate, endDate }),
}));

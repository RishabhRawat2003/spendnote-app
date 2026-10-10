import { useCallback } from 'react';
import { create } from 'zustand';

import { MISC_CATEGORY_ID } from '@/data/defaultCategories';
import { api } from '@/lib/api';
import { reportSyncError } from '@/lib/syncErrors';
import type { Category } from '@/types';

import { useTransactions } from './useTransactions';

type CategoryValues = Pick<Category, 'name' | 'icon' | 'color'>;

interface CategoriesState {
  categories: Category[];
  setAll: (categories: Category[]) => void;
  /** Saves on the server first, so the category gets its real id. */
  add: (category: CategoryValues) => Promise<string>;
  update: (id: string, patch: Partial<CategoryValues>) => void;
  /** Moves the category's transactions to Misc, then deletes it. Misc itself can't be removed. */
  remove: (id: string) => void;
}

export const useCategories = create<CategoriesState>((set, get) => ({
  categories: [],

  setAll: (categories) => set({ categories }),

  add: async (values) => {
    const created = await api.categories.create(values);
    set((state) => ({ categories: [...state.categories, created] }));
    return created.id;
  },

  update: (id, patch) => {
    const previous = get().categories;
    set({ categories: previous.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
    api.categories.update(id, patch).catch((err) => {
      set({ categories: previous });
      reportSyncError(err, 'Couldn’t save the category');
    });
  },

  remove: (id) => {
    if (id === MISC_CATEGORY_ID) return;
    useTransactions.getState().reassignCategory(id, MISC_CATEGORY_ID);
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
    api.categories.remove(id).catch((err) => {
      reportSyncError(err, 'Couldn’t delete the category');
      useTransactions.getState().onConflict();
    });
  },
}));

export function useCategoryLookup() {
  const categories = useCategories((state) => state.categories);
  return useCallback(
    (id: string | null | undefined): Category | undefined => categories.find((c) => c.id === id),
    [categories],
  );
}

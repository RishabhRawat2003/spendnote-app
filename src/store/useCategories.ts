import { useCallback } from 'react';
import { create } from 'zustand';

import { DEFAULT_CATEGORIES, MISC_CATEGORY_ID } from '@/data/defaultCategories';
import { createId } from '@/lib/id';
import type { Category } from '@/types';

import { useTransactions } from './useTransactions';

interface CategoriesState {
  categories: Category[];
  add: (category: Omit<Category, 'id' | 'isDefault'>) => string;
  update: (id: string, patch: Partial<Omit<Category, 'id' | 'isDefault'>>) => void;
  /** Moves the category's transactions to Misc, then deletes it. Misc itself can't be removed. */
  remove: (id: string) => void;
}

export const useCategories = create<CategoriesState>((set) => ({
  categories: DEFAULT_CATEGORIES,

  add: (category) => {
    const id = createId('c');
    set((state) => ({ categories: [...state.categories, { ...category, id, isDefault: false }] }));
    return id;
  },

  update: (id, patch) =>
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  remove: (id) => {
    if (id === MISC_CATEGORY_ID) return;
    useTransactions.getState().reassignCategory(id, MISC_CATEGORY_ID);
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
  },
}));

export function useCategoryLookup() {
  const categories = useCategories((state) => state.categories);
  return useCallback(
    (id: string | null | undefined): Category | undefined => categories.find((c) => c.id === id),
    [categories],
  );
}

import { create } from 'zustand';

import { generateMockTransactions } from '@/data/mockTransactions';
import { createId } from '@/lib/id';
import type { NewTransaction, Transaction } from '@/types';

interface TransactionsState {
  transactions: Transaction[];
  add: (tx: NewTransaction) => string;
  update: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  remove: (id: string) => void;
  reassignCategory: (fromCategoryId: string, toCategoryId: string) => void;
}

export const useTransactions = create<TransactionsState>((set) => ({
  transactions: generateMockTransactions(),

  add: (tx) => {
    const id = createId('t');
    set((state) => ({
      transactions: [{ ...tx, id }, ...state.transactions].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    return id;
  },

  update: (id, patch) =>
    set((state) => {
      const transactions = state.transactions.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx));
      if (patch.date) transactions.sort((a, b) => b.date.localeCompare(a.date));
      return { transactions };
    }),

  remove: (id) => set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== id) })),

  reassignCategory: (fromCategoryId, toCategoryId) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.categoryId === fromCategoryId ? { ...tx, categoryId: toCategoryId } : tx,
      ),
    })),
}));

export function useTransaction(id: string | undefined): Transaction | undefined {
  return useTransactions((state) => state.transactions.find((tx) => tx.id === id));
}

import { create } from 'zustand';

import { api, type DetectedInput, type TransactionInput, type TransactionPatch } from '@/lib/api';
import { reportSyncError } from '@/lib/syncErrors';
import type { Transaction } from '@/types';

interface TransactionsState {
  transactions: Transaction[];
  setAll: (transactions: Transaction[]) => void;
  /** Saves on the server first, so the transaction gets its real id. */
  add: (tx: TransactionInput) => Promise<string>;
  /** Saves auto-detected payments. The server skips duplicates. Returns how many were added. */
  addDetected: (txs: DetectedInput[]) => Promise<number>;
  /** Applies locally at once; rapid edits (like typing a note) are batched into one request. */
  update: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  remove: (id: string) => void;
  /** Local-only mirror of the server moving a deleted category's transactions to another one. */
  reassignCategory: (fromCategoryId: string, toCategoryId: string) => void;
  /** Called when a save fails, to re-fetch the server's copy. Set by the sync layer. */
  onConflict: () => void;
}

const sortByDate = (txs: Transaction[]) => txs.sort((a, b) => b.date.localeCompare(a.date));

const SAVE_DELAY_MS = 600;
const pendingPatches = new Map<string, TransactionPatch>();
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** `undefined` means "clear" in the app, but JSON drops undefined, so send null instead. */
function toPatch(patch: Partial<Omit<Transaction, 'id'>>): TransactionPatch {
  const out: TransactionPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    (out as Record<string, unknown>)[key] = value === undefined ? null : value;
  }
  return out;
}

export const useTransactions = create<TransactionsState>((set, get) => {
  const flush = (id: string) => {
    const patch = pendingPatches.get(id);
    pendingPatches.delete(id);
    pendingTimers.delete(id);
    if (!patch) return;
    api.transactions.update(id, patch).catch((err) => {
      reportSyncError(err, 'Couldn’t save your change');
      get().onConflict();
    });
  };

  return {
    transactions: [],
    onConflict: () => {},

    setAll: (transactions) => set({ transactions: sortByDate([...transactions]) }),

    add: async (input) => {
      const created = await api.transactions.create(input);
      set((state) => ({ transactions: sortByDate([created, ...state.transactions]) }));
      return created.id;
    },

    addDetected: async (inputs) => {
      const { transactions: created, updated = [] } = await api.transactions.saveDetected(inputs);
      if (created.length > 0 || updated.length > 0) {
        // `updated` are earlier payments the server recognised as the other side of a transfer.
        const replacements = new Map(updated.map((tx) => [tx.id, tx]));
        set((state) => {
          const known = new Set(state.transactions.map((tx) => tx.id));
          const fresh = created.filter((tx) => !known.has(tx.id));
          const existing = state.transactions.map((tx) => replacements.get(tx.id) ?? tx);
          return { transactions: sortByDate([...fresh, ...existing]) };
        });
      }
      return created.length;
    },

    update: (id, patch) => {
      set((state) => {
        const transactions = state.transactions.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx));
        if (patch.date) sortByDate(transactions);
        return { transactions };
      });
      pendingPatches.set(id, { ...pendingPatches.get(id), ...toPatch(patch) });
      const timer = pendingTimers.get(id);
      if (timer) clearTimeout(timer);
      pendingTimers.set(id, setTimeout(() => flush(id), SAVE_DELAY_MS));
    },

    remove: (id) => {
      const timer = pendingTimers.get(id);
      if (timer) clearTimeout(timer);
      pendingTimers.delete(id);
      pendingPatches.delete(id);
      set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== id) }));
      api.transactions.remove(id).catch((err) => {
        reportSyncError(err, 'Couldn’t delete the transaction');
        get().onConflict();
      });
    },

    reassignCategory: (fromCategoryId, toCategoryId) =>
      set((state) => ({
        transactions: state.transactions.map((tx) =>
          tx.categoryId === fromCategoryId ? { ...tx, categoryId: toCategoryId } : tx,
        ),
      })),
  };
});

export function useTransaction(id: string | undefined): Transaction | undefined {
  return useTransactions((state) => state.transactions.find((tx) => tx.id === id));
}

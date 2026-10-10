import { create } from 'zustand';

import { useCategories } from '@/store/useCategories';
import { useSettings } from '@/store/useSettings';
import { useTransactions } from '@/store/useTransactions';

import { api, errorMessage } from './api';

type SyncStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SyncState {
  status: SyncStatus;
  error: string | null;
}

/** Whether the user's data has been loaded from the server. */
export const useSync = create<SyncState>(() => ({ status: 'idle', error: null }));

let inFlight: Promise<void> | null = null;

/** Loads settings, categories and transactions from the server. Concurrent calls share one request. */
export function loadUserData(): Promise<void> {
  inFlight ??= (async () => {
    useSync.setState((s) => ({ status: s.status === 'ready' ? 'ready' : 'loading', error: null }));
    try {
      const [me, categories, transactions] = await Promise.all([
        api.me(),
        api.categories.list(),
        api.transactions.listAll(),
      ]);
      useSettings.getState().hydrate(me.settings);
      useCategories.getState().setAll(categories);
      useTransactions.getState().setAll(transactions);
      useSync.setState({ status: 'ready', error: null });
    } catch (err) {
      useSync.setState((s) => ({ status: s.status === 'ready' ? 'ready' : 'error', error: errorMessage(err) }));
      throw err;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function clearUserData() {
  useTransactions.getState().setAll([]);
  useCategories.getState().setAll([]);
  useSettings.getState().reset();
  useSync.setState({ status: 'idle', error: null });
}

useTransactions.setState({ onConflict: () => void loadUserData().catch(() => {}) });

import { create } from 'zustand';

import { useAccounts } from '@/store/useAccounts';
import { useCategories } from '@/store/useCategories';
import { useSettings } from '@/store/useSettings';
import { useTransactions } from '@/store/useTransactions';

import { api, errorMessage } from './api';
import { migrateTransactionsToAccounts } from './migrateAccounts';

type SyncStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SyncState {
  status: SyncStatus;
  error: string | null;
}

/** Whether the user's data has been loaded from the server. */
export const useSync = create<SyncState>(() => ({ status: 'idle', error: null }));

let inFlight: Promise<void> | null = null;

/** Loads settings, accounts, categories and transactions from the server. Concurrent calls share one request. */
export function loadUserData(): Promise<void> {
  inFlight ??= (async () => {
    useSync.setState((s) => ({ status: s.status === 'ready' ? 'ready' : 'loading', error: null }));
    const knownBefore = new Set(useTransactions.getState().transactions.map((tx) => tx.id));
    try {
      const [me, accounts, categories, transactions] = await Promise.all([
        api.me(),
        api.accounts.list(),
        api.categories.list(),
        api.transactions.listAll(),
      ]);
      useSettings.getState().hydrate(me.settings);
      useAccounts.getState().setAll(accounts);
      useCategories.getState().setAll(categories);
      // Payments detected (or expenses added) while this request was in flight aren't in the response yet.
      const fetched = new Set(transactions.map((tx) => tx.id));
      const addedMeanwhile = useTransactions
        .getState()
        .transactions.filter((tx) => !knownBefore.has(tx.id) && !fetched.has(tx.id));
      useTransactions.getState().setAll([...addedMeanwhile, ...transactions]);

      // Assign accounts to legacy rows in the background so balances become honest.
      void migrateTransactionsToAccounts(accounts, [...addedMeanwhile, ...transactions], (id, accountId) => {
        useTransactions.setState((state) => ({
          transactions: state.transactions.map((tx) => (tx.id === id ? { ...tx, accountId } : tx)),
        }));
      });

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
  useAccounts.getState().setAll([]);
  useSettings.getState().reset();
  useSync.setState({ status: 'idle', error: null });
}

useTransactions.setState({ onConflict: () => void loadUserData().catch(() => {}) });

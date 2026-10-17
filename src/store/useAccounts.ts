import { useCallback } from 'react';
import { create } from 'zustand';

import { api } from '@/lib/api';
import { reportSyncError } from '@/lib/syncErrors';
import type { Account, AccountInstitution, AccountKind } from '@/types';

export type AccountInput = {
  name: string;
  kind: AccountKind;
  institution: AccountInstitution;
  last4?: string;
  openingBalance: number;
  openingDate: string;
  key?: string;
};

type AccountPatch = Partial<
  Pick<Account, 'name' | 'kind' | 'institution' | 'last4' | 'openingBalance' | 'openingDate' | 'archived'>
>;

interface AccountsState {
  accounts: Account[];
  setAll: (accounts: Account[]) => void;
  add: (input: AccountInput) => Promise<string>;
  update: (id: string, patch: AccountPatch) => void;
  remove: (id: string) => void;
}

export const useAccounts = create<AccountsState>((set, get) => ({
  accounts: [],

  setAll: (accounts) => set({ accounts }),

  add: async (input) => {
    const created = await api.accounts.create(input);
    set((state) => ({ accounts: [...state.accounts, created] }));
    return created.id;
  },

  update: (id, patch) => {
    const previous = get().accounts;
    set({ accounts: previous.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
    api.accounts.update(id, patch).catch((err) => {
      set({ accounts: previous });
      reportSyncError(err, 'Couldn’t save the account');
    });
  },

  remove: (id) => {
    const previous = get().accounts;
    set({ accounts: previous.filter((a) => a.id !== id) });
    api.accounts.remove(id).catch((err) => {
      set({ accounts: previous });
      reportSyncError(err, 'Couldn’t delete the account');
    });
  },
}));

export function useAccountLookup() {
  const accounts = useAccounts((state) => state.accounts);
  return useCallback(
    (id: string | null | undefined): Account | undefined => accounts.find((a) => a.id === id),
    [accounts],
  );
}

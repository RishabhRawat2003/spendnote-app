import { api } from '@/lib/api';
import { resolveAccountId } from '@/lib/resolveAccount';
import type { Account, Transaction } from '@/types';

/**
 * One-time: assign accountId to legacy transactions from their payment source.
 * Runs quietly after sync when accounts exist; safe to call repeatedly.
 */
export async function migrateTransactionsToAccounts(
  accounts: Account[],
  transactions: Transaction[],
  applyLocal: (id: string, accountId: string) => void,
): Promise<number> {
  if (accounts.length === 0) return 0;
  const missing = transactions.filter((tx) => !tx.accountId);
  if (missing.length === 0) return 0;

  let migrated = 0;
  for (const tx of missing) {
    const accountId = resolveAccountId(accounts, tx.source);
    if (!accountId) continue;
    applyLocal(tx.id, accountId);
    try {
      await api.transactions.update(tx.id, { accountId });
      migrated++;
    } catch {
      // Leave local assignment; next sync/conflict will reconcile.
    }
  }
  return migrated;
}

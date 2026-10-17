import { defaultAccountIdForSource } from '@/data/accounts';
import type { Account, Source } from '@/types';

/**
 * Maps a detected payment (source + optional last4 from SMS) to the user's account.
 * Prefers exact last4 match within the institution, then sole account for that institution,
 * then Primary / slice savings / slice card by kind.
 */
export function resolveAccountId(
  accounts: Account[],
  source: Source,
  last4?: string | null,
): string | null {
  if (accounts.length === 0) return null;

  const institution =
    source === 'canara'
      ? 'canara'
      : source === 'slice_card' || source === 'slice_account'
        ? 'slice'
        : null;

  const pool = institution ? accounts.filter((a) => a.institution === institution) : accounts;

  if (last4) {
    const byLast4 = pool.find((a) => a.last4 === last4);
    if (byLast4) return byLast4.id;
  }

  if (source === 'slice_card') {
    const card = pool.find((a) => a.kind === 'credit') ?? accounts.find((a) => a.id === 'slice_card');
    if (card) return card.id;
  }

  if (source === 'slice_account') {
    const savings = pool.find((a) => a.kind === 'bank') ?? accounts.find((a) => a.id === 'slice_savings');
    if (savings) return savings.id;
  }

  if (source === 'canara') {
    if (pool.length === 1) return pool[0].id;
    const primary = pool.find((a) => a.id === 'canara_primary') ?? pool[0];
    if (primary) return primary.id;
  }

  if (pool.length === 1) return pool[0].id;

  return defaultAccountIdForSource(source, new Set(accounts.map((a) => a.id)));
}

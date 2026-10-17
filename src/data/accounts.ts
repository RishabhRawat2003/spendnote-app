import type { AccountInstitution, AccountKind, IconName, Source } from '@/types';

export interface SuggestedAccount {
  key: string;
  name: string;
  kind: AccountKind;
  institution: AccountInstitution;
  icon: IconName;
  color: string;
  /** Hint shown under the name in the setup wizard. */
  hint: string;
}

/** Pre-suggested accounts for first-run setup. */
export const SUGGESTED_ACCOUNTS: SuggestedAccount[] = [
  {
    key: 'canara_primary',
    name: 'Canara Primary',
    kind: 'bank',
    institution: 'canara',
    icon: 'business-outline',
    color: '#0284C7',
    hint: 'Your main Canara account',
  },
  {
    key: 'canara_savings',
    name: 'Canara Savings',
    kind: 'bank',
    institution: 'canara',
    icon: 'wallet-outline',
    color: '#0EA5E9',
    hint: 'Second Canara account',
  },
  {
    key: 'slice_savings',
    name: 'slice Savings',
    kind: 'bank',
    institution: 'slice',
    icon: 'albums-outline',
    color: '#A855F7',
    hint: 'slice savings / UPI balance',
  },
  {
    key: 'slice_card',
    name: 'slice Card',
    kind: 'credit',
    institution: 'slice',
    icon: 'card-outline',
    color: '#7C3AED',
    hint: 'Credit card — enter amount owed',
  },
];

const ACCOUNT_COLORS: Record<string, string> = Object.fromEntries(
  SUGGESTED_ACCOUNTS.map((a) => [a.key, a.color]),
);

export function accountColor(id: string, institution?: AccountInstitution): string {
  if (ACCOUNT_COLORS[id]) return ACCOUNT_COLORS[id];
  if (institution === 'canara') return '#0284C7';
  if (institution === 'slice') return '#A855F7';
  return '#64748B';
}

export function accountIcon(kind: AccountKind, institution: AccountInstitution): IconName {
  if (kind === 'credit') return 'card-outline';
  if (institution === 'canara') return 'business-outline';
  if (institution === 'slice') return 'albums-outline';
  return 'wallet-outline';
}

/**
 * Best-guess account for a payment source when migrating old transactions
 * or when detection didn't include last4.
 */
export function defaultAccountIdForSource(source: Source, accountIds: Set<string>): string | null {
  const pick = (...keys: string[]) => keys.find((k) => accountIds.has(k)) ?? null;

  switch (source) {
    case 'canara':
      return pick('canara_primary', 'canara_savings') ?? firstMatching(accountIds, 'canara');
    case 'slice_account':
      return pick('slice_savings') ?? firstMatching(accountIds, 'slice', 'bank');
    case 'slice_card':
      return pick('slice_card') ?? firstMatching(accountIds, 'slice', 'credit');
    case 'gpay':
    case 'phonepe':
    case 'paytm':
    case 'bhim':
      return pick('canara_primary', 'slice_savings') ?? firstMatching(accountIds, 'canara') ?? [...accountIds][0] ?? null;
    case 'cash':
      return null;
    default:
      return [...accountIds][0] ?? null;
  }
}

function firstMatching(ids: Set<string>, ...parts: string[]): string | null {
  for (const id of ids) {
    if (parts.every((p) => id.includes(p))) return id;
  }
  return null;
}

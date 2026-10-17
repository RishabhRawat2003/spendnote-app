import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type Source =
  | 'gpay'
  | 'phonepe'
  | 'paytm'
  | 'bhim'
  | 'slice_card'
  | 'slice_account'
  | 'canara'
  | 'cash';

export type TransactionType = 'debit' | 'credit';

export type WorthIt = 'yes' | 'no' | null;

export type AccountKind = 'bank' | 'credit';
export type AccountInstitution = 'canara' | 'slice' | 'other';

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  institution: AccountInstitution;
  /** Last 4 digits for SMS matching. */
  last4?: string;
  /** Opening balance in paise. For credit cards: amount currently owed. */
  openingBalance: number;
  /** Balances only include transactions on or after this date. */
  openingDate: string;
  archived: boolean;
}

export interface Transaction {
  id: string;
  /** Amount in paise, always positive. `type` decides the direction. */
  amount: number;
  type: TransactionType;
  merchant: string;
  upiId?: string;
  source: Source;
  /** ISO timestamp */
  date: string;
  /** null means untagged */
  categoryId: string | null;
  /** Account where the money moved. Null for legacy rows until migrated. */
  accountId?: string | null;
  note?: string;
  worthIt?: WorthIt;
  tags: string[];
  /** Money moved between the user's own accounts (self transfer, card bill). Not spending or income. */
  isTransfer?: boolean;
}

export type NewTransaction = Omit<Transaction, 'id'>;

export interface Category {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  isDefault: boolean;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePreference;
  /** In paise. Payments below this are never asked about. */
  minPromptAmount: number;
  /** Capture payments from GPay/PhonePe/etc. notifications (Android build only). */
  autoDetect: boolean;
}

export type DateRange = 'all' | '7d' | '30d' | 'thisMonth' | 'lastMonth';

export interface TransactionFilters {
  query: string;
  categoryIds: string[];
  sources: Source[];
  type: 'all' | TransactionType;
  range: DateRange;
}

export interface SourceInfo {
  id: Source;
  label: string;
  icon: IconName;
  color: string;
}

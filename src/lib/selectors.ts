import { startOfMonth, subMonths } from 'date-fns';

import type { Transaction, TransactionFilters } from '@/types';

import { dayKey, dayLabel, isInMonth, isInRange, monthKey } from './dates';

export const UNTAGGED_KEY = 'untagged';

export interface DaySection {
  key: string;
  title: string;
  /** Paise spent that day (debits only) */
  spent: number;
  data: Transaction[];
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
  count: number;
}

export interface MonthPoint {
  month: Date;
  spent: number;
  income: number;
}

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
}

export const EMPTY_FILTERS: TransactionFilters = {
  query: '',
  categoryIds: [],
  sources: [],
  type: 'all',
  range: 'all',
};

export function sortByDateDesc(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => b.date.localeCompare(a.date));
}

export function monthTotals(txs: Transaction[], month: Date) {
  let spent = 0;
  let income = 0;
  for (const tx of txs) {
    if (!isInMonth(tx.date, month)) continue;
    if (tx.type === 'debit') spent += tx.amount;
    else income += tx.amount;
  }
  return { spent, income };
}

export function spendByCategory(txs: Transaction[], month: Date): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const tx of txs) {
    if (tx.type !== 'debit' || !isInMonth(tx.date, month)) continue;
    const key = tx.categoryId ?? UNTAGGED_KEY;
    const entry = map.get(key) ?? { categoryId: key, total: 0, count: 0 };
    entry.total += tx.amount;
    entry.count += 1;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Untagged debits the user would actually be asked about, newest first. */
export function untaggedTransactions(txs: Transaction[], minPromptAmount: number): Transaction[] {
  return sortByDateDesc(
    txs.filter((tx) => tx.type === 'debit' && tx.categoryId === null && tx.amount >= minPromptAmount),
  );
}

export function filterTransactions(
  txs: Transaction[],
  filters: TransactionFilters,
  categoryName: (id: string | null) => string,
): Transaction[] {
  const query = filters.query.trim().toLowerCase();
  return txs.filter((tx) => {
    if (filters.type !== 'all' && tx.type !== filters.type) return false;
    if (filters.sources.length && !filters.sources.includes(tx.source)) return false;
    if (filters.categoryIds.length && !filters.categoryIds.includes(tx.categoryId ?? UNTAGGED_KEY)) return false;
    if (!isInRange(tx.date, filters.range)) return false;
    if (query) {
      const haystack = [tx.merchant, tx.note, tx.upiId, categoryName(tx.categoryId), ...tx.tags]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function groupByDay(txs: Transaction[]): DaySection[] {
  const sections: DaySection[] = [];
  const byKey = new Map<string, DaySection>();
  for (const tx of sortByDateDesc(txs)) {
    const key = dayKey(tx.date);
    let section = byKey.get(key);
    if (!section) {
      section = { key, title: dayLabel(tx.date), spent: 0, data: [] };
      byKey.set(key, section);
      sections.push(section);
    }
    section.data.push(tx);
    if (tx.type === 'debit') section.spent += tx.amount;
  }
  return sections;
}

export function topMerchants(txs: Transaction[], month: Date, limit = 5): MerchantTotal[] {
  const map = new Map<string, MerchantTotal>();
  for (const tx of txs) {
    if (tx.type !== 'debit' || !isInMonth(tx.date, month)) continue;
    const entry = map.get(tx.merchant) ?? { merchant: tx.merchant, total: 0, count: 0 };
    entry.total += tx.amount;
    entry.count += 1;
    map.set(tx.merchant, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export function monthlySeries(txs: Transaction[], months = 6, now: Date = new Date()): MonthPoint[] {
  const points: MonthPoint[] = [];
  const byKey = new Map<string, MonthPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const month = startOfMonth(subMonths(now, i));
    const point = { month, spent: 0, income: 0 };
    points.push(point);
    byKey.set(monthKey(month), point);
  }
  for (const tx of txs) {
    const point = byKey.get(monthKey(tx.date));
    if (!point) continue;
    if (tx.type === 'debit') point.spent += tx.amount;
    else point.income += tx.amount;
  }
  return points;
}

export function worthItSplit(txs: Transaction[], month: Date) {
  const result = {
    yes: { total: 0, count: 0 },
    no: { total: 0, count: 0 },
    unrated: { total: 0, count: 0 },
  };
  for (const tx of txs) {
    if (tx.type !== 'debit' || !isInMonth(tx.date, month)) continue;
    const bucket = tx.worthIt === 'yes' ? result.yes : tx.worthIt === 'no' ? result.no : result.unrated;
    bucket.total += tx.amount;
    bucket.count += 1;
  }
  return result;
}

/** Months that contain at least one transaction, newest first. */
export function availableMonths(txs: Transaction[], now: Date = new Date()): Date[] {
  const keys = new Set(txs.map((tx) => monthKey(tx.date)));
  keys.add(monthKey(now));
  return [...keys]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const [y, m] = key.split('-').map(Number);
      return new Date(y, m - 1, 1);
    });
}

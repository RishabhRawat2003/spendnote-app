import {
  endOfMonth,
  format,
  isSameMonth,
  isSameYear,
  isToday,
  isWithinInterval,
  isYesterday,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';

import type { DateRange } from '@/types';

export function dayKey(date: Date | string): string {
  return format(new Date(date), 'yyyy-MM-dd');
}

export function monthKey(date: Date | string): string {
  return format(new Date(date), 'yyyy-MM');
}

/** "Today", "Yesterday", "Mon, 6 Oct" or "Mon, 6 Oct 2025" */
export function dayLabel(date: Date | string, now: Date = new Date()): string {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, isSameYear(d, now) ? 'EEE, d MMM' : 'EEE, d MMM yyyy');
}

export function timeLabel(date: Date | string): string {
  return format(new Date(date), 'h:mm a');
}

export function fullDateTimeLabel(date: Date | string): string {
  return format(new Date(date), "EEE, d MMM yyyy 'at' h:mm a");
}

export function monthLabel(date: Date | string, short = false): string {
  return format(new Date(date), short ? 'MMM' : 'MMMM yyyy');
}

export function isInMonth(date: Date | string, month: Date): boolean {
  return isSameMonth(new Date(date), month);
}

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'All time',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  thisMonth: 'This month',
  lastMonth: 'Last month',
};

export function isInRange(date: Date | string, range: DateRange, now: Date = new Date()): boolean {
  if (range === 'all') return true;
  const d = new Date(date);
  switch (range) {
    case '7d':
      return d >= startOfDay(subDays(now, 6));
    case '30d':
      return d >= startOfDay(subDays(now, 29));
    case 'thisMonth':
      return isSameMonth(d, now);
    case 'lastMonth': {
      const last = subMonths(now, 1);
      return isWithinInterval(d, { start: startOfMonth(last), end: endOfMonth(last) });
    }
  }
}

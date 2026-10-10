import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SOURCES } from '@/data/sources';
import { dayLabel, timeLabel } from '@/lib/dates';
import { useCategoryLookup } from '@/store/useCategories';
import type { Transaction } from '@/types';

import { AmountText } from './AmountText';
import { CategoryIcon } from './CategoryIcon';

interface TransactionRowProps {
  transaction: Transaction;
  /** Show the date as well as the time (for lists that aren't grouped by day) */
  showDate?: boolean;
}

export const TransactionRow = memo(function TransactionRow({ transaction: tx, showDate }: TransactionRowProps) {
  const getCategory = useCategoryLookup();
  const category = getCategory(tx.categoryId);
  const when = showDate ? `${dayLabel(tx.date)}, ${timeLabel(tx.date)}` : timeLabel(tx.date);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
      className="flex-row items-center px-4 py-3 active:bg-slate-100 dark:active:bg-white/5">
      <CategoryIcon category={category} />
      <View className="ml-3 flex-1">
        <Text numberOfLines={1} className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
          {tx.merchant}
        </Text>
        <View className="mt-0.5 flex-row items-center">
          {category ? (
            <Text numberOfLines={1} className="shrink text-xs text-slate-500 dark:text-slate-400">
              {category.name}
            </Text>
          ) : (
            <Text className="text-xs font-semibold text-amber-600 dark:text-amber-400">Untagged</Text>
          )}
          <Text numberOfLines={1} className="shrink text-xs text-slate-400 dark:text-slate-500">
            {` · ${SOURCES[tx.source].label} · ${when}`}
          </Text>
        </View>
        {tx.note ? (
          <Text numberOfLines={1} className="mt-0.5 text-xs italic text-slate-500 dark:text-slate-400">
            {tx.note}
          </Text>
        ) : null}
      </View>
      <View className="ml-3 items-end">
        <AmountText amount={tx.amount} type={tx.type} signed className="text-[15px]" />
        {tx.worthIt ? (
          <Text className="mt-0.5 text-xs">{tx.worthIt === 'yes' ? '👍' : '👎'}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

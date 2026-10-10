import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, Text, TextInput, View } from 'react-native';

import { DateSectionHeader } from '@/components/DateSectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { FilterBar } from '@/components/FilterBar';
import { Screen, ScreenTitle } from '@/components/Screen';
import { useTabBarSpace } from '@/components/TabBar';
import { TransactionRow } from '@/components/TransactionRow';
import { formatCurrency } from '@/lib/formatCurrency';
import { EMPTY_FILTERS, filterTransactions, groupByDay } from '@/lib/selectors';
import { useAppColors } from '@/lib/theme';
import { usePullToRefresh } from '@/lib/usePullToRefresh';
import { useCategoryLookup } from '@/store/useCategories';
import { useTransactions } from '@/store/useTransactions';
import type { DateRange, Transaction, TransactionFilters } from '@/types';

export default function TransactionsScreen() {
  const params = useLocalSearchParams<{ category?: string; range?: DateRange }>();
  const tabBarSpace = useTabBarSpace();
  const transactions = useTransactions((s) => s.transactions);
  const getCategory = useCategoryLookup();
  const colors = useAppColors();
  const paramsKey = params.category ? `${params.category}|${params.range ?? 'all'}` : null;
  const filtersFromParams = (): TransactionFilters =>
    params.category
      ? { ...EMPTY_FILTERS, categoryIds: [params.category], range: params.range ?? 'all' }
      : EMPTY_FILTERS;
  const [filters, setFilters] = useState<TransactionFilters>(filtersFromParams);
  const [appliedParamsKey, setAppliedParamsKey] = useState(paramsKey);

  if (paramsKey !== appliedParamsKey) {
    setAppliedParamsKey(paramsKey);
    if (paramsKey) setFilters(filtersFromParams());
  }

  const filtered = useMemo(
    () => filterTransactions(transactions, filters, (id) => getCategory(id)?.name ?? 'untagged'),
    [transactions, filters, getCategory],
  );
  const { refreshKey, refreshControlProps } = usePullToRefresh();
  // refreshKey: regroup after a pull so "Today" / "Yesterday" labels stay correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sections = useMemo(() => groupByDay(filtered), [filtered, refreshKey]);
  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, tx) => {
          if (tx.type === 'debit') acc.spent += tx.amount;
          else acc.received += tx.amount;
          return acc;
        },
        { spent: 0, received: 0 },
      ),
    [filtered],
  );

  const renderItem = useCallback(({ item }: { item: Transaction }) => <TransactionRow transaction={item} />, []);

  return (
    <Screen safeTop>
      <ScreenTitle title="Transactions" />

      <View className="mx-5 mb-3 flex-row items-center rounded-xl border border-slate-200 bg-card-light px-3 dark:border-white/10 dark:bg-card-dark">
        <Ionicons name="search" size={18} color={colors.subtle} />
        <TextInput
          value={filters.query}
          onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
          placeholder="Search merchant, note, tag…"
          placeholderTextColor={colors.subtle}
          className="ml-2 flex-1 py-2.5 text-base text-slate-900 dark:text-slate-50"
          returnKeyType="search"
          autoCorrect={false}
        />
        {filters.query ? (
          <Pressable onPress={() => setFilters((f) => ({ ...f, query: '' }))} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>

      <View>
        <FilterBar filters={filters} onChange={setFilters} />
      </View>

      <Text className="px-5 pb-1 text-xs text-slate-500 dark:text-slate-400">
        {filtered.length} transactions · Spent {formatCurrency(totals.spent)}
        {totals.received > 0 ? ` · Received ${formatCurrency(totals.received)}` : ''}
      </Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => <DateSectionHeader title={section.title} spent={section.spent} />}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl {...refreshControlProps} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: tabBarSpace + 88 }}
        initialNumToRender={20}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="Nothing matches"
            message="Try a different search or clear the filters."
            action={{ label: 'Clear filters', onPress: () => setFilters(EMPTY_FILTERS) }}
          />
        }
      />
      <Fab />
    </Screen>
  );
}

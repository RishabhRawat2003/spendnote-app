import Ionicons from '@expo/vector-icons/Ionicons';
import { format, getDate, subMonths } from 'date-fns';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card, SectionTitle } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { Screen, ScreenTitle } from '@/components/Screen';
import { SummaryCard } from '@/components/SummaryCard';
import { SyncBanner } from '@/components/SyncBanner';
import { useTabBarSpace } from '@/components/TabBar';
import { TransactionRow } from '@/components/TransactionRow';
import { accountColor, accountIcon } from '@/data/accounts';
import { formatCurrency } from '@/lib/formatCurrency';
import { isInMonth, monthLabel } from '@/lib/dates';
import { usePullToRefresh } from '@/lib/usePullToRefresh';
import {
  accountBalances,
  monthTotals,
  netWorth,
  spendByCategory,
  UNTAGGED_KEY,
  untaggedTransactions,
} from '@/lib/selectors';
import { useAccounts } from '@/store/useAccounts';
import { useAuth } from '@/store/useAuth';
import { useCategoryLookup } from '@/store/useCategories';
import { useSettings } from '@/store/useSettings';
import { useTransactions } from '@/store/useTransactions';

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const tabBarSpace = useTabBarSpace();
  const transactions = useTransactions((s) => s.transactions);
  const accounts = useAccounts((s) => s.accounts);
  const minPromptAmount = useSettings((s) => s.minPromptAmount);
  const getCategory = useCategoryLookup();
  const firstName = useAuth((s) => s.user?.name.split(' ')[0]);
  const { refreshKey, refreshControlProps } = usePullToRefresh();
  const now = new Date();

  const { totals, previousSpent, topCategories, untagged, balances, worth } = useMemo(() => {
    const today = new Date();
    const lastMonth = subMonths(today, 1);
    const dayOfMonth = getDate(today);
    const previousSpent = transactions
      .filter((tx) => tx.type === 'debit' && !tx.isTransfer && isInMonth(tx.date, lastMonth) && getDate(new Date(tx.date)) <= dayOfMonth)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const balances = accountBalances(accounts, transactions);

    return {
      totals: monthTotals(transactions, today),
      previousSpent,
      topCategories: spendByCategory(transactions, today).slice(0, 5),
      untagged: untaggedTransactions(transactions, minPromptAmount),
      balances,
      worth: netWorth(balances),
    };
    // refreshKey: recompute "this month" after a pull, e.g. when the month has rolled over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, accounts, minPromptAmount, refreshKey]);

  const recent = transactions.slice(0, 5);
  const untaggedTotal = untagged.reduce((sum, tx) => sum + tx.amount, 0);
  const maxCategory = topCategories[0]?.total ?? 0;

  return (
    <Screen safeTop>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarSpace + 88 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl {...refreshControlProps} />}>
        <ScreenTitle
          title={firstName ? `${greeting(now)}, ${firstName}` : greeting(now)}
          subtitle={format(now, 'EEEE, d MMMM')}
        />
        <SyncBanner />

        <View className="px-4">
          <SummaryCard
            monthName={monthLabel(now).split(' ')[0]}
            spent={totals.spent}
            income={totals.income}
            previousSpent={previousSpent}
          />

          {accounts.length === 0 ? (
            <Card
              className="mt-4 flex-row items-center border-sky-300/60 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10"
              onPress={() => router.push({ pathname: '/accounts', params: { setup: '1' } })}>
              <View className="h-11 w-11 items-center justify-center rounded-full bg-sky-400/25">
                <Ionicons name="wallet-outline" size={20} color="#0284C7" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-sky-900 dark:text-sky-200">Set up your accounts</Text>
                <Text className="mt-0.5 text-xs text-sky-800/80 dark:text-sky-200/70">
                  Opening balances so transfers don’t double-count income
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#0284C7" />
            </Card>
          ) : (
            <View className="mt-4">
              <SectionTitle
                title="Accounts"
                action={{ label: 'Manage', onPress: () => router.push('/accounts') }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {balances.map(({ account, balance }) => {
                  const color = accountColor(account.id, account.institution);
                  return (
                    <Pressable
                      key={account.id}
                      onPress={() => router.push('/accounts')}
                      className="min-w-[140px] rounded-2xl border border-slate-200 bg-card-light px-3.5 py-3 dark:border-white/10 dark:bg-card-dark active:opacity-80">
                      <View className="flex-row items-center">
                        <View
                          className="h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${color}22` }}>
                          <Ionicons name={accountIcon(account.kind, account.institution)} size={16} color={color} />
                        </View>
                        <Text numberOfLines={1} className="ml-2 flex-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {account.name}
                        </Text>
                      </View>
                      <Text
                        className={`mt-2 text-base font-bold ${
                          account.kind === 'credit'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-slate-50'
                        }`}>
                        {formatCurrency(balance)}
                      </Text>
                      <Text className="text-[11px] text-slate-400 dark:text-slate-500">
                        {account.kind === 'credit' ? 'Owed' : 'Balance'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Net ≈ {formatCurrency(worth)}
              </Text>
            </View>
          )}

          {untagged.length > 0 ? (
            <Card
              className="mt-4 flex-row items-center border-amber-300/60 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
              onPress={() => router.push('/untagged')}>
              <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-400/25">
                <Ionicons name="pricetags-outline" size={20} color="#D97706" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-amber-900 dark:text-amber-200">
                  {untagged.length} {untagged.length === 1 ? 'payment needs' : 'payments need'} a category
                </Text>
                <Text className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/70">
                  {formatCurrency(untaggedTotal)} untagged · tap to sort them out
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D97706" />
            </Card>
          ) : (
            <Card className="mt-4 flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15">
                <Ionicons name="checkmark-done" size={20} color="#16A34A" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-slate-900 dark:text-slate-50">All caught up</Text>
                <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Every payment has a category.
                </Text>
              </View>
            </Card>
          )}

          <SectionTitle
            title="Where it went this month"
            action={{ label: 'Stats', onPress: () => router.push('/stats') }}
          />
          <Card className="gap-4">
            {topCategories.length === 0 ? (
              <Text className="text-sm text-slate-500 dark:text-slate-400">No spending yet this month.</Text>
            ) : (
              topCategories.map((entry) => {
                const category = getCategory(entry.categoryId);
                const isUntagged = entry.categoryId === UNTAGGED_KEY;
                const color = category?.color ?? '#F59E0B';
                return (
                  <Pressable
                    key={entry.categoryId}
                    className="flex-row items-center active:opacity-70"
                    onPress={() =>
                      router.push({
                        pathname: '/transactions',
                        params: { category: entry.categoryId, range: 'thisMonth' },
                      })
                    }>
                    <CategoryIcon category={category} size={34} />
                    <View className="ml-3 flex-1">
                      <View className="flex-row justify-between">
                        <Text className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {isUntagged ? 'Untagged' : (category?.name ?? 'Unknown')}
                        </Text>
                        <Text className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {formatCurrency(entry.total)}
                        </Text>
                      </View>
                      <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(4, (entry.total / maxCategory) * 100)}%`, backgroundColor: color }}
                        />
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Card>

          <SectionTitle
            title="Recent"
            action={{ label: 'See all', onPress: () => router.push('/transactions') }}
          />
          <Card className="overflow-hidden p-0">
            {recent.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No transactions yet"
                message="Add your first expense with the + button."
              />
            ) : (
              recent.map((tx, i) => (
                <View key={tx.id} className={i > 0 ? 'border-t border-slate-100 dark:border-white/5' : ''}>
                  <TransactionRow transaction={tx} showDate />
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
      <Fab />
    </Screen>
  );
}

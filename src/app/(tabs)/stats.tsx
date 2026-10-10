import Ionicons from '@expo/vector-icons/Ionicons';
import { getDaysInMonth, isSameMonth } from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';

import { Card, SectionTitle } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import { Screen, ScreenTitle } from '@/components/Screen';
import { useTabBarSpace } from '@/components/TabBar';
import { monthLabel } from '@/lib/dates';
import { formatCurrency } from '@/lib/formatCurrency';
import { haptics } from '@/lib/haptics';
import {
  availableMonths,
  monthlySeries,
  monthTotals,
  spendByCategory,
  topMerchants,
  UNTAGGED_KEY,
  worthItSplit,
} from '@/lib/selectors';
import { useAppColors } from '@/lib/theme';
import { usePullToRefresh } from '@/lib/usePullToRefresh';
import { useCategoryLookup } from '@/store/useCategories';
import { useTransactions } from '@/store/useTransactions';

const UNTAGGED_COLOR = '#F59E0B';

export default function StatsScreen() {
  const tabBarSpace = useTabBarSpace();
  const transactions = useTransactions((s) => s.transactions);
  const getCategory = useCategoryLookup();
  const colors = useAppColors();
  const { width } = useWindowDimensions();
  const { refreshControlProps } = usePullToRefresh();

  const months = useMemo(() => availableMonths(transactions), [transactions]);
  const [monthIndex, setMonthIndex] = useState(0);
  const month = months[Math.min(monthIndex, months.length - 1)];

  const stats = useMemo(() => {
    const now = new Date();
    const totals = monthTotals(transactions, month);
    const daysElapsed = isSameMonth(month, now) ? now.getDate() : getDaysInMonth(month);
    return {
      totals,
      perDay: Math.round(totals.spent / Math.max(1, daysElapsed)),
      byCategory: spendByCategory(transactions, month),
      merchants: topMerchants(transactions, month, 5),
      series: monthlySeries(transactions, 6, month),
      worth: worthItSplit(transactions, month),
    };
  }, [transactions, month]);

  const pieData = stats.byCategory.map((entry) => ({
    value: entry.total / 100,
    color: getCategory(entry.categoryId)?.color ?? UNTAGGED_COLOR,
  }));

  const chartWidth = width - 32 - 32 - 40;
  const barSpacing = 14;
  const barWidth = Math.max(16, (chartWidth - barSpacing * 7) / 6);
  const barData = stats.series.map((point) => ({
    value: point.spent / 100,
    label: monthLabel(point.month, true),
    frontColor: isSameMonth(point.month, month) ? colors.brand : colors.isDark ? '#3730A3' : '#C7D2FE',
  }));

  const worthTotal = stats.worth.yes.total + stats.worth.no.total + stats.worth.unrated.total;
  const pct = (value: number) => (worthTotal ? (value / worthTotal) * 100 : 0);

  const changeMonth = (delta: number) => {
    const next = monthIndex + delta;
    if (next < 0 || next >= months.length) return;
    haptics.tap();
    setMonthIndex(next);
  };

  return (
    <Screen safeTop>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarSpace + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl {...refreshControlProps} />}>
        <ScreenTitle title="Stats" />

        <View className="mx-4 flex-row items-center justify-between rounded-2xl bg-card-light px-2 py-2 dark:bg-card-dark">
          <Pressable onPress={() => changeMonth(1)} disabled={monthIndex >= months.length - 1} hitSlop={8} className="p-2">
            <Ionicons
              name="chevron-back"
              size={20}
              color={monthIndex >= months.length - 1 ? colors.border : colors.text}
            />
          </Pressable>
          <Text className="text-base font-bold text-slate-900 dark:text-slate-50">{monthLabel(month)}</Text>
          <Pressable onPress={() => changeMonth(-1)} disabled={monthIndex === 0} hitSlop={8} className="p-2">
            <Ionicons name="chevron-forward" size={20} color={monthIndex === 0 ? colors.border : colors.text} />
          </Pressable>
        </View>

        <View className="mx-4 mt-3 flex-row gap-3">
          <StatTile label="Spent" value={formatCurrency(stats.totals.spent)} />
          <StatTile label="Income" value={formatCurrency(stats.totals.income)} accent />
          <StatTile label="Per day" value={formatCurrency(stats.perDay)} />
        </View>

        <View className="px-4">
          <SectionTitle title="By category" />
          {stats.byCategory.length === 0 ? (
            <Card>
              <EmptyState icon="pie-chart-outline" title="No spending" message="Nothing was spent this month." />
            </Card>
          ) : (
            <Card>
              <View className="items-center py-2">
                <PieChart
                  data={pieData}
                  donut
                  radius={95}
                  innerRadius={66}
                  innerCircleColor={colors.card}
                  strokeWidth={2}
                  strokeColor={colors.card}
                  centerLabelComponent={() => (
                    <View className="items-center">
                      <Text className="text-xs text-slate-500 dark:text-slate-400">Spent</Text>
                      <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {formatCurrency(stats.totals.spent, { compact: true })}
                      </Text>
                    </View>
                  )}
                />
              </View>
              <View className="mt-4 gap-3">
                {stats.byCategory.map((entry) => {
                  const category = getCategory(entry.categoryId);
                  const share = stats.totals.spent ? Math.round((entry.total / stats.totals.spent) * 100) : 0;
                  return (
                    <View key={entry.categoryId} className="flex-row items-center">
                      <CategoryIcon category={category} size={32} />
                      <Text className="ml-3 flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {entry.categoryId === UNTAGGED_KEY ? 'Untagged' : (category?.name ?? 'Unknown')}
                        <Text className="font-normal text-slate-400 dark:text-slate-500">  {entry.count}×</Text>
                      </Text>
                      <Text className="mr-3 text-xs font-medium text-slate-500 dark:text-slate-400">{share}%</Text>
                      <Text className="w-20 text-right text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {formatCurrency(entry.total)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}

          <SectionTitle title="Last 6 months" />
          <Card className="overflow-hidden">
            <BarChart
              data={barData}
              barWidth={barWidth}
              spacing={barSpacing}
              initialSpacing={barSpacing}
              endSpacing={0}
              width={chartWidth}
              height={170}
              noOfSections={4}
              barBorderRadius={6}
              yAxisThickness={0}
              xAxisThickness={0}
              rulesColor={colors.border}
              yAxisLabelWidth={40}
              yAxisTextStyle={{ color: colors.subtle, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.muted, fontSize: 11 }}
              formatYLabel={(label) => formatCurrency(Number(label) * 100, { compact: true })}
              disableScroll
              isAnimated
            />
          </Card>

          <SectionTitle title="Was it worth it?" />
          <Card>
            {worthTotal === 0 ? (
              <Text className="text-sm text-slate-500 dark:text-slate-400">No spending this month.</Text>
            ) : (
              <>
                <View className="h-3 flex-row overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <View style={{ width: `${pct(stats.worth.yes.total)}%` }} className="bg-emerald-500" />
                  <View style={{ width: `${pct(stats.worth.no.total)}%` }} className="bg-rose-500" />
                </View>
                <View className="mt-4 gap-2.5">
                  <WorthRow emoji="👍" label="Worth it" total={stats.worth.yes.total} count={stats.worth.yes.count} />
                  <WorthRow emoji="👎" label="Not worth it" total={stats.worth.no.total} count={stats.worth.no.count} />
                  <WorthRow emoji="🤷" label="Not rated" total={stats.worth.unrated.total} count={stats.worth.unrated.count} />
                </View>
                {stats.worth.no.total > 0 ? (
                  <Text className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    You regretted {formatCurrency(stats.worth.no.total)} this month. Rate payments on their detail
                    screen to sharpen this.
                  </Text>
                ) : null}
              </>
            )}
          </Card>

          <SectionTitle title="Top merchants" />
          <Card className="gap-3">
            {stats.merchants.length === 0 ? (
              <Text className="text-sm text-slate-500 dark:text-slate-400">No payments this month.</Text>
            ) : (
              stats.merchants.map((m, i) => (
                <View key={m.merchant} className="flex-row items-center">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/40">
                    <Text className="text-xs font-bold text-brand-700 dark:text-brand-300">{i + 1}</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text numberOfLines={1} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {m.merchant}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                      {m.count} {m.count === 1 ? 'payment' : 'payments'}
                    </Text>
                  </View>
                  <Text className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {formatCurrency(m.total)}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-1 rounded-2xl bg-card-light p-3 dark:bg-card-dark">
      <Text className="text-xs text-slate-500 dark:text-slate-400">{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        className={`mt-1 text-base font-bold ${
          accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-50'
        }`}>
        {value}
      </Text>
    </View>
  );
}

function WorthRow({ emoji, label, total, count }: { emoji: string; label: string; total: number; count: number }) {
  return (
    <View className="flex-row items-center">
      <Text className="w-7 text-base">{emoji}</Text>
      <Text className="flex-1 text-sm text-slate-700 dark:text-slate-200">
        {label} <Text className="text-slate-400 dark:text-slate-500">· {count}</Text>
      </Text>
      <Text className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(total)}</Text>
    </View>
  );
}

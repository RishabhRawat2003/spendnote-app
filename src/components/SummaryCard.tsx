import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { formatCurrency } from '@/lib/formatCurrency';

interface SummaryCardProps {
  monthName: string;
  spent: number;
  income: number;
  /** Spend for the same period last month, for the comparison line */
  previousSpent?: number;
}

export function SummaryCard({ monthName, spent, income, previousSpent }: SummaryCardProps) {
  const change = previousSpent ? Math.round(((spent - previousSpent) / previousSpent) * 100) : null;

  return (
    <View className="overflow-hidden rounded-3xl bg-brand-600 p-5 dark:bg-brand-700">
      <View className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <View className="absolute -bottom-16 -right-2 h-32 w-32 rounded-full bg-white/5" />

      <Text className="text-sm font-medium text-brand-100">Spent in {monthName}</Text>
      <Text className="mt-1 text-4xl font-bold text-white" style={{ fontVariant: ['tabular-nums'] }}>
        {formatCurrency(spent)}
      </Text>

      {change !== null ? (
        <View className="mt-2 flex-row items-center self-start rounded-full bg-white/15 px-2.5 py-1">
          <Ionicons name={change > 0 ? 'arrow-up' : 'arrow-down'} size={12} color="#FFFFFF" />
          <Text className="ml-1 text-xs font-semibold text-white">
            {Math.abs(change)}% vs same days last month
          </Text>
        </View>
      ) : null}

      <View className="mt-5 flex-row">
        <View className="flex-1">
          <Text className="text-xs font-medium text-brand-100">Income</Text>
          <Text className="mt-0.5 text-lg font-bold text-white">{formatCurrency(income)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-medium text-brand-100">Left over</Text>
          <Text className="mt-0.5 text-lg font-bold text-white">{formatCurrency(income - spent)}</Text>
        </View>
      </View>
    </View>
  );
}

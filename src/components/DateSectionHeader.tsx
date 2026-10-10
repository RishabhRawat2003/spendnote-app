import { Text, View } from 'react-native';

import { formatCurrency } from '@/lib/formatCurrency';

interface DateSectionHeaderProps {
  title: string;
  spent: number;
}

export function DateSectionHeader({ title, spent }: DateSectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between bg-surface-light px-5 pb-1.5 pt-4 dark:bg-surface-dark">
      <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</Text>
      {spent > 0 ? (
        <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Spent {formatCurrency(spent)}
        </Text>
      ) : null}
    </View>
  );
}

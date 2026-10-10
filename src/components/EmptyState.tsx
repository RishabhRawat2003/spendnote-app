import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { useAppColors } from '@/lib/theme';
import type { IconName } from '@/types';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const colors = useAppColors();
  return (
    <View className="items-center justify-center px-8 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/40">
        <Ionicons name={icon} size={28} color={colors.brand} />
      </View>
      <Text className="mt-4 text-center text-lg font-bold text-slate-900 dark:text-slate-50">{title}</Text>
      {message ? (
        <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">{message}</Text>
      ) : null}
      {action ? (
        <Pressable
          onPress={action.onPress}
          className="mt-5 rounded-full bg-brand-600 px-5 py-2.5 active:opacity-80 dark:bg-brand-500">
          <Text className="font-semibold text-white">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import type { WorthIt } from '@/types';

interface WorthItToggleProps {
  value: WorthIt | undefined;
  onChange: (value: WorthIt) => void;
}

export function WorthItToggle({ value, onChange }: WorthItToggleProps) {
  const option = (choice: 'yes' | 'no', emoji: string, label: string) => {
    const selected = value === choice;
    const selectedClass =
      choice === 'yes'
        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15'
        : 'border-rose-500 bg-rose-50 dark:bg-rose-500/15';
    return (
      <Pressable
        onPress={() => {
          haptics.tap();
          onChange(selected ? null : choice);
        }}
        className={`flex-1 flex-row items-center justify-center rounded-xl border-2 py-3 ${
          selected ? selectedClass : 'border-slate-200 bg-card-light dark:border-white/10 dark:bg-card-dark'
        }`}>
        <Text className="text-lg">{emoji}</Text>
        <Text className="ml-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-row gap-3">
      {option('yes', '👍', 'Worth it')}
      {option('no', '👎', 'Not worth it')}
    </View>
  );
}

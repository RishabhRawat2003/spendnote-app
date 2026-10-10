import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';

interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <View className="flex-row rounded-xl bg-slate-200/70 p-1 dark:bg-white/5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              haptics.tap();
              onChange(option.value);
            }}
            className={`flex-1 items-center rounded-lg py-2 ${selected ? 'bg-card-light dark:bg-slate-700' : ''}`}>
            <Text
              className={`text-sm font-semibold ${
                selected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              }`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

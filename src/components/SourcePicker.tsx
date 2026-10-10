import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, Text } from 'react-native';

import { SOURCE_LIST } from '@/data/sources';
import { haptics } from '@/lib/haptics';
import type { Source } from '@/types';

interface SourcePickerProps {
  value: Source;
  onChange: (source: Source) => void;
}

export function SourcePicker({ value, onChange }: SourcePickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
      keyboardShouldPersistTaps="handled">
      {SOURCE_LIST.map((source) => {
        const selected = source.id === value;
        return (
          <Pressable
            key={source.id}
            onPress={() => {
              haptics.tap();
              onChange(source.id);
            }}
            className={`flex-row items-center rounded-full border px-3 py-2 ${
              selected ? '' : 'border-slate-200 bg-card-light dark:border-white/10 dark:bg-card-dark'
            }`}
            style={selected ? { backgroundColor: source.color, borderColor: source.color } : undefined}>
            <Ionicons name={source.icon} size={15} color={selected ? '#FFFFFF' : source.color} />
            <Text
              className={`ml-1.5 text-sm font-semibold ${
                selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'
              }`}>
              {source.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

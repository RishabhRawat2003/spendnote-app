import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text } from 'react-native';

import { haptics } from '@/lib/haptics';
import type { Category } from '@/types';

interface CategoryChipProps {
  category: Category;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function CategoryChip({ category, selected = false, onPress, size = 'md' }: CategoryChipProps) {
  const small = size === 'sm';
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      className={`flex-row items-center rounded-full border ${small ? 'px-2.5 py-1' : 'px-3 py-2'} ${
        selected ? '' : 'border-slate-200 bg-card-light dark:border-white/10 dark:bg-card-dark'
      }`}
      style={selected ? { backgroundColor: category.color, borderColor: category.color } : undefined}>
      <Ionicons name={category.icon} size={small ? 13 : 16} color={selected ? '#FFFFFF' : category.color} />
      <Text
        className={`ml-1.5 font-semibold ${small ? 'text-xs' : 'text-sm'} ${
          selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'
        }`}>
        {category.name}
      </Text>
    </Pressable>
  );
}

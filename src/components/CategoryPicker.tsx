import { View } from 'react-native';

import { INCOME_CATEGORY_ID } from '@/data/defaultCategories';
import { useCategories } from '@/store/useCategories';
import type { TransactionType } from '@/types';

import { CategoryChip } from './CategoryChip';

interface CategoryPickerProps {
  value: string | null;
  onChange: (categoryId: string) => void;
  /** Hides Income for debits so the list stays short */
  type?: TransactionType;
}

export function CategoryPicker({ value, onChange, type }: CategoryPickerProps) {
  const categories = useCategories((s) => s.categories);
  const visible = type === 'debit' ? categories.filter((c) => c.id !== INCOME_CATEGORY_ID) : categories;

  return (
    <View className="flex-row flex-wrap gap-2">
      {visible.map((category) => (
        <CategoryChip
          key={category.id}
          category={category}
          selected={category.id === value}
          onPress={() => onChange(category.id)}
        />
      ))}
    </View>
  );
}

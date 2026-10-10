import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useAppColors } from '@/lib/theme';
import type { Category } from '@/types';

interface CategoryIconProps {
  /** undefined renders the "untagged" placeholder */
  category?: Category;
  size?: number;
}

export function CategoryIcon({ category, size = 40 }: CategoryIconProps) {
  const colors = useAppColors();
  const iconSize = Math.round(size * 0.5);

  if (!category) {
    return (
      <View
        className="items-center justify-center rounded-full border-2 border-dashed border-amber-400"
        style={{ width: size, height: size }}>
        <Ionicons name="help" size={iconSize} color={colors.isDark ? '#FBBF24' : '#D97706'} />
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: `${category.color}22` }}>
      <Ionicons name={category.icon} size={iconSize} color={category.color} />
    </View>
  );
}

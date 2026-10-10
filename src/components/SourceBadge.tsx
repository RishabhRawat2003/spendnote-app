import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { SOURCES } from '@/data/sources';
import type { Source } from '@/types';

interface SourceBadgeProps {
  source: Source;
  size?: 'sm' | 'md';
}

export function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const info = SOURCES[source];
  const small = size === 'sm';
  return (
    <View
      className={`flex-row items-center self-start rounded-full ${small ? 'px-2 py-0.5' : 'px-3 py-1'}`}
      style={{ backgroundColor: `${info.color}1F` }}>
      <Ionicons name={info.icon} size={small ? 11 : 14} color={info.color} />
      <Text className={`ml-1 font-semibold ${small ? 'text-[11px]' : 'text-sm'}`} style={{ color: info.color }}>
        {info.label}
      </Text>
    </View>
  );
}

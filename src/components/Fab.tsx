import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { useTabBarSpace } from '@/components/TabBar';
import { haptics } from '@/lib/haptics';

export function Fab() {
  const tabBarSpace = useTabBarSpace();
  return (
    <Pressable
      accessibilityLabel="Add expense"
      onPress={() => {
        haptics.press();
        router.push('/add');
      }}
      className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-brand-600 active:scale-95 dark:bg-brand-500"
      style={{
        bottom: tabBarSpace + 16,
        elevation: 6,
        shadowColor: '#4F46E5',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      }}>
      <Ionicons name="add" size={30} color="#FFFFFF" />
    </Pressable>
  );
}

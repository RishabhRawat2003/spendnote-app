import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { loadUserData, useSync } from '@/lib/sync';
import { useAppColors } from '@/lib/theme';

/** Shows first-load progress and "can't reach the server" errors, with a retry. */
export function SyncBanner() {
  const status = useSync((s) => s.status);
  const error = useSync((s) => s.error);
  const colors = useAppColors();
  const [retrying, setRetrying] = useState(false);

  if (status === 'loading') {
    return (
      <View className="mx-4 mb-3 flex-row items-center rounded-2xl bg-brand-50 px-4 py-3 dark:bg-brand-900/30">
        <ActivityIndicator size="small" color={colors.brand} />
        <Text className="ml-3 text-sm font-medium text-brand-700 dark:text-brand-200">Loading your data…</Text>
      </View>
    );
  }

  if (status !== 'error') return null;

  const retry = async () => {
    haptics.tap();
    setRetrying(true);
    await loadUserData().catch(() => {});
    setRetrying(false);
  };

  return (
    <View className="mx-4 mb-3 rounded-2xl bg-rose-50 p-4 dark:bg-rose-500/10">
      <View className="flex-row items-start">
        <Ionicons name="cloud-offline-outline" size={18} color="#E11D48" />
        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold text-rose-800 dark:text-rose-200">Couldn’t load your data</Text>
          <Text className="mt-0.5 text-xs leading-4 text-rose-700 dark:text-rose-300">{error}</Text>
        </View>
      </View>
      <Pressable
        onPress={retry}
        disabled={retrying}
        className="mt-3 self-start rounded-full bg-rose-600 px-4 py-1.5 active:opacity-80">
        {retrying ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="text-xs font-semibold text-white">Try again</Text>
        )}
      </Pressable>
    </View>
  );
}

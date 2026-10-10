import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { ActivityIndicator, BackHandler, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/lib/haptics';
import { useAppColors } from '@/lib/theme';
import { useAppLock } from '@/store/useAppLock';
import { useAuth } from '@/store/useAuth';

import { Logo } from './Logo';

interface AppLockScreenProps {
  /** False while the launch splash is still covering the screen, so the prompt waits for it. */
  active: boolean;
}

/** Covers the whole app, including open sheets and dialogs, while App lock is engaged. */
export function AppLockScreen({ active }: AppLockScreenProps) {
  const locked = useAppLock((s) => s.locked);
  const authenticating = useAppLock((s) => s.authenticating);
  const unlock = useAppLock((s) => s.unlock);
  const firstName = useAuth((s) => s.user?.name.split(' ')[0]);
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!locked || !active) return;
    unlock().then((ok) => {
      if (ok) haptics.success();
    });
  }, [locked, active, unlock]);

  const tryUnlock = async () => {
    haptics.tap();
    if (await unlock()) haptics.success();
  };

  return (
    <Modal
      visible={locked && active}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => BackHandler.exitApp()}>
      <View
        className="flex-1 bg-surface-light dark:bg-surface-dark"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }}>
        <View className="flex-1 items-center justify-center px-8">
          <Logo size={72} />
          <Text className="mt-6 text-2xl font-bold text-slate-900 dark:text-slate-50">SpendNote is locked</Text>
          <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            {firstName ? `Welcome back, ${firstName}. ` : ''}Unlock to see your expenses.
          </Text>
        </View>

        <View className="items-center px-8">
          <Pressable
            onPress={tryUnlock}
            disabled={authenticating}
            className="h-14 w-full flex-row items-center justify-center rounded-2xl bg-brand-600 active:opacity-80 dark:bg-brand-500">
            {authenticating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="finger-print" size={22} color="#FFFFFF" />
                <Text className="ml-2 text-base font-bold text-white">Unlock</Text>
              </>
            )}
          </Pressable>
          <View className="mt-4 flex-row items-center">
            <Ionicons name="lock-closed" size={12} color={colors.subtle} />
            <Text className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">
              Fingerprint, face unlock or your phone’s screen lock
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

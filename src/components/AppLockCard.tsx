import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { haptics } from '@/lib/haptics';
import { useAppColors } from '@/lib/theme';
import { LOCK_TIMEOUT_OPTIONS, useAppLock } from '@/store/useAppLock';

export function AppLockCard() {
  const colors = useAppColors();
  const enabled = useAppLock((s) => s.enabled);
  const timeoutMs = useAppLock((s) => s.timeoutMs);
  const enable = useAppLock((s) => s.enable);
  const disable = useAppLock((s) => s.disable);
  const setTimeoutMs = useAppLock((s) => s.setTimeoutMs);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    if (busy) return;
    haptics.tap();
    if (!next) {
      disable();
      return;
    }
    setBusy(true);
    const result = await enable();
    setBusy(false);
    if (result.ok) haptics.success();
    else Alert.alert('App lock is off', result.reason);
  };

  return (
    <Card className="overflow-hidden p-0">
      <View className="flex-row items-center px-4 py-3.5">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/40">
          <Ionicons name="finger-print" size={18} color={colors.brand} />
        </View>
        <View className="ml-3 mr-2 flex-1">
          <Text className="text-base font-medium text-slate-900 dark:text-slate-50">App lock</Text>
          <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Ask for fingerprint, face or screen lock when opening SpendNote
          </Text>
        </View>
        <Switch
          value={enabled}
          disabled={busy}
          onValueChange={toggle}
          trackColor={{ true: colors.brand, false: colors.border }}
          thumbColor="#FFFFFF"
        />
      </View>

      {enabled ? (
        <View className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-white/5">
          <Text className="text-sm text-slate-600 dark:text-slate-300">Lock again after leaving the app for</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {LOCK_TIMEOUT_OPTIONS.map((option) => {
              const selected = option.ms === timeoutMs;
              return (
                <Pressable
                  key={option.ms}
                  onPress={() => {
                    haptics.tap();
                    setTimeoutMs(option.ms);
                  }}
                  className={`rounded-full border px-3.5 py-1.5 ${
                    selected
                      ? 'border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500'
                      : 'border-slate-200 dark:border-white/10'
                  }`}>
                  <Text
                    className={`text-sm font-semibold ${
                      selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                    }`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

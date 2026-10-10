import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppLockCard } from '@/components/AppLockCard';
import { AutoDetectionCard } from '@/components/AutoDetectionCard';
import { Card, SectionTitle } from '@/components/Card';
import { LogoutDialog } from '@/components/LogoutDialog';
import { Screen, ScreenTitle } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useTabBarSpace } from '@/components/TabBar';
import { formatCurrency } from '@/lib/formatCurrency';
import { haptics } from '@/lib/haptics';
import { useAppColors } from '@/lib/theme';
import { useAuth } from '@/store/useAuth';
import { useCategories } from '@/store/useCategories';
import { useSettings } from '@/store/useSettings';
import type { IconName, ThemePreference } from '@/types';

const MIN_AMOUNT_OPTIONS = [0, 20, 50, 100, 200, 500].map((rupees) => rupees * 100);

export default function SettingsScreen() {
  const tabBarSpace = useTabBarSpace();
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const minPromptAmount = useSettings((s) => s.minPromptAmount);
  const setMinPromptAmount = useSettings((s) => s.setMinPromptAmount);
  const categoryCount = useCategories((s) => s.categories.length);
  const user = useAuth((s) => s.user);
  const logOut = useAuth((s) => s.logOut);
  const colors = useAppColors();

  const [confirmingLogOut, setConfirmingLogOut] = useState(false);

  return (
    <Screen safeTop>
      <ScrollView
        contentContainerClassName="px-4"
        contentContainerStyle={{ paddingBottom: tabBarSpace + 24 }}
        showsVerticalScrollIndicator={false}>
        <View className="-mx-4">
          <ScreenTitle title="Settings" />
        </View>

        <Card className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-600 dark:bg-brand-500">
            <Text className="text-lg font-bold text-white">{initials(user?.name ?? '')}</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text numberOfLines={1} className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {user?.name}
            </Text>
            <Text numberOfLines={1} className="text-xs text-slate-500 dark:text-slate-400">
              {user?.email}
            </Text>
          </View>
        </Card>

        <SectionTitle title="Appearance" />
        <Card>
          <SegmentedControl<ThemePreference>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Card>

        <SectionTitle title="Ask me about payments" />
        <Card>
          <Text className="text-sm text-slate-600 dark:text-slate-300">
            Only ask “What was this for?” for payments of at least
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {MIN_AMOUNT_OPTIONS.map((paise) => {
              const selected = paise === minPromptAmount;
              return (
                <Pressable
                  key={paise}
                  onPress={() => {
                    haptics.tap();
                    setMinPromptAmount(paise);
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
                    {paise === 0 ? 'Every payment' : formatCurrency(paise)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionTitle title="Organise" />
        <Card className="overflow-hidden p-0">
          <SettingsRow
            icon="pricetags-outline"
            label="Categories"
            value={`${categoryCount}`}
            onPress={() => router.push('/categories')}
          />
        </Card>

        <SectionTitle title="Automatic detection" />
        <AutoDetectionCard />

        <SectionTitle title="Security" />
        <AppLockCard />

        <Pressable
          onPress={() => setConfirmingLogOut(true)}
          className="mt-8 flex-row items-center justify-center rounded-2xl border border-rose-200 py-3.5 active:bg-rose-50 dark:border-rose-500/30 dark:active:bg-rose-500/10">
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text className="ml-2 font-semibold text-rose-600 dark:text-rose-400">Log out</Text>
        </Pressable>

        <View className="mt-8 items-center">
          <Ionicons name="wallet" size={22} color={colors.brand} />
          <Text className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">SpendNote</Text>
          <Text className="text-xs text-slate-400 dark:text-slate-500">
            Version {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
      </ScrollView>

      <LogoutDialog
        visible={confirmingLogOut}
        name={user?.name ?? ''}
        email={user?.email ?? ''}
        initials={initials(user?.name ?? '')}
        onCancel={() => setConfirmingLogOut(false)}
        onConfirm={logOut}
      />
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  hint,
  badge,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  hint?: string;
  badge?: string;
  onPress?: () => void;
}) {
  const colors = useAppColors();
  const content: ReactNode = (
    <>
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/40">
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-medium text-slate-900 dark:text-slate-50">{label}</Text>
        {hint ? <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</Text> : null}
      </View>
      {value ? <Text className="mr-1 text-sm text-slate-500 dark:text-slate-400">{value}</Text> : null}
      {badge ? (
        <View className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-white/10">
          <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{badge}</Text>
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.subtle} /> : null}
    </>
  );

  if (!onPress) return <View className="flex-row items-center px-4 py-3.5">{content}</View>;
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-3.5 active:bg-slate-100 dark:active:bg-white/5">
      {content}
    </Pressable>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
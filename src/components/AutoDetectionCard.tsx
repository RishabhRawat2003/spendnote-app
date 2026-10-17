import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Pressable, Switch, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { SOURCES } from '@/data/sources';
import { haptics } from '@/lib/haptics';
import {
  isPaymentDetectionAvailable,
  sendTestPayment,
  sendTestSliceEmail,
  useDetectionPermissions,
} from '@/lib/paymentDetection';
import { useAppColors } from '@/lib/theme';
import { useSettings } from '@/store/useSettings';
import type { IconName } from '@/types';

const SUPPORTED = `${(['gpay', 'phonepe', 'paytm', 'bhim'] as const)
  .map((id) => SOURCES[id].label)
  .join(', ')}, plus Canara Bank and slice (app, SMS and Gmail alerts)`;

export function AutoDetectionCard() {
  if (!isPaymentDetectionAvailable) {
    return (
      <Card className="flex-row">
        <IconTile icon="notifications-outline" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-medium text-slate-900 dark:text-slate-50">Automatic payment detection</Text>
          <Text className="mt-0.5 text-xs leading-4 text-slate-500 dark:text-slate-400">
            Works in the installed Android app (EAS build), not in Expo Go. Reads payments from {SUPPORTED}.
          </Text>
        </View>
      </Card>
    );
  }
  return <DetectionControls />;
}

function DetectionControls() {
  const colors = useAppColors();
  const autoDetect = useSettings((s) => s.autoDetect);
  const setAutoDetect = useSettings((s) => s.setAutoDetect);
  const { listenerEnabled, notificationsAllowed, openListenerSettings, requestNotifications } =
    useDetectionPermissions();
  const ready = autoDetect && listenerEnabled;

  return (
    <Card className="overflow-hidden p-0">
      <Row
        icon="flash-outline"
        label="Detect payments automatically"
        hint={`Reads ${SUPPORTED}`}
        right={
          <Switch
            value={autoDetect}
            onValueChange={(value) => {
              haptics.tap();
              setAutoDetect(value);
            }}
            trackColor={{ true: colors.brand, false: colors.border }}
            thumbColor="#FFFFFF"
          />
        }
      />
      <Divider />
      <Row
        icon="eye-outline"
        label="Notification access"
        hint="Lets SpendNote see payment notifications"
        right={
          listenerEnabled ? (
            <StatusPill ok label="On" />
          ) : (
            <ActionButton label="Turn on" onPress={openListenerSettings} />
          )
        }
      />
      <Divider />
      <Row
        icon="chatbubble-ellipses-outline"
        label="“What was this for?” prompts"
        hint="A notification right after each payment"
        right={
          notificationsAllowed ? (
            <StatusPill ok label="Allowed" />
          ) : (
            <ActionButton label="Allow" onPress={requestNotifications} />
          )
        }
      />
      <Divider />
      <Pressable
        onPress={() => {
          haptics.press();
          sendTestPayment();
        }}
        disabled={!autoDetect}
        className="flex-row items-center px-4 py-3.5 active:bg-slate-100 dark:active:bg-white/5"
        style={{ opacity: autoDetect ? 1 : 0.5 }}>
        <IconTile icon="paper-plane-outline" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-medium text-slate-900 dark:text-slate-50">Send a test payment</Text>
          <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Adds a fake GPay payment to Untagged{notificationsAllowed ? ' and shows the prompt' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
      </Pressable>
      <Divider />
      <Pressable
        onPress={() => {
          haptics.press();
          sendTestSliceEmail();
        }}
        disabled={!autoDetect}
        className="flex-row items-center px-4 py-3.5 active:bg-slate-100 dark:active:bg-white/5"
        style={{ opacity: autoDetect ? 1 : 0.5 }}>
        <IconTile icon="mail-outline" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-medium text-slate-900 dark:text-slate-50">Send a test slice email</Text>
          <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Fakes a Gmail alert from slice — same path as real email capture
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
      </Pressable>
      <Divider />
      <Pressable
        onPress={() => {
          haptics.press();
          router.push('/detection-log');
        }}
        className="flex-row items-center px-4 py-3.5 active:bg-slate-100 dark:active:bg-white/5">
        <IconTile icon="pulse-outline" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-medium text-slate-900 dark:text-slate-50">Detection activity</Text>
          <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            See what was captured or ignored, and why
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
      </Pressable>
      {!ready && autoDetect ? (
        <View className="mx-4 mb-4 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={16} color="#D97706" />
            <Text className="ml-2 flex-1 text-xs leading-4 text-amber-800 dark:text-amber-300">
              Tap “Turn on” and enable SpendNote in the list. If Android says it’s a{' '}
              <Text className="font-semibold">restricted setting</Text> or the switch is greyed out: open App info, tap
              ⋮ in the top-right corner, choose “Allow restricted settings”, then try again.
            </Text>
          </View>
          <Pressable
            onPress={() => {
              haptics.tap();
              Linking.openSettings();
            }}
            className="ml-6 mt-2 self-start rounded-full bg-amber-600 px-3 py-1.5 active:opacity-80">
            <Text className="text-xs font-semibold text-white">Open App info</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

function Row({ icon, label, hint, right }: { icon: IconName; label: string; hint?: string; right: ReactNode }) {
  return (
    <View className="flex-row items-center px-4 py-3.5">
      <IconTile icon={icon} />
      <View className="ml-3 mr-2 flex-1">
        <Text className="text-base font-medium text-slate-900 dark:text-slate-50">{label}</Text>
        {hint ? <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function IconTile({ icon }: { icon: IconName }) {
  const colors = useAppColors();
  return (
    <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/40">
      <Ionicons name={icon} size={18} color={colors.brand} />
    </View>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View
      className={`flex-row items-center rounded-full px-2.5 py-1 ${
        ok ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-slate-100 dark:bg-white/10'
      }`}>
      <View className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      <Text
        className={`ml-1.5 text-xs font-semibold ${
          ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
        }`}>
        {label}
      </Text>
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      className="rounded-full bg-brand-600 px-3.5 py-1.5 active:opacity-80 dark:bg-brand-500">
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

function Divider() {
  return <View className="ml-16 h-px bg-slate-100 dark:bg-white/5" />;
}

import Ionicons from '@expo/vector-icons/Ionicons';
import type { DetectionActivity, DetectionOutcome } from '@modules/payment-detector';
import { formatDistanceToNowStrict } from 'date-fns';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { errorMessage } from '@/lib/api';
import { dayLabel, timeLabel } from '@/lib/dates';
import { formatCurrency } from '@/lib/formatCurrency';
import { haptics } from '@/lib/haptics';
import { ingestPendingPayments, useDetectionReport, useDetectionSync } from '@/lib/paymentDetection';
import { useAppColors } from '@/lib/theme';
import type { IconName } from '@/types';

const OUTCOME: Record<DetectionOutcome, { label: string; icon: IconName; color: string }> = {
  saved: { label: 'Captured', icon: 'checkmark-circle', color: '#10B981' },
  duplicate: { label: 'Duplicate', icon: 'copy-outline', color: '#64748B' },
  skipped: { label: 'Ignored', icon: 'remove-circle-outline', color: '#D97706' },
  disabled: { label: 'Detection off', icon: 'pause-circle-outline', color: '#94A3B8' },
};

function ago(ms: number) {
  return ms > 0 ? `${formatDistanceToNowStrict(ms)} ago` : 'Never';
}

export default function DetectionLogScreen() {
  const colors = useAppColors();
  const { diagnostics, activity, refresh, reconnect, clearActivity } = useDetectionReport();
  const lastSyncAt = useDetectionSync((s) => s.lastSyncAt);
  const lastSyncError = useDetectionSync((s) => s.lastSyncError);

  const [syncing, setSyncing] = useState(false);

  const syncNow = async () => {
    haptics.tap();
    setSyncing(true);
    try {
      const sent = await ingestPendingPayments();
      haptics.success();
      Alert.alert(
        sent > 0 ? 'Synced' : 'Nothing to sync',
        sent > 0
          ? `${sent} ${sent === 1 ? 'payment was' : 'payments were'} sent to your account. Duplicates are skipped automatically.`
          : 'Every captured payment is already in your account.',
      );
    } catch (err) {
      haptics.warning();
      Alert.alert('Couldn’t sync', `${errorMessage(err)}\n\nThe payments stay saved on this phone and will be retried.`);
    } finally {
      setSyncing(false);
      refresh();
    }
  };

  if (!diagnostics) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
            Detection only runs in the installed Android app.
          </Text>
        </View>
      </Screen>
    );
  }

  const listenerOk = diagnostics.listenerEnabled && diagnostics.listenerConnected;

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-4 pb-16 pt-2"
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.brand} />}>
        <Card className="overflow-hidden p-0">
          <StatusRow
            label="Notification access"
            ok={diagnostics.listenerEnabled}
            value={diagnostics.listenerEnabled ? 'Granted' : 'Off'}
          />
          <StatusRow
            label="Listener"
            ok={listenerOk}
            value={
              diagnostics.listenerConnected
                ? `Running · since ${ago(diagnostics.connectedAt)}`
                : diagnostics.listenerEnabled
                  ? 'Not running'
                  : 'Needs access'
            }
          />
          <StatusRow label="Detection" ok={diagnostics.enabled} value={diagnostics.enabled ? 'On' : 'Off'} />
          <StatusRow
            label="Sync to your account"
            ok={!lastSyncError}
            value={
              lastSyncError
                ? lastSyncError
                : diagnostics.pendingCount > 0
                  ? `${diagnostics.pendingCount} waiting`
                  : lastSyncAt
                    ? `Up to date · ${ago(lastSyncAt)}`
                    : 'Up to date'
            }
          />
          <View className="flex-row gap-2 px-4 pb-4 pt-2">
            {diagnostics.listenerEnabled && !diagnostics.listenerConnected ? (
              <ActionButton
                icon="refresh"
                label="Reconnect"
                onPress={() => {
                  haptics.tap();
                  reconnect();
                }}
              />
            ) : null}
            <ActionButton
              icon="cloud-upload-outline"
              label={syncing ? 'Syncing…' : 'Sync now'}
              onPress={() => {
                if (!syncing) void syncNow();
              }}
            />
          </View>
        </Card>

        <View className="mb-2 mt-6 flex-row items-center justify-between px-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recent notifications
          </Text>
          {activity.length > 0 ? (
            <Pressable onPress={clearActivity} hitSlop={8}>
              <Text className="text-xs font-semibold text-brand-600 dark:text-brand-400">Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {activity.length === 0 ? (
          <Card>
            <Text className="text-sm leading-5 text-slate-500 dark:text-slate-400">
              Nothing yet. Make a UPI payment and come back: every payment notification, bank SMS or slice Gmail
              alert SpendNote sees shows up here, with the reason if it was ignored.
            </Text>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            {activity.map((item, i) => (
              <ActivityRow key={`${item.at}-${i}`} item={item} first={i === 0} />
            ))}
          </Card>
        )}

        <Text className="mt-4 px-1 text-xs leading-4 text-slate-400 dark:text-slate-500">
          Stored only on this phone. Personal SMS and non-slice emails are never read into this list.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function StatusRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <View className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      <Text className="ml-3 flex-1 text-sm font-medium text-slate-900 dark:text-slate-50">{label}</Text>
      <Text
        numberOfLines={2}
        className={`ml-3 max-w-[60%] text-right text-xs ${
          ok ? 'text-slate-500 dark:text-slate-400' : 'text-amber-700 dark:text-amber-400'
        }`}>
        {value}
      </Text>
    </View>
  );
}

function ActivityRow({ item, first }: { item: DetectionActivity; first: boolean }) {
  const outcome = OUTCOME[item.outcome] ?? OUTCOME.skipped;
  const amount =
    item.amount != null ? formatCurrency(item.amount, { sign: item.type === 'credit' ? 'credit' : 'debit' }) : null;
  return (
    <View className={`flex-row px-4 py-3 ${first ? '' : 'border-t border-slate-100 dark:border-white/5'}`}>
      <Ionicons name={outcome.icon} size={20} color={outcome.color} style={{ marginTop: 1 }} />
      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-50" numberOfLines={1}>
            {item.app}
            {item.merchant ? ` · ${item.merchant}` : ''}
          </Text>
          {amount ? <Text className="ml-2 text-sm font-semibold text-slate-900 dark:text-slate-50">{amount}</Text> : null}
        </View>
        <Meta>
          <Text style={{ color: outcome.color }}>{outcome.label}</Text> · {item.detail}
        </Meta>
        {item.preview ? (
          <Text className="mt-1 text-xs italic text-slate-400 dark:text-slate-500" numberOfLines={2}>
            “{item.preview}”
          </Text>
        ) : null}
        <Text className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          {dayLabel(new Date(item.postedAt || item.at))}, {timeLabel(new Date(item.postedAt || item.at))}
        </Text>
      </View>
    </View>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{children}</Text>;
}

function ActionButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const colors = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-full bg-brand-50 px-3.5 py-2 active:opacity-70 dark:bg-brand-900/40">
      <Ionicons name={icon} size={14} color={colors.brand} />
      <Text className="ml-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">{label}</Text>
    </Pressable>
  );
}

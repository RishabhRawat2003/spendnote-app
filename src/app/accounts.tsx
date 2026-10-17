import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionTitle } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { SUGGESTED_ACCOUNTS, accountColor, accountIcon } from '@/data/accounts';
import { errorMessage } from '@/lib/api';
import { formatCurrency, parseRupeesToPaise } from '@/lib/formatCurrency';
import { haptics } from '@/lib/haptics';
import { accountBalances } from '@/lib/selectors';
import { useAppColors } from '@/lib/theme';
import { useAccounts } from '@/store/useAccounts';
import { useTransactions } from '@/store/useTransactions';
import type { Account } from '@/types';

interface DraftRow {
  key: string;
  enabled: boolean;
  name: string;
  last4: string;
  balanceText: string;
  kind: Account['kind'];
  institution: Account['institution'];
  hint: string;
  color: string;
  icon: (typeof SUGGESTED_ACCOUNTS)[number]['icon'];
}

function draftsFromSuggestions(existing: Account[]): DraftRow[] {
  const byId = new Map(existing.map((a) => [a.id, a]));
  return SUGGESTED_ACCOUNTS.map((s) => {
    const found = byId.get(s.key);
    return {
      key: s.key,
      enabled: !!found || (existing.length === 0 && (s.key === 'canara_primary' || s.key.startsWith('slice'))),
      name: found?.name ?? s.name,
      last4: found?.last4 ?? '',
      balanceText: found ? String(found.openingBalance / 100) : '',
      kind: s.kind,
      institution: s.institution,
      hint: s.hint,
      color: s.color,
      icon: s.icon,
    };
  });
}

export default function AccountsScreen() {
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const isSetup = setup === '1';
  const accounts = useAccounts((s) => s.accounts);
  const add = useAccounts((s) => s.add);
  const update = useAccounts((s) => s.update);
  const remove = useAccounts((s) => s.remove);
  const transactions = useTransactions((s) => s.transactions);
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'wizard' | 'list'>(isSetup || accounts.length === 0 ? 'wizard' : 'list');
  const [drafts, setDrafts] = useState<DraftRow[]>(() => draftsFromSuggestions(accounts));
  const [saving, setSaving] = useState(false);

  const balances = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);

  const patchDraft = (key: string, patch: Partial<DraftRow>) => {
    setDrafts((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const saveWizard = async () => {
    const enabled = drafts.filter((d) => d.enabled);
    if (enabled.length === 0) {
      Alert.alert('Pick at least one account', 'Enable the accounts you actually use.');
      return;
    }
    for (const d of enabled) {
      if (d.institution === 'canara' && d.last4 && !/^\d{4}$/.test(d.last4)) {
        Alert.alert('Check last 4 digits', `${d.name}: enter exactly 4 digits, or leave blank.`);
        return;
      }
      const paise = d.balanceText.trim() === '' ? 0 : parseRupeesToPaise(d.balanceText);
      if (paise === null || paise < 0) {
        Alert.alert('Check balance', `${d.name}: enter a valid amount.`);
        return;
      }
    }

    setSaving(true);
    const existingIds = new Set(accounts.map((a) => a.id));
    const openingDate = new Date().toISOString();
    try {
      for (const d of enabled) {
        const openingBalance = parseRupeesToPaise(d.balanceText.trim() === '' ? '0' : d.balanceText) ?? 0;
        const last4 = /^\d{4}$/.test(d.last4) ? d.last4 : undefined;
        if (existingIds.has(d.key)) {
          update(d.key, {
            name: d.name.trim(),
            last4,
            openingBalance,
            openingDate,
          });
        } else {
          await add({
            key: d.key,
            name: d.name.trim(),
            kind: d.kind,
            institution: d.institution,
            ...(last4 ? { last4 } : {}),
            openingBalance,
            openingDate,
          });
        }
      }
      // Archive suggested accounts the user turned off.
      for (const d of drafts.filter((row) => !row.enabled && existingIds.has(row.key))) {
        remove(d.key);
      }
      haptics.success();
      if (isSetup) router.back();
      else setMode('list');
    } catch (err) {
      haptics.warning();
      Alert.alert('Couldn’t save accounts', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (account: Account) => {
    Alert.alert(`Remove "${account.name}"?`, 'Past transactions keep their history but lose this account tag.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          haptics.warning();
          remove(account.id);
        },
      },
    ]);
  };

  if (mode === 'wizard') {
    return (
      <Screen>
        <Stack.Screen options={{ title: isSetup ? 'Set up accounts' : 'Edit accounts' }} />
        <ScrollView
          contentContainerClassName="px-4 pb-8"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <Text className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Enable the accounts you use and enter today’s balance. Transfers between them won’t inflate income.
          </Text>

          {drafts.map((d) => (
            <Card key={d.key} className="mt-3">
              <Pressable
                onPress={() => patchDraft(d.key, { enabled: !d.enabled })}
                className="flex-row items-center active:opacity-80">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${d.color}22` }}>
                  <Ionicons name={d.icon} size={20} color={d.color} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{d.name}</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">{d.hint}</Text>
                </View>
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border ${
                    d.enabled
                      ? 'border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500'
                      : 'border-slate-300 dark:border-white/20'
                  }`}>
                  {d.enabled ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                </View>
              </Pressable>

              {d.enabled ? (
                <View className="mt-3 gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                  {d.institution === 'canara' ? (
                    <View>
                      <Text className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Last 4 digits (for SMS matching)
                      </Text>
                      <TextInput
                        value={d.last4}
                        onChangeText={(text) => patchDraft(d.key, { last4: text.replace(/\D/g, '').slice(0, 4) })}
                        placeholder="1234"
                        placeholderTextColor={colors.subtle}
                        keyboardType="number-pad"
                        maxLength={4}
                        className="rounded-xl border border-slate-200 bg-surface-light px-3 py-2.5 text-base text-slate-900 dark:border-white/10 dark:bg-surface-dark dark:text-slate-50"
                      />
                    </View>
                  ) : null}
                  <View>
                    <Text className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {d.kind === 'credit' ? 'Amount currently owed (₹)' : 'Current balance (₹)'}
                    </Text>
                    <TextInput
                      value={d.balanceText}
                      onChangeText={(text) => patchDraft(d.key, { balanceText: text.replace(/[^0-9.]/g, '') })}
                      placeholder="0"
                      placeholderTextColor={colors.subtle}
                      keyboardType="decimal-pad"
                      className="rounded-xl border border-slate-200 bg-surface-light px-3 py-2.5 text-base text-slate-900 dark:border-white/10 dark:bg-surface-dark dark:text-slate-50"
                    />
                  </View>
                </View>
              ) : null}
            </Card>
          ))}
        </ScrollView>

        <View
          className="border-t border-slate-200 bg-surface-light px-4 pt-3 dark:border-white/5 dark:bg-surface-dark"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Pressable
            onPress={saveWizard}
            disabled={saving}
            className="h-14 items-center justify-center rounded-2xl bg-brand-600 active:opacity-80 dark:bg-brand-500">
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-bold text-white">Save accounts</Text>
            )}
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: 'Accounts',
          headerRight: () => (
            <Pressable
              onPress={() => {
                setDrafts(draftsFromSuggestions(accounts));
                setMode('wizard');
              }}
              hitSlop={8}
              className="active:opacity-70">
              <Text className="text-base font-semibold text-brand-600 dark:text-brand-400">Edit</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="px-4 pb-10" showsVerticalScrollIndicator={false}>
        <Text className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Balances update from every in and out — including transfers between your accounts.
        </Text>

        {balances.length === 0 ? (
          <Card className="mt-4">
            <Text className="text-sm text-slate-500 dark:text-slate-400">No accounts yet.</Text>
            <Pressable
              onPress={() => setMode('wizard')}
              className="mt-3 h-11 items-center justify-center rounded-xl bg-brand-600 dark:bg-brand-500">
              <Text className="font-semibold text-white">Set up accounts</Text>
            </Pressable>
          </Card>
        ) : (
          balances.map(({ account, balance }) => {
            const color = accountColor(account.id, account.institution);
            return (
              <Card key={account.id} className="mt-3 flex-row items-center">
                <View
                  className="h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${color}22` }}>
                  <Ionicons name={accountIcon(account.kind, account.institution)} size={20} color={color} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{account.name}</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {account.last4 ? `····${account.last4} · ` : ''}
                    {account.kind === 'credit' ? 'Owed' : 'Balance'}
                  </Text>
                </View>
                <Text
                  className={`mr-2 text-base font-bold ${
                    account.kind === 'credit'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-900 dark:text-slate-50'
                  }`}>
                  {formatCurrency(balance)}
                </Text>
                <Pressable onPress={() => confirmDelete(account)} hitSlop={8} className="active:opacity-60">
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </Card>
            );
          })
        )}

        <SectionTitle title="Tips" />
        <Card>
          <Text className="text-sm leading-5 text-slate-600 dark:text-slate-300">
            Missed an SMS? Add it with + and pick the account. Mark self-transfers on the transaction so income
            stays honest.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

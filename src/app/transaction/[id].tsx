import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { AccountPicker } from '@/components/AccountPicker';
import { AmountText } from '@/components/AmountText';
import { Card, SectionTitle } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryPicker } from '@/components/CategoryPicker';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SourceBadge } from '@/components/SourceBadge';
import { TagEditor } from '@/components/TagEditor';
import { WorthItToggle } from '@/components/WorthItToggle';
import { TRANSFERS_CATEGORY_ID } from '@/data/defaultCategories';
import { fullDateTimeLabel } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { useAppColors } from '@/lib/theme';
import { useAccountLookup, useAccounts } from '@/store/useAccounts';
import { useCategoryLookup } from '@/store/useCategories';
import { useTransaction, useTransactions } from '@/store/useTransactions';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useTransaction(id);
  const update = useTransactions((s) => s.update);
  const remove = useTransactions((s) => s.remove);
  const getCategory = useCategoryLookup();
  const getAccount = useAccountLookup();
  const accounts = useAccounts((s) => s.accounts);
  const colors = useAppColors();

  if (!tx) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="Transaction not found"
          message="It may have been deleted."
          action={{ label: 'Go back', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  const category = getCategory(tx.categoryId);
  const account = getAccount(tx.accountId);

  const confirmDelete = () => {
    Alert.alert('Delete transaction?', `${tx.merchant} will be removed from your history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          haptics.warning();
          router.back();
          remove(tx.id);
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: tx.type === 'credit' ? 'Money received' : 'Payment' }} />
      <ScrollView
        contentContainerClassName="px-4 pb-16"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View className="items-center pb-2 pt-4">
          <CategoryIcon category={category} size={64} />
          <Text className="mt-3 text-center text-lg font-semibold text-slate-700 dark:text-slate-200">
            {tx.merchant}
          </Text>
          <AmountText amount={tx.amount} type={tx.type} signed className="mt-1 text-4xl font-bold" />
          {tx.isTransfer ? (
            <View className="mt-2 rounded-full bg-sky-100 px-3 py-1 dark:bg-sky-500/15">
              <Text className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                Between your accounts · not counted as spending
              </Text>
            </View>
          ) : !category ? (
            <View className="mt-2 rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-500/15">
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                What was this for? Pick a category below.
              </Text>
            </View>
          ) : null}
        </View>

        <Card className="mt-4 gap-3">
          <DetailRow label={tx.type === 'credit' ? 'Received in' : 'Paid via'}>
            <SourceBadge source={tx.source} size="md" />
          </DetailRow>
          {account ? (
            <DetailRow label="Account">
              <Text className="text-sm font-medium text-slate-800 dark:text-slate-100">{account.name}</Text>
            </DetailRow>
          ) : null}
          <DetailRow label="When">
            <Text className="text-sm font-medium text-slate-800 dark:text-slate-100">{fullDateTimeLabel(tx.date)}</Text>
          </DetailRow>
          {tx.upiId ? (
            <DetailRow label="UPI ID">
              <Text selectable className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {tx.upiId}
              </Text>
            </DetailRow>
          ) : null}
        </Card>

        <Card className="mt-3 flex-row items-center">
          <View className="mr-3 flex-1">
            <Text className="text-base font-medium text-slate-900 dark:text-slate-50">Transfer between my accounts</Text>
            <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Self transfers and card bill payments. Kept out of spending, income and stats.
            </Text>
          </View>
          <Switch
            value={!!tx.isTransfer}
            onValueChange={(isTransfer) => {
              haptics.tap();
              update(tx.id, {
                isTransfer,
                ...(isTransfer && tx.categoryId === null ? { categoryId: TRANSFERS_CATEGORY_ID } : {}),
              });
            }}
            trackColor={{ true: colors.brand, false: colors.border }}
            thumbColor="#FFFFFF"
          />
        </Card>

        {accounts.length > 0 ? (
          <>
            <SectionTitle title="Account" />
            <AccountPicker
              value={tx.accountId ?? null}
              onChange={(accountId) => update(tx.id, { accountId })}
            />
          </>
        ) : null}

        <SectionTitle title="Category" />
        <CategoryPicker
          value={tx.categoryId}
          type={tx.type}
          onChange={(categoryId) => update(tx.id, { categoryId })}
        />

        {tx.type === 'debit' && !tx.isTransfer ? (
          <>
            <SectionTitle title="Was it worth it?" />
            <WorthItToggle value={tx.worthIt} onChange={(worthIt) => update(tx.id, { worthIt })} />
          </>
        ) : null}

        <SectionTitle title="Note" />
        <TextInput
          value={tx.note ?? ''}
          onChangeText={(note) => update(tx.id, { note: note || undefined })}
          placeholder="What was this for?"
          placeholderTextColor={colors.subtle}
          multiline
          className="min-h-[80px] rounded-2xl border border-slate-200 bg-card-light p-4 text-base text-slate-900 dark:border-white/10 dark:bg-card-dark dark:text-slate-50"
          style={{ textAlignVertical: 'top' }}
        />

        <SectionTitle title="Tags" />
        <TagEditor tags={tx.tags} onChange={(tags) => update(tx.id, { tags })} />

        <Pressable
          onPress={confirmDelete}
          className="mt-10 flex-row items-center justify-center rounded-2xl border border-rose-200 py-3.5 active:bg-rose-50 dark:border-rose-500/30 dark:active:bg-rose-500/10">
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text className="ml-2 font-semibold text-rose-600 dark:text-rose-400">Delete transaction</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-slate-500 dark:text-slate-400">{label}</Text>
      <View className="ml-4 shrink items-end">{children}</View>
    </View>
  );
}

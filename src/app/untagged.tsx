import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';

import { AmountText } from '@/components/AmountText';
import { Card, SectionTitle } from '@/components/Card';
import { CategoryPicker } from '@/components/CategoryPicker';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SourceBadge } from '@/components/SourceBadge';
import { TransactionRow } from '@/components/TransactionRow';
import { fullDateTimeLabel } from '@/lib/dates';
import { formatCurrency } from '@/lib/formatCurrency';
import { haptics } from '@/lib/haptics';
import { untaggedTransactions } from '@/lib/selectors';
import { useAppColors } from '@/lib/theme';
import { usePullToRefresh } from '@/lib/usePullToRefresh';
import { useSettings } from '@/store/useSettings';
import { useTransactions } from '@/store/useTransactions';

export default function UntaggedInboxScreen() {
  const transactions = useTransactions((s) => s.transactions);
  const update = useTransactions((s) => s.update);
  const minPromptAmount = useSettings((s) => s.minPromptAmount);
  const colors = useAppColors();
  const { refreshControlProps } = usePullToRefresh();

  const [skipped, setSkipped] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [taggedCount, setTaggedCount] = useState(0);

  const untagged = useMemo(
    () => untaggedTransactions(transactions, minPromptAmount),
    [transactions, minPromptAmount],
  );
  const queue = untagged.filter((tx) => !skipped.includes(tx.id));
  const current = queue[0];
  const upNext = queue.slice(1, 4);

  if (untagged.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="checkmark-done-circle-outline"
          title="All caught up"
          message={
            taggedCount > 0
              ? `You tagged ${taggedCount} ${taggedCount === 1 ? 'payment' : 'payments'}. Nice work.`
              : 'Every payment has a category.'
          }
          action={{ label: 'Back to home', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  if (!current) {
    return (
      <Screen>
        <EmptyState
          icon="play-skip-forward-circle-outline"
          title={`You skipped ${skipped.length}`}
          message="They'll stay here until you tag them."
          action={{ label: 'Go through skipped', onPress: () => setSkipped([]) }}
        />
      </Screen>
    );
  }

  const tag = (categoryId: string) => {
    update(current.id, { categoryId, note: note.trim() || current.note });
    haptics.success();
    setNote('');
    setTaggedCount((n) => n + 1);
  };

  const skip = () => {
    haptics.tap();
    setSkipped((s) => [...s, current.id]);
    setNote('');
  };

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-4 pb-16"
        refreshControl={<RefreshControl {...refreshControlProps} />}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View className="flex-row items-center justify-between px-1 pb-3 pt-2">
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {queue.length} left · {formatCurrency(queue.reduce((sum, tx) => sum + tx.amount, 0))}
          </Text>
          <Pressable onPress={skip} hitSlop={10} className="flex-row items-center">
            <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">Skip</Text>
            <Ionicons name="play-skip-forward" size={14} color={colors.brand} style={{ marginLeft: 4 }} />
          </Pressable>
        </View>

        <Card className="items-center py-6">
          <Text className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            What was this for?
          </Text>
          <AmountText amount={current.amount} className="mt-2 text-4xl font-bold" />
          <Text className="mt-1 text-lg font-semibold text-slate-700 dark:text-slate-200">{current.merchant}</Text>
          <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">{fullDateTimeLabel(current.date)}</Text>
          <View className="mt-3 flex-row items-center gap-2">
            <SourceBadge source={current.source} size="md" />
          </View>
          {current.upiId ? (
            <Text className="mt-2 text-xs text-slate-400 dark:text-slate-500">{current.upiId}</Text>
          ) : null}
        </Card>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional), then pick a category"
          placeholderTextColor={colors.subtle}
          className="mt-4 rounded-xl border border-slate-200 bg-card-light px-4 py-3 text-base text-slate-900 dark:border-white/10 dark:bg-card-dark dark:text-slate-50"
        />

        <SectionTitle title="Pick a category" />
        <CategoryPicker value={null} onChange={tag} type="debit" />

        {upNext.length > 0 ? (
          <>
            <SectionTitle title="Up next" />
            <Card className="overflow-hidden p-0">
              {upNext.map((tx, i) => (
                <View key={tx.id} className={i > 0 ? 'border-t border-slate-100 dark:border-white/5' : ''}>
                  <TransactionRow transaction={tx} showDate />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <Text className="mt-6 px-2 text-center text-xs text-slate-400 dark:text-slate-500">
          Payments under {formatCurrency(minPromptAmount)} aren’t asked about. You can change this in Settings.
        </Text>
      </ScrollView>
    </Screen>
  );
}

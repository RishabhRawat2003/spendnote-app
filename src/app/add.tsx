import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionTitle } from '@/components/Card';
import { CategoryPicker } from '@/components/CategoryPicker';
import { DateTimeField } from '@/components/DateTimeField';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SourcePicker } from '@/components/SourcePicker';
import { INCOME_CATEGORY_ID } from '@/data/defaultCategories';
import { parseRupeesToPaise } from '@/lib/formatCurrency';
import { haptics } from '@/lib/haptics';
import { useAppColors } from '@/lib/theme';
import { useTransactions } from '@/store/useTransactions';
import type { Source, TransactionType } from '@/types';

const MAX_PAISE = 1_00_00_000 * 100;

export default function AddExpenseScreen() {
  const add = useTransactions((s) => s.add);
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<TransactionType>('debit');
  const [amountText, setAmountText] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [source, setSource] = useState<Source>('cash');
  const [date, setDate] = useState(() => new Date());
  const [note, setNote] = useState('');

  const paise = parseRupeesToPaise(amountText);
  const amountValid = paise !== null && paise > 0 && paise <= MAX_PAISE;
  const canSave = amountValid && merchant.trim().length > 0 && categoryId !== null;

  const missing = !amountValid
    ? 'Enter an amount'
    : !merchant.trim()
      ? `Add who you ${type === 'debit' ? 'paid' : 'got it from'}`
      : !categoryId
        ? 'Pick a category'
        : null;

  const changeType = (next: TransactionType) => {
    setType(next);
    if (next === 'credit') setCategoryId(INCOME_CATEGORY_ID);
    else if (categoryId === INCOME_CATEGORY_ID) setCategoryId(null);
  };

  const save = () => {
    if (!canSave || paise === null) return;
    add({
      amount: paise,
      type,
      merchant: merchant.trim(),
      source,
      date: date.toISOString(),
      categoryId,
      note: note.trim() || undefined,
      worthIt: null,
      tags: [],
    });
    haptics.success();
    router.back();
  };

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View className="pt-2">
          <SegmentedControl
            value={type}
            onChange={changeType}
            options={[
              { value: 'debit', label: 'Expense' },
              { value: 'credit', label: 'Income' },
            ]}
          />
        </View>

        <View className="items-center py-8">
          <View className="flex-row items-center">
            <Text className="text-4xl font-bold text-slate-400 dark:text-slate-500">₹</Text>
            <TextInput
              value={amountText}
              onChangeText={(text) => setAmountText(text.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.subtle}
              keyboardType="decimal-pad"
              autoFocus
              maxLength={11}
              className={`ml-1 min-w-[80px] text-5xl font-bold ${
                type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-50'
              }`}
              style={{ fontVariant: ['tabular-nums'] }}
            />
          </View>
          {amountText && !amountValid ? (
            <Text className="mt-1 text-xs text-rose-500">Enter a valid amount, up to 2 decimals</Text>
          ) : null}
        </View>

        <SectionTitle title={type === 'debit' ? 'Paid to' : 'Received from'} />
        <TextInput
          value={merchant}
          onChangeText={setMerchant}
          placeholder={type === 'debit' ? 'e.g. Chai stall, Auto' : 'e.g. Salary, Friend'}
          placeholderTextColor={colors.subtle}
          className="rounded-xl border border-slate-200 bg-card-light px-4 py-3 text-base text-slate-900 dark:border-white/10 dark:bg-card-dark dark:text-slate-50"
          returnKeyType="next"
        />

        <SectionTitle title="Category" />
        <CategoryPicker value={categoryId} onChange={setCategoryId} type={type} />

        <SectionTitle title={type === 'debit' ? 'Paid via' : 'Received in'} />
        <SourcePicker value={source} onChange={setSource} />

        <SectionTitle title="When" />
        <DateTimeField value={date} onChange={setDate} />

        <SectionTitle title="Note (optional)" />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What was this for?"
          placeholderTextColor={colors.subtle}
          multiline
          className="min-h-[70px] rounded-xl border border-slate-200 bg-card-light px-4 py-3 text-base text-slate-900 dark:border-white/10 dark:bg-card-dark dark:text-slate-50"
          style={{ textAlignVertical: 'top' }}
        />
      </ScrollView>

      <View
        className="border-t border-slate-200 bg-surface-light px-5 pt-3 dark:border-white/5 dark:bg-surface-dark"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <Pressable
          onPress={save}
          disabled={!canSave}
          className={`items-center rounded-2xl py-4 ${
            canSave ? 'bg-brand-600 active:opacity-80 dark:bg-brand-500' : 'bg-slate-200 dark:bg-white/10'
          }`}>
          <Text className={`text-base font-bold ${canSave ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
            {missing ?? `Save ${type === 'debit' ? 'expense' : 'income'}`}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

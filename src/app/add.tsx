import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPicker } from '@/components/AccountPicker';
import { SectionTitle } from '@/components/Card';
import { CategoryPicker } from '@/components/CategoryPicker';
import { DateTimeField } from '@/components/DateTimeField';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SourcePicker } from '@/components/SourcePicker';
import { defaultAccountIdForSource } from '@/data/accounts';
import { INCOME_CATEGORY_ID } from '@/data/defaultCategories';
import { errorMessage } from '@/lib/api';
import { parseRupeesToPaise } from '@/lib/formatCurrency';
import { haptics } from '@/lib/haptics';
import { useAppColors } from '@/lib/theme';
import { useAccounts } from '@/store/useAccounts';
import { useTransactions } from '@/store/useTransactions';
import type { Source, TransactionType } from '@/types';

const MAX_PAISE = 1_00_00_000 * 100;

export default function AddExpenseScreen() {
  const add = useTransactions((s) => s.add);
  const accounts = useAccounts((s) => s.accounts);
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<TransactionType>('debit');
  const [amountText, setAmountText] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [source, setSource] = useState<Source>('cash');
  const [accountId, setAccountId] = useState<string | null>(() =>
    defaultAccountIdForSource('cash', new Set(useAccounts.getState().accounts.map((a) => a.id))),
  );
  const [date, setDate] = useState(() => new Date());
  const [note, setNote] = useState('');
  const [isTransfer, setIsTransfer] = useState(false);
  const [saving, setSaving] = useState(false);

  const needsAccount = accounts.length > 0;
  const paise = parseRupeesToPaise(amountText);
  const amountValid = paise !== null && paise > 0 && paise <= MAX_PAISE;
  const canSave =
    amountValid && merchant.trim().length > 0 && categoryId !== null && (!needsAccount || accountId !== null);

  const missing = !amountValid
    ? 'Enter an amount'
    : !merchant.trim()
      ? `Add who you ${type === 'debit' ? 'paid' : 'got it from'}`
      : !categoryId
        ? 'Pick a category'
        : needsAccount && !accountId
          ? 'Pick an account'
          : null;

  const changeSource = (next: Source) => {
    setSource(next);
    setAccountId(defaultAccountIdForSource(next, new Set(accounts.map((a) => a.id))));
  };

  const changeType = (next: TransactionType) => {
    setType(next);
    if (next === 'credit') setCategoryId(INCOME_CATEGORY_ID);
    else if (categoryId === INCOME_CATEGORY_ID) setCategoryId(null);
  };

  const save = async () => {
    if (!canSave || paise === null || saving) return;
    setSaving(true);
    try {
      await add({
        amount: paise,
        type,
        merchant: merchant.trim(),
        source,
        date: date.toISOString(),
        categoryId,
        accountId,
        note: note.trim() || undefined,
        worthIt: null,
        tags: [],
        isTransfer,
      });
      haptics.success();
      router.back();
    } catch (err) {
      haptics.warning();
      setSaving(false);
      Alert.alert('Couldn’t save', errorMessage(err));
    }
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
        <SourcePicker value={source} onChange={changeSource} />

        {needsAccount ? (
          <>
            <SectionTitle title="Account" />
            <AccountPicker value={accountId} onChange={setAccountId} />
            <Pressable
              onPress={() => {
                haptics.tap();
                setIsTransfer((v) => !v);
              }}
              className="mt-3 flex-row items-center rounded-xl border border-slate-200 bg-card-light px-3 py-3 dark:border-white/10 dark:bg-card-dark">
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
                  isTransfer
                    ? 'border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500'
                    : 'border-slate-300 dark:border-white/20'
                }`}>
                {isTransfer ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  Transfer between my accounts
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Won’t count toward spending or income
                </Text>
              </View>
            </Pressable>
          </>
        ) : null}

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
          disabled={!canSave || saving}
          className={`h-14 items-center justify-center rounded-2xl ${
            canSave ? 'bg-brand-600 active:opacity-80 dark:bg-brand-500' : 'bg-slate-200 dark:bg-white/10'
          }`}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className={`text-base font-bold ${canSave ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
              {missing ?? `Save ${type === 'debit' ? 'expense' : 'income'}`}
            </Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

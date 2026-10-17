import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, Text } from 'react-native';

import { accountColor, accountIcon } from '@/data/accounts';
import { haptics } from '@/lib/haptics';
import { useAccounts } from '@/store/useAccounts';

interface AccountPickerProps {
  value: string | null;
  onChange: (accountId: string) => void;
}

export function AccountPicker({ value, onChange }: AccountPickerProps) {
  const accounts = useAccounts((s) => s.accounts.filter((a) => !a.archived));

  if (accounts.length === 0) {
    return (
      <Text className="text-sm text-slate-500 dark:text-slate-400">
        Add your accounts in Settings so balances stay accurate.
      </Text>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
      keyboardShouldPersistTaps="handled">
      {accounts.map((account) => {
        const selected = account.id === value;
        const color = accountColor(account.id, account.institution);
        return (
          <Pressable
            key={account.id}
            onPress={() => {
              haptics.tap();
              onChange(account.id);
            }}
            className={`flex-row items-center rounded-full border px-3 py-2 ${
              selected ? '' : 'border-slate-200 bg-card-light dark:border-white/10 dark:bg-card-dark'
            }`}
            style={selected ? { backgroundColor: color, borderColor: color } : undefined}>
            <Ionicons
              name={accountIcon(account.kind, account.institution)}
              size={15}
              color={selected ? '#FFFFFF' : color}
            />
            <Text
              className={`ml-1.5 text-sm font-semibold ${
                selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'
              }`}>
              {account.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

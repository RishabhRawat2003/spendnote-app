import { Text } from 'react-native';

import { formatCurrency } from '@/lib/formatCurrency';
import type { TransactionType } from '@/types';

interface AmountTextProps {
  amount: number;
  type?: TransactionType;
  /** Show + / − in front */
  signed?: boolean;
  compact?: boolean;
  className?: string;
}

export function AmountText({ amount, type, signed = false, compact = false, className = '' }: AmountTextProps) {
  const color =
    type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-50';
  return (
    <Text className={`font-semibold ${color} ${className}`} style={{ fontVariant: ['tabular-nums'] }}>
      {formatCurrency(amount, { sign: signed ? type : undefined, compact })}
    </Text>
  );
}

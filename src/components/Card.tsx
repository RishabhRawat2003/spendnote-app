import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
}

export function Card({ children, className = '', onPress }: CardProps) {
  const classes = `rounded-2xl border border-slate-200/70 bg-card-light p-4 dark:border-white/5 dark:bg-card-dark ${className}`;
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${classes} active:opacity-80`}>
        {children}
      </Pressable>
    );
  }
  return <View className={classes}>{children}</View>;
}

interface SectionTitleProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionTitle({ title, action }: SectionTitleProps) {
  return (
    <View className="mb-2 mt-6 flex-row items-center justify-between px-1">
      <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  /** Adds top safe-area padding. Use for tab screens, which have no navigation header. */
  safeTop?: boolean;
  className?: string;
}

export function Screen({ children, safeTop = false, className = '' }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-surface-light dark:bg-surface-dark ${className}`}
      style={safeTop ? { paddingTop: insets.top } : undefined}>
      {children}
    </View>
  );
}

interface ScreenTitleProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenTitle({ title, subtitle, right }: ScreenTitleProps) {
  return (
    <View className="flex-row items-end justify-between px-5 pb-3 pt-4">
      <View className="flex-1">
        {subtitle ? (
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</Text>
        ) : null}
        <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">{title}</Text>
      </View>
      {right}
    </View>
  );
}

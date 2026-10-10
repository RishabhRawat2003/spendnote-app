import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from './Logo';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-surface-light dark:bg-surface-dark">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-grow px-6"
        contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}>
        <Logo size={56} />
        <Text className="mt-6 text-3xl font-bold text-slate-900 dark:text-slate-50">{title}</Text>
        <Text className="mt-2 text-base text-slate-500 dark:text-slate-400">{subtitle}</Text>

        <View className="mt-8 gap-4">{children}</View>

        <View className="flex-1" />
        <View className="mt-8 items-center">{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
}

export function PrimaryButton({ label, onPress, loading = false }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="mt-2 h-14 items-center justify-center rounded-2xl bg-brand-600 active:opacity-80 dark:bg-brand-500">
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-base font-bold text-white">{label}</Text>
      )}
    </Pressable>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View className="flex-row items-start rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
      <Ionicons name="alert-circle" size={16} color="#E11D48" style={{ marginTop: 1 }} />
      <Text className="ml-2 flex-1 text-sm text-rose-700 dark:text-rose-300">{message}</Text>
    </View>
  );
}

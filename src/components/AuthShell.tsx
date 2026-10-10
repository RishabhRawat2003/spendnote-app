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

export function DemoNotice() {
  return (
    <View className="flex-row items-center rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-500/10">
      <Ionicons name="information-circle-outline" size={16} color="#D97706" />
      <Text className="ml-2 flex-1 text-xs text-amber-800 dark:text-amber-200">
        Demo mode: type anything and you’re in. Real accounts come with the backend.
      </Text>
    </View>
  );
}

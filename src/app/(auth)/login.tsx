import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View, type TextInput } from 'react-native';

import { AuthInput } from '@/components/AuthInput';
import { AuthShell, DemoNotice, PrimaryButton } from '@/components/AuthShell';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/store/useAuth';

export default function LoginScreen() {
  const logIn = useAuth((s) => s.logIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    await logIn(email, password);
    haptics.success();
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to see where your money went."
      footer={
        <View className="flex-row">
          <Text className="text-sm text-slate-500 dark:text-slate-400">New to SpendNote? </Text>
          <Pressable onPress={() => router.replace('/signup')} hitSlop={8}>
            <Text className="text-sm font-bold text-brand-600 dark:text-brand-400">Create an account</Text>
          </Pressable>
        </View>
      }>
      <DemoNotice />
      <AuthInput
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <AuthInput
        ref={passwordRef}
        label="Password"
        icon="lock-closed-outline"
        password
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Pressable
        onPress={() => Alert.alert('Forgot password', 'Password reset will work once the backend is ready.')}
        className="self-end"
        hitSlop={8}>
        <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">Forgot password?</Text>
      </Pressable>
      <PrimaryButton label="Log in" onPress={submit} loading={loading} />
    </AuthShell>
  );
}

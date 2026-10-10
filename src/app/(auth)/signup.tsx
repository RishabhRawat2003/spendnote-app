import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View, type TextInput } from 'react-native';

import { AuthInput } from '@/components/AuthInput';
import { AuthShell, DemoNotice, PrimaryButton } from '@/components/AuthShell';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/store/useAuth';

export default function SignUpScreen() {
  const signUp = useAuth((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    await signUp(name, email, password);
    haptics.success();
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking what every rupee was for."
      footer={
        <View className="flex-row">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Already have an account? </Text>
          <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
            <Text className="text-sm font-bold text-brand-600 dark:text-brand-400">Log in</Text>
          </Pressable>
        </View>
      }>
      <DemoNotice />
      <AuthInput
        label="Name"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
      />
      <AuthInput
        ref={emailRef}
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
        placeholder="Create a password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        submitBehavior="submit"
      />
      <AuthInput
        ref={confirmRef}
        label="Confirm password"
        icon="shield-checkmark-outline"
        password
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Type it again"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <PrimaryButton label="Create account" onPress={submit} loading={loading} />
    </AuthShell>
  );
}

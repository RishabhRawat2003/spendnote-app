import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View, type TextInput } from 'react-native';

import { AuthInput } from '@/components/AuthInput';
import { AuthShell, FormError, PrimaryButton } from '@/components/AuthShell';
import { ApiError, errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/store/useAuth';

type Field = 'name' | 'email' | 'password' | 'confirm';

/** Mirrors the server's signup rules so most mistakes are caught before a request. */
function validate(name: string, email: string, password: string, confirm: string): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (name.trim().length < 2) errors.name = 'Enter your name (at least 2 letters)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errors.email = 'Enter a valid email';
  if (password.length < 8) errors.password = 'Use at least 8 characters';
  else if (!/\p{L}/u.test(password) || !/\d/.test(password)) errors.password = 'Include at least one letter and one number';
  else if (password.trim() !== password) errors.password = 'Can’t start or end with a space';
  if (!errors.password && confirm !== password) errors.confirm = 'Passwords don’t match';
  return errors;
}

export default function SignUpScreen() {
  const signUp = useAuth((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const submit = async () => {
    if (loading) return;
    const errors = validate(name, email, password, confirm);
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) {
      haptics.warning();
      return;
    }

    setLoading(true);
    try {
      await signUp(name, email, password);
      haptics.success();
    } catch (err) {
      haptics.warning();
      if (err instanceof ApiError) {
        setFieldErrors({
          name: err.fieldErrors.name?.[0],
          email: err.fieldErrors.email?.[0],
          password: err.fieldErrors.password?.[0],
        });
      }
      setError(errorMessage(err));
      setLoading(false);
    }
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
      <FormError message={error} />
      <AuthInput
        label="Name"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        error={fieldErrors.name}
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
        error={fieldErrors.email}
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
        error={fieldErrors.password}
        hint="At least 8 characters, with a letter and a number"
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
        error={fieldErrors.confirm}
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

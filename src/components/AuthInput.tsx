import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useAppColors } from '@/lib/theme';
import type { IconName } from '@/types';

interface AuthInputProps extends TextInputProps {
  label: string;
  icon: IconName;
  /** Renders a show/hide toggle and hides the text by default */
  password?: boolean;
  /** Shown in red under the field, and turns the border red. */
  error?: string;
  /** Shown in grey under the field when there's no error. */
  hint?: string;
}

export const AuthInput = forwardRef<TextInput, AuthInputProps>(function AuthInput(
  { label, icon, password = false, error, hint, ...inputProps },
  ref,
) {
  const colors = useAppColors();
  const [hidden, setHidden] = useState(password);
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text className="mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</Text>
      <View
        className={`flex-row items-center rounded-2xl border bg-card-light px-4 dark:bg-card-dark ${
          error ? 'border-rose-500' : focused ? 'border-brand-500' : 'border-slate-200 dark:border-white/10'
        }`}>
        <Ionicons name={icon} size={18} color={focused ? colors.brand : colors.subtle} />
        <TextInput
          ref={ref}
          placeholderTextColor={colors.subtle}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          className="ml-3 flex-1 py-3.5 text-base text-slate-900 dark:text-slate-50"
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</Text>
      ) : null}
    </View>
  );
});

import '../../global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { useAppColors } from '@/lib/theme';
import { useAuth } from '@/store/useAuth';
import { useSettings } from '@/store/useSettings';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const themePreference = useSettings((s) => s.theme);
  const isLoggedIn = useAuth((s) => s.user !== null);
  const colors = useAppColors();
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    colorScheme.set(themePreference);
  }, [themePreference]);

  const navigationTheme = useMemo<Theme>(() => {
    const base = colors.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brand,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={colors.isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="transaction/[id]" options={{ title: 'Transaction' }} />
            <Stack.Screen name="add" options={{ title: 'Add expense', presentation: 'modal' }} />
            <Stack.Screen name="untagged" options={{ title: 'Untagged' }} />
            <Stack.Screen name="categories" options={{ title: 'Categories' }} />
          </Stack.Protected>
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
        {showSplash ? <AnimatedSplash onFinish={hideSplash} /> : null}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

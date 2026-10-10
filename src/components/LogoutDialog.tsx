import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { useAppColors } from '@/lib/theme';

const EXIT_MS = 160;

interface LogoutDialogProps {
  visible: boolean;
  name: string;
  email: string;
  initials: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LogoutDialog({ visible, name, email, initials, onCancel, onConfirm }: LogoutDialogProps) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const [loggingOut, setLoggingOut] = useState(false);

  if (visible && !mounted) {
    setMounted(true);
    setLoggingOut(false);
  }

  const backdrop = useSharedValue(0);
  const card = useSharedValue(0);
  const iconTilt = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      haptics.warning();
      backdrop.set(withTiming(1, { duration: 200 }));
      card.set(reduceMotion ? withTiming(1, { duration: 150 }) : withSpring(1, { damping: 18, stiffness: 240, mass: 0.8 }));
      if (!reduceMotion) {
        iconTilt.set(
          withDelay(
            180,
            withSequence(
              withTiming(-12, { duration: 90 }),
              withTiming(10, { duration: 110 }),
              withTiming(-6, { duration: 100 }),
              withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) }),
            ),
          ),
        );
      }
      return;
    }
    backdrop.set(withTiming(0, { duration: EXIT_MS }));
    card.set(withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.quad) }));
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [visible, reduceMotion, backdrop, card, iconTilt]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, card.get() * 1.5),
    transform: [{ translateY: (1 - card.get()) * 24 }, { scale: 0.92 + card.get() * 0.08 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${iconTilt.get()}deg` }] }));

  const confirm = () => {
    if (loggingOut) return;
    haptics.press();
    setLoggingOut(true);
    setTimeout(() => {
      haptics.success();
      onConfirm();
    }, 650);
  };

  const cancel = () => {
    if (loggingOut) return;
    haptics.tap();
    onCancel();
  };

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={cancel}>
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropStyle]}
          className="bg-black/50">
          <Pressable className="flex-1" onPress={cancel} accessibilityLabel="Dismiss" />
        </Animated.View>

        <Animated.View
          style={cardStyle}
          className="w-full max-w-sm rounded-3xl bg-card-light p-6 dark:bg-card-dark"
          accessibilityViewIsModal
          accessibilityRole="alert">
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/20">
                <Animated.View style={iconStyle}>
                  <Ionicons name="log-out-outline" size={24} color={colors.danger} />
                </Animated.View>
              </View>
            </View>

            <Text className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-50">Log out?</Text>
            <Text className="mt-1.5 text-center text-sm leading-5 text-slate-500 dark:text-slate-400">
              Your expenses stay saved in your account. Log in again any time to see them.
            </Text>
          </View>

          <View className="mt-5 flex-row items-center rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-600 dark:bg-brand-500">
              <Text className="font-bold text-white">{initials}</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text numberOfLines={1} className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {name}
              </Text>
              <Text numberOfLines={1} className="text-xs text-slate-500 dark:text-slate-400">
                {email}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={cancel}
              disabled={loggingOut}
              className="flex-1 items-center rounded-2xl bg-slate-100 py-3.5 active:opacity-70 dark:bg-white/10">
              <Text className="font-semibold text-slate-700 dark:text-slate-200">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirm}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-rose-600 py-3.5 active:opacity-80">
              {loggingOut ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="ml-2 font-semibold text-white">Logging out…</Text>
                </>
              ) : (
                <Text className="font-semibold text-white">Log out</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

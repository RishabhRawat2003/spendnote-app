import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Bottom sheet built on the core Modal, so it works in Expo Go without extra native modules. */
export function Sheet({ visible, title, onClose, children, footer }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View
          className="max-h-[80%] rounded-t-3xl bg-card-light dark:bg-card-dark"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="items-center pt-2.5">
            <View className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
          </View>
          <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">Done</Text>
            </Pressable>
          </View>
          <ScrollView className="px-5" contentContainerClassName="pb-4" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View className="px-5 pt-2">{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

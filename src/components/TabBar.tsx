import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { haptics } from '@/lib/haptics';
import { useAppColors } from '@/lib/theme';
import type { IconName } from '@/types';

const BAR_HEIGHT = 64;
const BAR_PADDING = 6;
const SIDE_MARGIN = 20;
const SLIDE_SPRING = { damping: 22, stiffness: 260, mass: 0.7 };
const PRESS_SPRING = { damping: 15, stiffness: 400 };

type TabIcons = Record<string, [active: IconName, inactive: IconName]>;

/**
 * The navigator renders `TabBarBridge` (which draws nothing) and the visible bar lives outside
 * the scenes. That's required for the Android blur: a BlurView must not be inside its BlurTargetView.
 */
const useTabBarState = create<{ props: BottomTabBarProps | null }>(() => ({ props: null }));

export function TabBarBridge(props: BottomTabBarProps) {
  useLayoutEffect(() => {
    useTabBarState.setState({ props });
  });
  useEffect(() => () => useTabBarState.setState({ props: null }), []);
  return null;
}

function useBottomOffset() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12) + 4;
}

/** Bottom padding tab screens need so their last items can scroll clear of the floating bar. */
export function useTabBarSpace() {
  return useBottomOffset() + BAR_HEIGHT;
}

interface FloatingTabBarProps {
  blurTarget: RefObject<View | null>;
  icons: TabIcons;
}

export function FloatingTabBar({ blurTarget, icons }: FloatingTabBarProps) {
  const props = useTabBarState((s) => s.props);
  if (!props) return null;
  return <GlassTabBar {...props} blurTarget={blurTarget} icons={icons} />;
}

function GlassTabBar({
  state,
  descriptors,
  navigation,
  blurTarget,
  icons,
}: BottomTabBarProps & FloatingTabBarProps) {
  const colors = useAppColors();
  const { isDark } = colors;
  const bottom = useBottomOffset();
  const position = useSharedValue(state.index);
  const tabWidth = useSharedValue(0);
  const hidden = useSharedValue(0);
  const target = useRef(state.index);

  const slideTo = (index: number) => {
    if (target.current === index) return;
    target.current = index;
    position.set(withSpring(index, SLIDE_SPRING));
  };

  // Keeps the pill in sync when navigation happens from elsewhere (e.g. "See all" on Home).
  useEffect(() => {
    if (target.current !== state.index) {
      target.current = state.index;
      position.set(withSpring(state.index, SLIDE_SPRING));
    }
  }, [state.index, position]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => hidden.set(withTiming(1, { duration: 180 })));
    const hide = Keyboard.addListener('keyboardDidHide', () => hidden.set(withTiming(0, { duration: 220 })));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [hidden]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.get(),
    transform: [{ translateY: hidden.get() * (BAR_HEIGHT + bottom) }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: tabWidth.get() > 0 ? 1 : 0,
    width: tabWidth.get(),
    transform: [{ translateX: position.get() * tabWidth.get() }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: SIDE_MARGIN,
          right: SIDE_MARGIN,
          bottom,
          height: BAR_HEIGHT,
          borderRadius: BAR_HEIGHT / 2,
          boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.55)' : '0 10px 30px rgba(15, 23, 42, 0.14)',
        },
        barStyle,
      ]}>
      <View
        style={{
          flex: 1,
          borderRadius: BAR_HEIGHT / 2,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.7)',
        }}>
        <BlurView
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={Platform.OS === 'android' ? 80 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: isDark ? 'rgba(22, 22, 29, 0.45)' : 'rgba(255, 255, 255, 0.45)',
          }}
        />

        <View
          className="flex-1 flex-row"
          style={{ padding: BAR_PADDING }}
          onLayout={(e) =>
            tabWidth.set((e.nativeEvent.layout.width - BAR_PADDING * 2) / state.routes.length)
          }>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: BAR_PADDING,
                left: BAR_PADDING,
                bottom: BAR_PADDING,
                borderRadius: (BAR_HEIGHT - BAR_PADDING * 2) / 2,
                backgroundColor: isDark ? 'rgba(129, 140, 248, 0.20)' : 'rgba(79, 70, 229, 0.12)',
              },
              pillStyle,
            ]}
          />

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;
            const [activeIcon, inactiveIcon] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (focused || event.defaultPrevented) return;
              slideTo(index);
              haptics.tap();
              navigation.navigate(route.name, route.params);
            };

            return (
              <TabItem
                key={route.key}
                index={index}
                position={position}
                label={label}
                focused={focused}
                activeIcon={activeIcon}
                inactiveIcon={inactiveIcon}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

interface TabItemProps {
  index: number;
  position: SharedValue<number>;
  label: string;
  focused: boolean;
  activeIcon: IconName;
  inactiveIcon: IconName;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ index, position, label, focused, activeIcon, inactiveIcon, onPress, onLongPress }: TabItemProps) {
  const colors = useAppColors();
  const pressScale = useSharedValue(1);
  const { muted, brand } = colors;

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.get() }] }));
  const activeIconStyle = useAnimatedStyle(() => {
    const focus = Math.max(0, 1 - Math.abs(position.get() - index));
    return { opacity: focus, transform: [{ scale: 0.85 + focus * 0.15 }] };
  });
  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, 1 - Math.abs(position.get() - index)),
  }));
  const labelStyle = useAnimatedStyle(() => {
    const focus = Math.max(0, 1 - Math.abs(position.get() - index));
    return { color: interpolateColor(focus, [0, 1], [muted, brand]) };
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => pressScale.set(withSpring(0.9, PRESS_SPRING))}
      onPressOut={() => pressScale.set(withSpring(1, PRESS_SPRING))}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      unstable_pressDelay={0}
      className="flex-1">
      <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, containerStyle]}>
        <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute' }, inactiveIconStyle]}>
            <Ionicons name={inactiveIcon} size={22} color={muted} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute' }, activeIconStyle]}>
            <Ionicons name={activeIcon} size={22} color={brand} />
          </Animated.View>
        </View>
        <Animated.Text numberOfLines={1} style={[{ fontSize: 10, fontWeight: '600', marginTop: 2 }, labelStyle]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

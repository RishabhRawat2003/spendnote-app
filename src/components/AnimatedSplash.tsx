import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';

const TILE = 104;
const TILE_RADIUS = TILE * 0.3;
const WORD_HEIGHT = 46;

/** Milliseconds from mount. Scaled down when the OS asks for reduced motion. */
const T = {
  glow: 0,
  tile: 80,
  icon: 380,
  coin: 620,
  land: 700,
  shimmer: 820,
  word: 760,
  wordStagger: 90,
  tagline: 1150,
  exit: 2250,
  exitFade: 220,
  exitSlide: 520,
};

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

interface AnimatedSplashProps {
  onFinish: () => void;
}

/** Branded launch intro. Takes over from the native splash, then lifts away like a curtain. */
export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const k = reduceMotion ? 0.4 : 1;

  const glow = useSharedValue(0);
  const tile = useSharedValue(0);
  const icon = useSharedValue(0);
  const coin = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const word1 = useSharedValue(0);
  const word2 = useSharedValue(0);
  const tagline = useSharedValue(0);
  const contentOut = useSharedValue(0);
  const curtain = useSharedValue(0);

  useEffect(() => {
    SplashScreen.hide();

    glow.set(
      withDelay(
        T.glow * k,
        withSequence(
          withTiming(1, { duration: 900, easing: EASE_OUT }),
          withRepeat(withTiming(0.82, { duration: 1100, easing: EASE_IN_OUT }), -1, true),
        ),
      ),
    );
    tile.set(withDelay(T.tile * k, withSpring(1, { damping: 14, stiffness: 140, mass: 0.9 })));
    icon.set(withDelay(T.icon * k, withSpring(1, { damping: 9, stiffness: 180 })));
    coin.set(withDelay(T.coin * k, withSpring(1, { damping: 7, stiffness: 220 })));
    shimmer.set(withDelay(T.shimmer * k, withTiming(1, { duration: 750, easing: EASE_IN_OUT })));
    word1.set(withDelay(T.word * k, withTiming(1, { duration: 650, easing: EASE_OUT })));
    word2.set(withDelay((T.word + T.wordStagger) * k, withTiming(1, { duration: 650, easing: EASE_OUT })));
    tagline.set(withDelay(T.tagline * k, withTiming(1, { duration: 600, easing: EASE_OUT })));
    contentOut.set(withDelay(T.exit * k, withTiming(1, { duration: T.exitFade, easing: Easing.in(Easing.quad) })));
    curtain.set(
      withDelay(T.exit * k + T.exitFade * 0.6, withTiming(1, { duration: T.exitSlide, easing: EASE_IN_OUT })),
    );

    const landTimer = setTimeout(haptics.press, T.land * k);
    const doneTimer = setTimeout(onFinish, T.exit * k + T.exitFade * 0.6 + T.exitSlide);
    return () => {
      clearTimeout(landTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish, k, glow, tile, icon, coin, shimmer, word1, word2, tagline, contentOut, curtain]);

  const curtainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -curtain.get() * height }],
    borderBottomLeftRadius: curtain.get() * 48,
    borderBottomRightRadius: curtain.get() * 48,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: 1 - contentOut.get(),
    transform: [{ scale: 1 - contentOut.get() * 0.06 }, { translateY: -contentOut.get() * 12 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.get(),
    transform: [{ scale: 0.6 + glow.get() * 0.4 }],
  }));
  const tileStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, tile.get() * 2),
    transform: [{ scale: 0.18 + tile.get() * 0.82 }],
  }));
  // Starts as a circle (dot) and settles into the rounded-square app tile.
  const tileShapeStyle = useAnimatedStyle(() => ({
    borderRadius: TILE / 2 - (TILE / 2 - TILE_RADIUS) * Math.min(1, tile.get()),
  }));
  const tileClipStyle = useAnimatedStyle(() => ({
    borderRadius: TILE / 2 - (TILE / 2 - TILE_RADIUS) * Math.min(1, tile.get()),
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, icon.get() * 2),
    transform: [{ scale: icon.get() }, { rotate: `${(1 - icon.get()) * -35}deg` }],
  }));
  const coinStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, coin.get() * 3),
    transform: [{ translateY: (1 - coin.get()) * -34 }, { scale: 0.6 + coin.get() * 0.4 }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.get() > 0 && shimmer.get() < 1 ? 1 : 0,
    transform: [{ translateX: -TILE * 1.2 + shimmer.get() * TILE * 2.4 }, { rotate: '20deg' }],
  }));
  const word1Style = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - word1.get()) * WORD_HEIGHT }] }));
  const word2Style = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - word2.get()) * WORD_HEIGHT }] }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.get(),
    transform: [{ translateY: (1 - tagline.get()) * 8 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.curtain, curtainStyle]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#6366F1', '#4F46E5', '#312E81']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.center, contentStyle]}>
        <View style={styles.logoArea}>
          <Animated.View style={[styles.glow, glowStyle]}>
            <View style={[styles.glowLayer, { width: 280, height: 280, opacity: 0.07 }]} />
            <View style={[styles.glowLayer, { width: 210, height: 210, opacity: 0.09 }]} />
            <View style={[styles.glowLayer, { width: 150, height: 150, opacity: 0.12 }]} />
          </Animated.View>

          <Animated.View style={[styles.tileShadow, tileStyle, tileShapeStyle]}>
            <Animated.View style={[styles.tileClip, tileClipStyle]}>
              <LinearGradient
                colors={['#FFFFFF', '#EEF2FF', '#E0E7FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Animated.View style={[styles.shimmer, shimmerStyle]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <Animated.View style={iconStyle}>
                <Ionicons name="wallet" size={TILE * 0.5} color="#4F46E5" />
              </Animated.View>
              <Animated.View style={[styles.coin, coinStyle]} />
            </Animated.View>
          </Animated.View>
        </View>

        <View style={styles.wordRow}>
          <View style={styles.wordMask}>
            <Animated.Text style={[styles.word, word1Style]}>Spend</Animated.Text>
          </View>
          <View style={styles.wordMask}>
            <Animated.Text style={[styles.word, styles.wordAccent, word2Style]}>Note</Animated.Text>
          </View>
        </View>

        <Animated.Text style={[styles.tagline, taglineStyle]}>Know what every rupee was for</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  curtain: { zIndex: 100, overflow: 'hidden', backgroundColor: '#4F46E5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoArea: { width: 280, height: 200, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glowLayer: { position: 'absolute', borderRadius: 999, backgroundColor: '#FFFFFF' },
  tileShadow: {
    width: TILE,
    height: TILE,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
    backgroundColor: '#FFFFFF',
  },
  tileClip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmer: { position: 'absolute', top: -TILE * 0.5, width: TILE * 0.35, height: TILE * 2 },
  coin: {
    position: 'absolute',
    right: TILE * 0.15,
    bottom: TILE * 0.15,
    width: TILE * 0.22,
    height: TILE * 0.22,
    borderRadius: TILE * 0.11,
    backgroundColor: '#FBBF24',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  wordRow: { flexDirection: 'row', marginTop: 6 },
  wordMask: { height: WORD_HEIGHT, overflow: 'hidden', justifyContent: 'flex-end' },
  word: { fontSize: 38, lineHeight: WORD_HEIGHT, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  wordAccent: { color: '#C7D2FE' },
  tagline: { marginTop: 10, fontSize: 15, fontWeight: '500', color: '#E0E7FF', letterSpacing: 0.2 },
});

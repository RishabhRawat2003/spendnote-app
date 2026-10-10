import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

interface LogoProps {
  size?: number;
  /** "brand": indigo tile with white mark. "light": white tile with indigo mark, for indigo backgrounds. */
  variant?: 'brand' | 'light';
}

export function Logo({ size = 56, variant = 'brand' }: LogoProps) {
  const radius = size * 0.3;
  const light = variant === 'light';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        shadowColor: '#1E1B4B',
        shadowOpacity: 0.35,
        shadowRadius: size * 0.25,
        shadowOffset: { width: 0, height: size * 0.12 },
        elevation: 12,
      }}>
      <LinearGradient
        colors={light ? ['#FFFFFF', '#E0E7FF'] : ['#818CF8', '#4F46E5', '#3730A3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            top: -size * 0.35,
            left: -size * 0.2,
            width: size * 1.1,
            height: size * 0.75,
            borderRadius: size,
            backgroundColor: light ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.14)',
          }}
        />
        <Ionicons name="wallet" size={size * 0.5} color={light ? '#4F46E5' : '#FFFFFF'} />
        <View
          style={{
            position: 'absolute',
            right: size * 0.16,
            bottom: size * 0.16,
            width: size * 0.22,
            height: size * 0.22,
            borderRadius: size * 0.11,
            backgroundColor: '#FBBF24',
            borderWidth: Math.max(1.5, size * 0.035),
            borderColor: light ? '#FFFFFF' : '#4F46E5',
          }}
        />
      </LinearGradient>
    </View>
  );
}

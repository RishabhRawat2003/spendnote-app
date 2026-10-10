import { useColorScheme } from 'nativewind';

/** Raw colours for places that can't take a className (icons, charts, navigation). Keep in sync with tailwind.config.js. */
export const palette = {
  light: {
    background: '#F6F7FB',
    card: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    subtle: '#94A3B8',
    border: '#E5E7EB',
    brand: '#4F46E5',
    brandSoft: '#EEF2FF',
    danger: '#DC2626',
    success: '#16A34A',
  },
  dark: {
    background: '#0B0B10',
    card: '#16161D',
    text: '#F1F5F9',
    muted: '#94A3B8',
    subtle: '#64748B',
    border: '#26262F',
    brand: '#818CF8',
    brandSoft: '#1E1B4B',
    danger: '#F87171',
    success: '#4ADE80',
  },
};

export type AppColors = typeof palette.light;

export function useAppColors(): AppColors & { isDark: boolean } {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return { ...(isDark ? palette.dark : palette.light), isDark };
}

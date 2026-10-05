import type { TextStyle } from 'react-native';
export const colors = {
  background: '#090B0F',
  surface: '#11151B',
  elevated: '#171C23',
  text: '#F4F7FA',
  secondary: '#98A2B3',
  muted: '#667085',
  primary: '#39D98A',
  primarySoft: '#67E8B2',
  warning: '#F4B942',
  danger: '#FF5D5D',
  border: '#232A34',
  activeBorder: '#2F8F68',
} as const;
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;
export const radius = {
  small: 8,
  medium: 12,
  large: 16,
  xl: 24,
  full: 999,
} as const;
export const sizes = {
  touch: 48,
  icon: 22,
  content: 560,
  tabIcon: 22,
} as const;
export const typography = {
  display: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    lineHeight: 58,
    letterSpacing: -2,
  },
  h1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -1,
  },
  h2: { fontFamily: 'Inter_600SemiBold', fontSize: 24, lineHeight: 32 },
  h3: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 28 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20 },
  metric: { fontFamily: 'Inter_700Bold', fontSize: 40, lineHeight: 48 },
} satisfies Record<string, TextStyle>;
export type TextVariant = keyof typeof typography;

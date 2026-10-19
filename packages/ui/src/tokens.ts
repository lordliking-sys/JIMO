import type { TextStyle } from 'react-native';
/** Active presentation palette. Dark surfaces are reserved for immersive workouts/heroes. */
export const animePink = {
  background: '#FFF7FA',
  surface: '#FFF7FA',
  surfaceRaised: '#FFF9FC',
  surfaceSoft: '#FFF0F5',
  surfaceDark: '#18131C',
  ink: '#1D1723',
  textPrimary: '#211927',
  textSecondary: '#756A78',
  primaryPink: '#FF4D8D',
  primaryPinkSoft: '#FF8DB5',
  primaryPinkPale: '#FFD9E7',
  magenta: '#D83F8A',
  primaryAction: '#D92D73',
  primaryText: '#C52A68',
  white: '#FFFFFF',
  border: 'rgba(193,100,142,0.22)',
  darkOverlay: 'rgba(15,8,18,0.25)',
  danger: '#B4233C',
  darkBorder: 'rgba(255,141,181,0.24)',
  darkMuted: '#C9BACB',
} as const;
/** Restrained depth shared by light surfaces; immersive workout surfaces keep their palette. */
export const uiDepth = {
  card: {
    shadowColor: '#B6517E',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  action: {
    shadowColor: '#C53473',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  input: {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        color: 'rgba(147,67,103,0.08)',
        inset: true,
      },
    ],
  },
} satisfies Record<string, import('react-native').ViewStyle>;
export const colors = {
  background: animePink.background,
  surface: animePink.surface,
  elevated: animePink.surfaceSoft,
  text: animePink.textPrimary,
  secondary: animePink.textSecondary,
  muted: animePink.textSecondary,
  primary: animePink.primaryAction,
  primarySoft: animePink.primaryPinkSoft,
  warning: '#8B5719',
  danger: animePink.danger,
  border: animePink.border,
  activeBorder: animePink.primaryPink,
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
  medium: 18,
  large: 20,
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

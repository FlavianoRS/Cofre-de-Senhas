import { MD3DarkTheme } from 'react-native-paper';

export const colors = {
  background: '#070A0F',
  backgroundSoft: '#0B1018',
  surface: '#111925',
  surfaceRaised: '#182334',
  border: '#27364B',
  primary: '#3157B7',
  primaryDeep: '#1E3A8A',
  primarySoft: '#172A58',
  accent: '#D45A1F',
  accentSoft: '#3A1D12',
  text: '#F7F9FC',
  textMuted: '#93A4B8',
  textDim: '#64748B',
  danger: '#F87171',
  success: '#34D399',
  white: '#FFFFFF',
} as const;

export const radius = {
  small: 10,
  medium: 16,
  large: 24,
  pill: 999,
} as const;

export const appTheme = {
  ...MD3DarkTheme,
  roundness: radius.medium,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primarySoft,
    secondary: colors.accent,
    secondaryContainer: colors.accentSoft,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceRaised,
    outline: colors.border,
    error: colors.danger,
    onPrimary: colors.white,
    onBackground: colors.text,
    onSurface: colors.text,
    onSurfaceVariant: colors.textMuted,
  },
};

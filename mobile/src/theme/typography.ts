// ============================================
// Typography Scale
// ============================================

import { TextStyle } from 'react-native';

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  base: 16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
} as const;

export const FontWeight: Record<string, TextStyle['fontWeight']> = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  extrabold:'800',
};

export const LineHeight = {
  tight:  1.2,
  normal: 1.5,
  loose:  1.8,
} as const;

// Pre-built text style presets used across the app
export const TextStyles = {
  // Headings
  h1: {
    fontSize:   FontSize['4xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['4xl'] * 1.2,
  } as TextStyle,

  h2: {
    fontSize:   FontSize['3xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['3xl'] * 1.2,
  } as TextStyle,

  h3: {
    fontSize:   FontSize['2xl'],
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize['2xl'] * 1.3,
  } as TextStyle,

  h4: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.xl * 1.3,
  } as TextStyle,

  // Body
  bodyLarge: {
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.lg * 1.5,
  } as TextStyle,

  body: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.base * 1.5,
  } as TextStyle,

  bodySmall: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.md * 1.5,
  } as TextStyle,

  // Labels
  label: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.sm * 1.4,
    letterSpacing: 0.3,
  } as TextStyle,

  labelSmall: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.5,
  } as TextStyle,

  // Button text
  button: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  } as TextStyle,

  buttonSmall: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  } as TextStyle,

  // Caption
  caption: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.xs * 1.4,
  } as TextStyle,
} as const;

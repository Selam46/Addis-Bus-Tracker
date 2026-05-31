export const COLORS = {
  // Primary Brand Colors
  primary: '#0A7075',       // Rich teal used for buttons, primary branding, and headers
  primaryDark: '#075256',   // Darker shade for active/pressed states
  primaryLight: '#E6F4F4',  // Light tint for card backgrounds or notifications

  // Secondary Accent Colors
  secondary: '#1A939C',     // Bright teal for highlights, secondary callouts
  secondaryLight: '#E8F6F7',

  // Status/Alert Colors
  success: '#10B981',       // Safe/On-time indicator
  warning: '#F59E0B',       // Delay indicator
  danger: '#EF4444',        // Out of service or critical alerts
  info: '#3B82F6',

  // Neutrals (Slate scale for modern visual hierarchy)
  background: '#FFFFFF',    // Screen backgrounds
  surface: '#F8FAFC',       // Secondary background / card surfaces
  border: '#E2E8F0',        // Subtle divider lines
  
  text: '#0F172A',          // Primary readable text (Slate 900)
  textMuted: '#475569',     // Secondary/body captions (Slate 600)
  textLight: '#94A3B8',     // Disabled or hint texts (Slate 400)
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const ROUNDNESS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
};

export const TYPOGRAPHY = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const theme = {
  colors: COLORS,
  spacing: SPACING,
  roundness: ROUNDNESS,
  shadows: SHADOWS,
  typography: TYPOGRAPHY,
};

export default theme;

export const LIGHT_COLORS = {
  // Primary Brand Colors (Vibrant Teal)
  primary: '#0A7075',       // Rich deep teal
  primaryDark: '#075256',   // Slate teal
  primaryLight: '#E6F4F4',  // Very soft teal tint

  // Secondary Accent Colors (Dark Navy)
  secondary: '#0F172A',     // Slate Navy 900
  secondaryLight: '#1E293B', // Slate Navy 800
  secondaryTint: '#F1F5F9',  // Slate Tint

  // Accent Color (Vibrant Orange - for ETAs, warning chips, focus highlights)
  accent: '#F97316',        // Orange
  accentLight: '#FFEDD5',   // Soft warm orange tint

  // Status/Alert Colors
  success: '#10B981',       // Safe/On-time indicator (Emerald Green)
  successLight: '#D1FAE5',  // Light green tint
  warning: '#F59E0B',       // Delay indicator (Amber)
  warningLight: '#FEF3C7',  // Light amber tint
  danger: '#EF4444',        // Out of service / alert (Coral Red)
  dangerLight: '#FEE2E2',   // Light red tint
  info: '#3B82F6',          // Information blue

  // Neutrals (Slate scale for modern visual hierarchy)
  background: '#FFFFFF',    // Screen backgrounds
  surface: '#F8FAFC',       // Secondary background / card surfaces
  surfaceCard: '#FFFFFF',   // Card background
  border: '#F1F5F9',        // Subtle divider lines
  borderDark: '#E2E8F0',    // Slate 200 bold divider
  
  text: '#0F172A',          // Primary slate navy text
  textMuted: '#475569',     // Secondary slate text
  textLight: '#94A3B8',     // Hint or disabled text
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const DARK_COLORS = {
  // Primary Brand Colors (Vibrant Teal in Dark mode)
  primary: '#0D9488',       // Slightly brighter Teal for dark mode contrast
  primaryDark: '#0F766E',   // Darker teal
  primaryLight: '#115E59',  // Deep teal container

  // Secondary Accent Colors (Dark Navy -> Light Navy)
  secondary: '#F8FAFC',     // Slate Light Text
  secondaryLight: '#CBD5E1', // Slate 300
  secondaryTint: '#1E293B',  // Slate Tint (dark)

  // Accent Color (Vibrant Orange)
  accent: '#FB923C',        // Light orange for dark contrast
  accentLight: '#431407',   // Dark orange tint

  // Status/Alert Colors
  success: '#34D399',       // Emerald Green
  successLight: '#064E3B',  // Dark green container
  warning: '#FBBF24',       // Amber
  warningLight: '#78350F',  // Dark amber container
  danger: '#F87171',        // Red
  dangerLight: '#7F1D1D',   // Dark red container
  info: '#60A5FA',          // Information blue

  // Neutrals for dark mode
  background: '#0F172A',    // Deep Navy Slate 900
  surface: '#1E293B',       // Slate 800 for surfaces
  surfaceCard: '#1E293B',   // Card background (dark)
  border: '#334155',        // Slate 700 dividers
  borderDark: '#475569',    // Slate 600 bold divider
  
  text: '#F8FAFC',          // Primary light slate text
  textMuted: '#CBD5E1',     // Secondary slate 300 text
  textLight: '#64748B',     // Hint slate 500 text
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const COLORS = { ...LIGHT_COLORS };

export const updateThemeColors = (mode: 'light' | 'dark') => {
  const palette = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  Object.keys(palette).forEach((key) => {
    (COLORS as any)[key] = (palette as any)[key];
  });
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

import React from 'react';
import { Text as RNText, StyleSheet, TextProps } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../theme/theme';

interface CustomTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodySemibold' | 'caption' | 'button';
  color?: string;
}

export const Text: React.FC<CustomTextProps> = ({
  children,
  variant = 'body',
  color = COLORS.text,
  style,
  ...props
}) => {
  return (
    <RNText
      style={[
        styles.base,
        styles[variant],
        { color },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    // Falls back to system fonts (Inter/San Francisco on iOS, Roboto on Android)
    fontFamily: SystemFontFamily(), 
  },
  h1: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: 32,
  },
  h2: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.semibold,
    lineHeight: 28,
  },
  h3: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.medium,
    lineHeight: 24,
  },
  body: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.regular,
    lineHeight: 22,
  },
  bodySemibold: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    lineHeight: 22,
  },
  caption: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.regular,
    lineHeight: 18,
    color: COLORS.textMuted,
  },
  button: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    lineHeight: 20,
  },
});

function SystemFontFamily() {
  // Return standard system font sans-serif
  return undefined; 
}

export default Text;

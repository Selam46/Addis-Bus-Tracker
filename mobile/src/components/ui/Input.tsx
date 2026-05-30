// ============================================
// Reusable Input Component
// ============================================
// Features:
//   - Label above the field
//   - Focus ring (teal border)
//   - Inline error message below
//   - Password toggle (show/hide eye icon)
//   - Fully compatible with react-hook-form

import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../theme';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?:       string;
  error?:       string;   // Validation error message
  isPassword?:  boolean;  // Shows eye toggle instead of keyboard type
  hint?:        string;   // Optional helper text below the field
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, isPassword = false, hint, style, ...rest }, ref) => {
    const [isFocused,  setIsFocused]  = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const hasError = !!error;

    const borderColor = hasError
      ? Colors.error
      : isFocused
      ? Colors.borderFocus
      : Colors.border;

    return (
      <View style={styles.wrapper}>
        {/* Label */}
        {label ? (
          <Text style={[styles.label, hasError && styles.labelError]}>
            {label}
          </Text>
        ) : null}

        {/* Input row */}
        <View style={[styles.inputRow, { borderColor }]}>
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={Colors.textMuted}
            secureTextEntry={isPassword && !showSecret}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize={isPassword ? 'none' : rest.autoCapitalize}
            autoCorrect={isPassword ? false : rest.autoCorrect}
            {...rest}
          />

          {/* Password eye toggle */}
          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowSecret((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showSecret ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Error or hint text */}
        {hasError ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={13} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : hint ? (
          <Text style={styles.hintText}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';
export default Input;

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },

  label: {
    fontSize:     FontSize.sm,
    fontWeight:   FontWeight.semibold,
    color:        Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },

  labelError: {
    color: Colors.error,
  },

  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderWidth:     1.5,
    borderRadius:    Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight:       52,
  },

  input: {
    flex:      1,
    fontSize:  FontSize.base,
    color:     Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },

  eyeBtn: {
    paddingLeft: Spacing.sm,
  },

  errorRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    marginTop:      Spacing.xs,
  },

  errorText: {
    fontSize:  FontSize.xs,
    color:     Colors.error,
    flex:      1,
  },

  hintText: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    marginTop: Spacing.xs,
  },
});

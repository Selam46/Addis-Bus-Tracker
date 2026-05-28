import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { COLORS, ROUNDNESS } from '../../theme/theme';
import Text from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  isPassword = false,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!isPassword);

  const containerStyle = [
    styles.inputContainer,
    isFocused && styles.focused,
    error && styles.errorBorder,
  ];

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="caption" color={COLORS.textMuted} style={styles.label}>
          {label}
        </Text>
      )}
      <View style={containerStyle}>
        {icon && (
          <Text style={styles.icon}>{icon}</Text>
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={COLORS.textLight}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !isPasswordVisible}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.eyeIcon}>
              {isPasswordVisible ? '👁️' : '🙈'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text variant="caption" color={COLORS.danger} style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDNESS.lg,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
  },
  focused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  errorBorder: {
    borderColor: COLORS.danger,
  },
  icon: {
    marginRight: 10,
    fontSize: 18,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.text,
    fontSize: 16,
  },
  eyeButton: {
    marginLeft: 10,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    marginTop: 4,
  },
});

export default Input;

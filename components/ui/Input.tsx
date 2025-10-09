import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View, Text, TextStyle, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ResponsiveUtils, TouchTargets, Typography, PlatformType, Spacing } from '@/constants/responsive';

interface InputProps extends TextInputProps {
  label?: string;
  labelColor?: string;
  labelStyle?: TextStyle;
  error?: string;
  helperText?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Input({
  label,
  labelColor,
  labelStyle,
  error,
  helperText,
  required = false,
  size = 'md',
  ...props
}: InputProps) {
  const scheme = useColorScheme() ?? 'light';
  const [isFocused, setIsFocused] = useState(false);

  const base = {
    backgroundColor: Colors[scheme].card,
    borderColor: error ? '#DC2626' : isFocused ? Colors[scheme].tint : Colors[scheme].border,
    color: Colors[scheme].text,
  } as const;

  const placeholderColor = scheme === 'light' ? '#64748B' : '#94A3B8';
  const errorColor = '#DC2626';
  const helperColor = scheme === 'light' ? '#6B7280' : '#9CA3AF';

  // Size configurations
  const sizeConfig = {
    sm: {
      fontSize: Typography.sm,
      paddingVertical: 8,
      paddingHorizontal: 12,
      minHeight: TouchTargets.minimum,
    },
    md: {
      fontSize: Typography.base,
      paddingVertical: 12,
      paddingHorizontal: 16,
      minHeight: TouchTargets.recommended,
    },
    lg: {
      fontSize: Typography.lg,
      paddingVertical: 16,
      paddingHorizontal: 20,
      minHeight: TouchTargets.large,
    },
  };

  const currentSize = sizeConfig[size];
  const borderRadius = ResponsiveUtils.getBorderRadius('md');

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: labelColor || Colors[scheme].text,
              fontSize: ResponsiveUtils.fontSize(Typography.sm),
            },
            labelStyle
          ]}
        >
          {label}
          {required && <Text style={{ color: errorColor }}> *</Text>}
        </Text>
      )}

      <TextInput
        {...props}
        placeholderTextColor={placeholderColor}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          base,
          {
            fontSize: ResponsiveUtils.fontSize(currentSize.fontSize),
            paddingVertical: currentSize.paddingVertical,
            paddingHorizontal: currentSize.paddingHorizontal,
            minHeight: currentSize.minHeight,
            borderRadius,
            borderWidth: isFocused ? 2 : 1,
          },
          props.multiline && styles.multiline,
          error && styles.errorInput,
          props.style,
        ]}
        // Accessibility improvements
        accessibilityLabel={label}
        accessibilityHint={helperText || error}
        accessibilityRequired={required}
        // Platform-specific optimizations
        autoCorrect={props.keyboardType === 'email-address' ? false : props.autoCorrect}
        textContentType={props.secureTextEntry ? 'password' : props.textContentType}
        // Web-specific improvements
        {...(PlatformType.isWeb && {
          autoComplete: props.autoComplete || (props.secureTextEntry ? 'current-password' : 'off'),
        })}
      />

      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            {
              color: error ? errorColor : helperColor,
              fontSize: ResponsiveUtils.fontSize(Typography.xs),
            }
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontWeight: '600',
    marginBottom: Spacing.xs,
    // Ensure label is always readable
    includeFontPadding: false,
  },
  input: {
    // Web-specific styles for better UX
    ...(PlatformType.isWeb && {
      outlineStyle: 'none',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    }),
    // Ensure consistent appearance across platforms
    includeFontPadding: false,
  },
  multiline: {
    minHeight: TouchTargets.large * 2,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  errorInput: {
    borderColor: '#DC2626',
  },
  helperText: {
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
});

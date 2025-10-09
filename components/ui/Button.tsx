import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, Platform, AccessibilityRole } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ResponsiveUtils, TouchTargets, Typography, PlatformType } from '@/constants/responsive';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export function Button({
  title,
  onPress,
  disabled,
  style,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const primaryBg = Colors[scheme].tint;

  const bgByVariant: Record<Variant, string> = {
    primary: primaryBg,
    secondary: scheme === 'light' ? '#E5E7EB' : '#374151',
    danger: '#DC2626',
  };

  const fgByVariant: Record<Variant, string> = {
    primary: '#ffffff',
    secondary: Colors[scheme].text,
    danger: '#ffffff',
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: Typography.sm,
      minHeight: TouchTargets.minimum,
    },
    md: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: Typography.base,
      minHeight: TouchTargets.recommended,
    },
    lg: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      fontSize: Typography.lg,
      minHeight: TouchTargets.large,
    },
  };

  const currentSize = sizeConfig[size];
  const borderRadius = ResponsiveUtils.getBorderRadius('md');
  const shadow = ResponsiveUtils.getShadow('sm');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button" as AccessibilityRole
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed, hovered }) => [
        styles.base,
        {
          backgroundColor: bgByVariant[variant],
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          minHeight: currentSize.minHeight,
          borderRadius,
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        // Web-specific hover effects
        PlatformType.isWeb && hovered && !disabled && {
          opacity: 0.9,
          transform: [{ scale: 1.02 }],
        },
        // Platform-specific shadows
        !disabled && shadow,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: fgByVariant[variant],
            fontSize: ResponsiveUtils.fontSize(currentSize.fontSize),
          }
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit={PlatformType.isMobile}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure consistent touch targets across platforms
    minWidth: TouchTargets.minimum,
    // Web-specific styles
    ...(PlatformType.isWeb && {
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'all 0.2s ease',
    }),
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    // Ensure text is always readable
    includeFontPadding: false,
  },
});

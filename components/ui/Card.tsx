import React, { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle, Pressable } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ResponsiveUtils, Spacing, PlatformType } from '@/constants/responsive';

interface CardProps {
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Card({
  children,
  style,
  variant = 'default',
  padding = 'md',
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: PropsWithChildren<CardProps>) {
  const scheme = useColorScheme() ?? 'light';
  const bg = Colors[scheme].card;
  const border = Colors[scheme].border;

  // Padding configurations
  const paddingConfig = {
    none: 0,
    sm: Spacing.sm,
    md: Spacing.md,
    lg: Spacing.lg,
  };

  // Variant configurations
  const variantStyles = {
    default: {
      backgroundColor: bg,
      borderColor: border,
      borderWidth: StyleSheet.hairlineWidth,
      ...ResponsiveUtils.getShadow('sm'),
    },
    elevated: {
      backgroundColor: bg,
      borderWidth: 0,
      ...ResponsiveUtils.getShadow('md'),
    },
    outlined: {
      backgroundColor: 'transparent',
      borderColor: border,
      borderWidth: 1,
    },
  };

  const borderRadius = ResponsiveUtils.getBorderRadius('md');
  const cardPadding = paddingConfig[padding];

  const cardStyle = [
    styles.card,
    variantStyles[variant],
    {
      borderRadius,
      padding: cardPadding,
    },
    style,
  ];

  // If onPress is provided, make it pressable
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed, hovered }) => [
          ...cardStyle,
          {
            opacity: pressed ? 0.95 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          },
          // Web-specific hover effects
          PlatformType.isWeb && hovered && {
            ...ResponsiveUtils.getShadow('lg'),
            transform: [{ scale: 1.02 }],
          },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Ensure consistent appearance across platforms
    overflow: 'hidden',
    // Web-specific styles
    ...(PlatformType.isWeb && {
      transition: 'all 0.2s ease',
      cursor: 'default',
    }),
  },
});

/**
 * Responsive layout components for consistent spacing and alignment
 * across different screen sizes and platforms
 */

import React, { PropsWithChildren } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResponsiveUtils, Spacing, Layout as LayoutConstants, DeviceType, PlatformType } from '@/constants/responsive';

interface ContainerProps {
  style?: ViewStyle;
  maxWidth?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  safeArea?: boolean;
  center?: boolean;
}

interface StackProps {
  style?: ViewStyle;
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
}

interface GridProps {
  style?: ViewStyle;
  columns?: number | 'auto';
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  minItemWidth?: number;
}

// Container component for consistent page layout
export function Container({ 
  children, 
  style, 
  maxWidth = true,
  padding = 'md',
  safeArea = false,
  center = false,
}: PropsWithChildren<ContainerProps>) {
  const insets = useSafeAreaInsets();

  const paddingConfig = {
    none: 0,
    sm: Spacing.responsive.sm,
    md: Spacing.responsive.md,
    lg: Spacing.responsive.lg,
    xl: Spacing.responsive.xl,
  };

  const containerPadding = paddingConfig[padding];
  const containerMaxWidth = maxWidth ? LayoutConstants.getContainerWidth() : undefined;

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: containerPadding,
          paddingTop: safeArea ? insets.top + containerPadding : containerPadding,
          paddingBottom: safeArea ? insets.bottom + containerPadding : containerPadding,
          maxWidth: containerMaxWidth,
          alignSelf: center ? 'center' : 'stretch',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Scrollable container with responsive design
export function ScrollContainer({
  children,
  style,
  maxWidth = true,
  padding = 'md',
  safeArea = false,
  ...scrollProps
}: PropsWithChildren<ContainerProps & ScrollViewProps>) {
  const insets = useSafeAreaInsets();

  const paddingConfig = {
    none: 0,
    sm: Spacing.responsive.sm,
    md: Spacing.responsive.md,
    lg: Spacing.responsive.lg,
    xl: Spacing.responsive.xl,
  };

  const containerPadding = paddingConfig[padding];
  const containerMaxWidth = maxWidth ? LayoutConstants.getContainerWidth() : undefined;

  return (
    <ScrollView
      {...scrollProps}
      style={[styles.scrollContainer, style]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: containerPadding,
          paddingTop: safeArea ? insets.top + containerPadding : containerPadding,
          paddingBottom: safeArea ? insets.bottom + containerPadding : containerPadding,
          maxWidth: containerMaxWidth,
          alignSelf: maxWidth ? 'center' : 'stretch',
          width: '100%',
        },
        scrollProps.contentContainerStyle,
      ]}
      // Platform-specific optimizations
      keyboardShouldPersistTaps={scrollProps.keyboardShouldPersistTaps || "handled"}
      showsVerticalScrollIndicator={!PlatformType.isWeb}
    >
      {children}
    </ScrollView>
  );
}

// Stack component for consistent spacing between elements
export function Stack({ 
  children, 
  style,
  spacing = 'md',
  direction = 'column',
  align = 'stretch',
  justify = 'start',
  wrap = false,
}: PropsWithChildren<StackProps>) {
  const spacingConfig = {
    xs: Spacing.responsive.xs,
    sm: Spacing.responsive.sm,
    md: Spacing.responsive.md,
    lg: Spacing.responsive.lg,
    xl: Spacing.responsive.xl,
  };

  const alignItems = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  } as const;

  const justifyContent = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  } as const;

  const gap = spacingConfig[spacing];

  return (
    <View
      style={[
        {
          flexDirection: direction,
          alignItems: alignItems[align],
          justifyContent: justifyContent[justify],
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Grid component for responsive layouts
export function Grid({ 
  children, 
  style,
  columns = 'auto',
  spacing = 'md',
  minItemWidth = 200,
}: PropsWithChildren<GridProps>) {
  const spacingConfig = {
    xs: Spacing.responsive.xs,
    sm: Spacing.responsive.sm,
    md: Spacing.responsive.md,
    lg: Spacing.responsive.lg,
    xl: Spacing.responsive.xl,
  };

  const gap = spacingConfig[spacing];
  const gridColumns = columns === 'auto' ? LayoutConstants.getGridColumns() : columns;
  
  // Calculate item width accounting for gap
  // For 2 columns: each item = (100% - gap) / 2 = ~48%
  // For 4 columns: each item = (100% - 3*gap) / 4 = ~23%
  const calculateItemWidth = () => {
    if (columns === 'auto') {
      return undefined; // Let flex handle it
    }
    
    // Simple percentage calculation
    // For 2 columns: 48%, for 3 columns: 31%, for 4 columns: 23%
    const widthPercentages: { [key: number]: number } = {
      2: 48,
      3: 31,
      4: 23,
    };
    
    return `${widthPercentages[gridColumns] || 48}%`;
  };

  const itemWidth = calculateItemWidth();

  return (
    <View
      style={[
        styles.grid,
        {
          gap,
          width: '100%',
        },
        style,
      ]}
    >
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={[
            styles.gridItem,
            columns === 'auto' ? {
              flex: 1,
              minWidth: minItemWidth,
            } : {
              width: itemWidth,
              flexShrink: 0,
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

// Responsive row component
export function Row({ 
  children, 
  style,
  spacing = 'md',
  align = 'center',
  justify = 'start',
  wrap = true,
}: PropsWithChildren<Omit<StackProps, 'direction'>>) {
  return (
    <Stack
      direction="row"
      spacing={spacing}
      align={align}
      justify={justify}
      wrap={wrap}
      style={style}
    >
      {children}
    </Stack>
  );
}

// Responsive column component
export function Column({ 
  children, 
  style,
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
}: PropsWithChildren<Omit<StackProps, 'direction' | 'wrap'>>) {
  return (
    <Stack
      direction="column"
      spacing={spacing}
      align={align}
      justify={justify}
      style={style}
    >
      {children}
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    // Remove width: '100%' to prevent ScrollView layout issues
    // Width will be handled by the container
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  gridItem: {
    // Ensure grid items don't overflow
    minWidth: 0,
  },
});

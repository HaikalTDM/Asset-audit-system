/**
 * Responsive design utilities for cross-platform compatibility
 * Provides consistent sizing, spacing, and breakpoints across Android, iOS, and Web
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

// Get device dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Device type detection
export const DeviceType = {
  isPhone: screenWidth < 768,
  isTablet: screenWidth >= 768 && screenWidth < 1024,
  isDesktop: screenWidth >= 1024,
  isSmallPhone: screenWidth < 375,
  isLargePhone: screenWidth >= 414,
} as const;

// Platform detection
export const PlatformType = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
  isMobile: Platform.OS === 'ios' || Platform.OS === 'android',
} as const;

// Responsive breakpoints
export const Breakpoints = {
  xs: 0,     // Extra small devices (phones)
  sm: 576,   // Small devices (large phones)
  md: 768,   // Medium devices (tablets)
  lg: 992,   // Large devices (desktops)
  xl: 1200,  // Extra large devices (large desktops)
} as const;

// Touch target sizes (following platform guidelines)
export const TouchTargets = {
  // iOS Human Interface Guidelines: 44pt minimum
  // Android Material Design: 48dp minimum
  minimum: PlatformType.isIOS ? 44 : 48,
  recommended: PlatformType.isIOS ? 48 : 52,
  large: PlatformType.isIOS ? 56 : 60,
} as const;

// Responsive spacing system
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Responsive spacing based on screen size
  responsive: {
    xs: DeviceType.isPhone ? 4 : 6,
    sm: DeviceType.isPhone ? 8 : 12,
    md: DeviceType.isPhone ? 16 : 20,
    lg: DeviceType.isPhone ? 24 : 32,
    xl: DeviceType.isPhone ? 32 : 48,
  },
} as const;

// Typography scale with responsive sizing
export const Typography = {
  // Base font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  
  // Responsive typography
  responsive: {
    caption: DeviceType.isPhone ? 12 : 14,
    body: DeviceType.isPhone ? 16 : 18,
    subtitle: DeviceType.isPhone ? 18 : 20,
    title: DeviceType.isPhone ? 24 : 28,
    heading: DeviceType.isPhone ? 30 : 36,
    display: DeviceType.isPhone ? 36 : 48,
  },
} as const;

// Responsive utility functions
export const ResponsiveUtils = {
  // Get responsive value based on screen size
  getResponsiveValue: <T>(values: {
    phone?: T;
    tablet?: T;
    desktop?: T;
    default: T;
  }): T => {
    if (DeviceType.isDesktop && values.desktop !== undefined) {
      return values.desktop;
    }
    if (DeviceType.isTablet && values.tablet !== undefined) {
      return values.tablet;
    }
    if (DeviceType.isPhone && values.phone !== undefined) {
      return values.phone;
    }
    return values.default;
  },

  // Scale size based on screen density
  scale: (size: number): number => {
    return PixelRatio.roundToNearestPixel(size);
  },

  // Get responsive width percentage
  widthPercentage: (percentage: number): number => {
    return (screenWidth * percentage) / 100;
  },

  // Get responsive height percentage
  heightPercentage: (percentage: number): number => {
    return (screenHeight * percentage) / 100;
  },

  // Get responsive font size
  fontSize: (size: number): number => {
    const scale = screenWidth / 375; // Base on iPhone 6/7/8 width
    const newSize = size * scale;
    
    // Limit scaling to prevent too large/small text
    if (newSize < 12) return 12;
    if (newSize > 48) return 48;
    
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  },

  // Get safe area padding for different platforms
  getSafeAreaPadding: () => {
    if (PlatformType.isIOS) {
      return {
        paddingTop: 44, // Status bar + navigation
        paddingBottom: 34, // Home indicator
      };
    }
    if (PlatformType.isAndroid) {
      return {
        paddingTop: 24, // Status bar
        paddingBottom: 0,
      };
    }
    // Web
    return {
      paddingTop: 0,
      paddingBottom: 0,
    };
  },

  // Get platform-specific border radius
  getBorderRadius: (size: 'sm' | 'md' | 'lg' | 'xl') => {
    const radii = {
      sm: PlatformType.isIOS ? 8 : 4,
      md: PlatformType.isIOS ? 12 : 8,
      lg: PlatformType.isIOS ? 16 : 12,
      xl: PlatformType.isIOS ? 24 : 16,
    };
    return radii[size];
  },

  // Get platform-specific shadow
  getShadow: (elevation: 'sm' | 'md' | 'lg') => {
    if (PlatformType.isIOS) {
      const shadows = {
        sm: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        md: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        lg: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
      };
      return shadows[elevation];
    } else {
      // Android elevation
      const elevations = {
        sm: { elevation: 2 },
        md: { elevation: 4 },
        lg: { elevation: 8 },
      };
      return elevations[elevation];
    }
  },
};

// Layout utilities
export const Layout = {
  // Container max widths for different screen sizes
  container: {
    sm: 540,
    md: 720,
    lg: 960,
    xl: 1140,
  },
  
  // Get responsive container width
  getContainerWidth: (): number => {
    if (DeviceType.isDesktop) return Layout.container.xl;
    if (DeviceType.isTablet) return Layout.container.lg;
    return screenWidth - (Spacing.md * 2); // Full width with padding on mobile
  },

  // Get responsive grid columns
  getGridColumns: (): number => {
    if (DeviceType.isDesktop) return 4;
    if (DeviceType.isTablet) return 3;
    return 2; // Mobile
  },
};

// Accessibility helpers
export const Accessibility = {
  // Minimum touch target size
  minTouchTarget: TouchTargets.minimum,
  
  // Recommended touch target size
  recommendedTouchTarget: TouchTargets.recommended,
  
  // Get accessible font size (never below 16px for readability)
  getAccessibleFontSize: (size: number): number => {
    return Math.max(size, 16);
  },
  
  // Color contrast ratios (WCAG guidelines)
  contrast: {
    normal: 4.5,  // AA standard
    large: 3,     // AA standard for large text
    enhanced: 7,  // AAA standard
  },
};

export default {
  DeviceType,
  PlatformType,
  Breakpoints,
  TouchTargets,
  Spacing,
  Typography,
  ResponsiveUtils,
  Layout,
  Accessibility,
};

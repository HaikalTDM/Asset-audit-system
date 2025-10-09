/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Accessible brand tint (green) that passes contrast on both themes
const tintColorLight = '#16a34a'; // green-600
const tintColorDark = '#22c55e';  // green-500

export const Colors = {
  light: {
    text: '#111827',
    background: '#F8FAFC',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    border: '#E5E7EB',
  },
  dark: {
    text: '#E8E8E8',          // Off-white (softer than pure white)
    background: '#121212',    // Google Material Design standard (OLED-friendly)
    tint: tintColorDark,
    icon: '#B3B3B3',          // Light grey for icons
    tabIconDefault: '#808080', // Medium grey for inactive tabs
    tabIconSelected: tintColorDark,
    card: '#1E1E1E',          // Elevated surface (Material Design)
    border: '#2C2C2C',        // Subtle border (slightly lighter than card)
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

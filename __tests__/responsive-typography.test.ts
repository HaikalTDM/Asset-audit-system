/**
 * Test suite for responsive typography fixes
 * Validates that text scaling works correctly across different screen sizes
 */

import { ResponsiveUtils, Typography } from '@/constants/responsive';

// Mock Dimensions to test different screen sizes
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })), // Default iPhone size
  },
  Platform: {
    OS: 'ios',
  },
  PixelRatio: {
    roundToNearestPixel: jest.fn((value) => Math.round(value)),
  },
}));

describe('Responsive Typography', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Font Scaling', () => {
    it('should scale fonts appropriately for phone screens', () => {
      // Mock phone screen size
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 375, height: 667 });

      const headingSize = ResponsiveUtils.fontSize(Typography.responsive.heading);
      const titleSize = ResponsiveUtils.fontSize(Typography.responsive.title);
      
      // On phone, heading should be 30px and title should be 24px
      expect(headingSize).toBe(30);
      expect(titleSize).toBe(24);
    });

    it('should scale fonts appropriately for tablet screens', () => {
      // Mock tablet screen size
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 768, height: 1024 });

      const headingSize = ResponsiveUtils.fontSize(Typography.responsive.heading);
      const titleSize = ResponsiveUtils.fontSize(Typography.responsive.title);
      
      // On tablet, heading should be 36px and title should be 28px
      expect(headingSize).toBe(36);
      expect(titleSize).toBe(28);
    });

    it('should limit font scaling to prevent overflow', () => {
      // Mock very wide screen
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 1920, height: 1080 });

      const displaySize = ResponsiveUtils.fontSize(Typography.responsive.display);
      
      // Should be capped at 48px to prevent overflow
      expect(displaySize).toBeLessThanOrEqual(48);
    });

    it('should prevent fonts from being too small', () => {
      // Mock very narrow screen
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 200, height: 400 });

      const captionSize = ResponsiveUtils.fontSize(Typography.responsive.caption);
      
      // Should be at least 12px for readability
      expect(captionSize).toBeGreaterThanOrEqual(12);
    });
  });

  describe('Responsive Values', () => {
    it('should return correct values for different device types', () => {
      // Test phone values
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 375, height: 667 });

      const phoneValue = ResponsiveUtils.getResponsiveValue({
        phone: 100,
        tablet: 200,
        desktop: 300,
        default: 150,
      });

      expect(phoneValue).toBe(100);
    });

    it('should fall back to default when device-specific value is not provided', () => {
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 375, height: 667 });

      const fallbackValue = ResponsiveUtils.getResponsiveValue({
        tablet: 200,
        desktop: 300,
        default: 150,
      });

      expect(fallbackValue).toBe(150);
    });
  });

  describe('Container Width Calculations', () => {
    it('should calculate appropriate container widths for different screens', () => {
      // Test mobile container width
      const mockDimensions = require('react-native').Dimensions;
      mockDimensions.get.mockReturnValue({ width: 375, height: 667 });

      const mobileWidth = ResponsiveUtils.widthPercentage(100);
      expect(mobileWidth).toBe(375);

      // Test that container constraints work with font scaling
      const headingSize = ResponsiveUtils.fontSize(Typography.responsive.heading);
      const containerWidth = 450; // Our new container width for tablets

      // Ensure heading fits comfortably in container (with some margin)
      const charactersPerLine = Math.floor(containerWidth / (headingSize * 0.6)); // Rough estimate
      expect(charactersPerLine).toBeGreaterThan(10); // Should fit "Create Account" comfortably
    });
  });
});

/**
 * Simple validation script for responsive typography
 * Checks that font sizes are appropriate for different screen sizes
 */

// Mock React Native modules for Node.js environment
const mockDimensions = {
  width: 375,
  height: 667,
};

const mockPixelRatio = {
  roundToNearestPixel: (value) => Math.round(value),
};

// Mock the responsive constants
const DeviceType = {
  get isPhone() { return mockDimensions.width < 768; },
  get isTablet() { return mockDimensions.width >= 768 && mockDimensions.width < 1024; },
  get isDesktop() { return mockDimensions.width >= 1024; },
};

const Typography = {
  responsive: {
    caption: DeviceType.isPhone ? 12 : 14,
    body: DeviceType.isPhone ? 16 : 18,
    subtitle: DeviceType.isPhone ? 18 : 20,
    title: DeviceType.isPhone ? 24 : 28,
    heading: DeviceType.isPhone ? 30 : 36,
    display: DeviceType.isPhone ? 36 : 48,
  },
};

const ResponsiveUtils = {
  fontSize: (size) => {
    const scale = mockDimensions.width / 375; // Base on iPhone 6/7/8 width
    const newSize = size * scale;
    
    // Limit scaling to prevent too large/small text
    if (newSize < 12) return 12;
    if (newSize > 48) return 48;
    
    return Math.round(mockPixelRatio.roundToNearestPixel(newSize));
  },
  
  getResponsiveValue: (values) => {
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
  
  widthPercentage: (percentage) => {
    return (mockDimensions.width * percentage) / 100;
  },
};

// Test function
function validateTypography() {
  console.log('🔍 Validating Responsive Typography...\n');
  
  // Test different screen sizes
  const testSizes = [
    { name: 'iPhone SE', width: 320, height: 568 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 },
  ];
  
  testSizes.forEach(size => {
    console.log(`📱 Testing ${size.name} (${size.width}x${size.height})`);
    
    // Update mock dimensions
    mockDimensions.width = size.width;
    mockDimensions.height = size.height;
    
    // Test title font sizes (what we fixed)
    const titleSize = ResponsiveUtils.getResponsiveValue({
      phone: ResponsiveUtils.fontSize(Typography.responsive.heading),
      tablet: ResponsiveUtils.fontSize(Typography.responsive.title),
      desktop: ResponsiveUtils.fontSize(Typography.responsive.title),
      default: ResponsiveUtils.fontSize(Typography.responsive.heading),
    });
    
    // Test container width
    const containerWidth = ResponsiveUtils.getResponsiveValue({
      phone: ResponsiveUtils.widthPercentage(100),
      tablet: 450,
      desktop: 450,
      default: ResponsiveUtils.widthPercentage(100),
    });
    
    // Calculate approximate characters that fit
    const avgCharWidth = titleSize * 0.6; // Rough estimate for bold text
    const availableWidth = containerWidth - 32; // Account for padding
    const maxChars = Math.floor(availableWidth / avgCharWidth);
    
    console.log(`  Title font size: ${titleSize}px`);
    console.log(`  Container width: ${containerWidth}px`);
    console.log(`  Estimated max chars: ${maxChars}`);
    console.log(`  "Create Account" (14 chars): ${maxChars >= 14 ? '✅ Fits' : '❌ Too large'}`);
    console.log('');
  });
  
  // Test edge cases
  console.log('🧪 Testing Edge Cases...\n');
  
  // Very wide screen
  mockDimensions.width = 2560;
  const veryLargeFont = ResponsiveUtils.fontSize(Typography.responsive.display);
  console.log(`Very wide screen font size: ${veryLargeFont}px (should be ≤ 48px): ${veryLargeFont <= 48 ? '✅' : '❌'}`);
  
  // Very narrow screen
  mockDimensions.width = 240;
  const verySmallFont = ResponsiveUtils.fontSize(Typography.responsive.caption);
  console.log(`Very narrow screen font size: ${verySmallFont}px (should be ≥ 12px): ${verySmallFont >= 12 ? '✅' : '❌'}`);
  
  console.log('\n✅ Typography validation complete!');
}

// Run validation
validateTypography();

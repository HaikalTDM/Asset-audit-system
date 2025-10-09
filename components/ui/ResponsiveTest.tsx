/**
 * Test component to verify responsive design implementation
 * This component can be temporarily added to any screen to test responsive features
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Container, Column, Row, Grid } from './Layout';
import { ResponsiveUtils, DeviceType, PlatformType, Typography, Spacing } from '@/constants/responsive';

export function ResponsiveTest() {
  return (
    <Container padding="lg">
      <Column spacing="lg">
        {/* Device Info */}
        <Card variant="outlined" padding="md">
          <Column spacing="sm">
            <Text style={{ fontSize: Typography.lg, fontWeight: 'bold' }}>
              Device Information
            </Text>
            <Text>Device Type: {DeviceType.isPhone ? 'Phone' : DeviceType.isTablet ? 'Tablet' : 'Desktop'}</Text>
            <Text>Platform: {PlatformType.isIOS ? 'iOS' : PlatformType.isAndroid ? 'Android' : 'Web'}</Text>
            <Text>Screen Width: {ResponsiveUtils.widthPercentage(100)}px</Text>
          </Column>
        </Card>

        {/* Button Tests */}
        <Card variant="elevated" padding="md">
          <Column spacing="md">
            <Text style={{ fontSize: Typography.lg, fontWeight: 'bold' }}>
              Button Sizes
            </Text>
            <Column spacing="sm">
              <Button title="Small Button" size="sm" />
              <Button title="Medium Button" size="md" />
              <Button title="Large Button" size="lg" />
              <Button title="Full Width Button" size="md" fullWidth />
            </Column>
          </Column>
        </Card>

        {/* Input Tests */}
        <Card variant="default" padding="md">
          <Column spacing="md">
            <Text style={{ fontSize: Typography.lg, fontWeight: 'bold' }}>
              Input Sizes
            </Text>
            <Column spacing="sm">
              <Input label="Small Input" size="sm" placeholder="Small size" />
              <Input label="Medium Input" size="md" placeholder="Medium size" />
              <Input label="Large Input" size="lg" placeholder="Large size" />
              <Input 
                label="Input with Error" 
                error="This field is required" 
                placeholder="Error state"
              />
              <Input 
                label="Input with Helper" 
                helperText="This is helper text" 
                placeholder="Helper text"
              />
            </Column>
          </Column>
        </Card>

        {/* Grid Test */}
        <Card variant="elevated" padding="md">
          <Column spacing="md">
            <Text style={{ fontSize: Typography.lg, fontWeight: 'bold' }}>
              Responsive Grid
            </Text>
            <Grid columns="auto" spacing="md">
              <Card variant="outlined" padding="sm">
                <Text>Grid Item 1</Text>
              </Card>
              <Card variant="outlined" padding="sm">
                <Text>Grid Item 2</Text>
              </Card>
              <Card variant="outlined" padding="sm">
                <Text>Grid Item 3</Text>
              </Card>
              <Card variant="outlined" padding="sm">
                <Text>Grid Item 4</Text>
              </Card>
            </Grid>
          </Column>
        </Card>

        {/* Typography Test */}
        <Card variant="default" padding="md">
          <Column spacing="sm">
            <Text style={{ fontSize: Typography.lg, fontWeight: 'bold' }}>
              Responsive Typography
            </Text>
            <Text style={{ fontSize: ResponsiveUtils.fontSize(Typography.xs) }}>
              Extra Small Text (xs)
            </Text>
            <Text style={{ fontSize: ResponsiveUtils.fontSize(Typography.sm) }}>
              Small Text (sm)
            </Text>
            <Text style={{ fontSize: ResponsiveUtils.fontSize(Typography.base) }}>
              Base Text (base)
            </Text>
            <Text style={{ fontSize: ResponsiveUtils.fontSize(Typography.lg) }}>
              Large Text (lg)
            </Text>
            <Text style={{ fontSize: ResponsiveUtils.fontSize(Typography.xl) }}>
              Extra Large Text (xl)
            </Text>
            <Text style={{ fontSize: ResponsiveUtils.fontSize(Typography['2xl']) }}>
              2XL Text (2xl)
            </Text>
          </Column>
        </Card>

        {/* Spacing Test */}
        <Card variant="outlined" padding="md">
          <Column spacing="md">
            <Text style={{ fontSize: Typography.lg, fontWeight: 'bold' }}>
              Spacing System
            </Text>
            <Row spacing="xs">
              <View style={{ width: 20, height: 20, backgroundColor: 'red' }} />
              <Text>XS Spacing ({Spacing.xs}px)</Text>
            </Row>
            <Row spacing="sm">
              <View style={{ width: 20, height: 20, backgroundColor: 'orange' }} />
              <Text>SM Spacing ({Spacing.sm}px)</Text>
            </Row>
            <Row spacing="md">
              <View style={{ width: 20, height: 20, backgroundColor: 'yellow' }} />
              <Text>MD Spacing ({Spacing.md}px)</Text>
            </Row>
            <Row spacing="lg">
              <View style={{ width: 20, height: 20, backgroundColor: 'green' }} />
              <Text>LG Spacing ({Spacing.lg}px)</Text>
            </Row>
            <Row spacing="xl">
              <View style={{ width: 20, height: 20, backgroundColor: 'blue' }} />
              <Text>XL Spacing ({Spacing.xl}px)</Text>
            </Row>
          </Column>
        </Card>

        {/* Touch Target Test */}
        <Card variant="elevated" padding="md">
          <Column spacing="md">
            <Text style={{ fontSize: Typography.lg, fontWeight: 'bold' }}>
              Touch Targets
            </Text>
            <Text>
              Minimum touch target: {ResponsiveUtils.getResponsiveValue({
                phone: '44px (iOS) / 48px (Android)',
                tablet: '48px',
                desktop: '44px',
                default: '44px'
              })}
            </Text>
            <Row spacing="md" wrap>
              <Button title="Touch Test 1" size="sm" />
              <Button title="Touch Test 2" size="md" />
              <Button title="Touch Test 3" size="lg" />
            </Row>
          </Column>
        </Card>

        {/* Platform Features */}
        <Card variant="default" padding="md">
          <Column spacing="sm">
            <Text style={{ fontSize: Typography.lg, fontWeight: 'bold' }}>
              Platform Features
            </Text>
            <Text>Shadow/Elevation: {PlatformType.isIOS ? 'iOS Shadow' : 'Android Elevation'}</Text>
            <Text>Border Radius: {ResponsiveUtils.getBorderRadius('md')}px</Text>
            <Text>Safe Area: {PlatformType.isMobile ? 'Mobile Safe Area' : 'Web Standard'}</Text>
            {PlatformType.isWeb && (
              <Text>Web Features: Hover effects, keyboard navigation, focus management</Text>
            )}
          </Column>
        </Card>
      </Column>
    </Container>
  );
}

// Usage instructions:
// 1. Import this component in any screen: import { ResponsiveTest } from '@/components/ui/ResponsiveTest';
// 2. Add it to your JSX: <ResponsiveTest />
// 3. Test on different devices and platforms
// 4. Remove when testing is complete

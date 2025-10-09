import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, Keyboard } from 'react-native';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container, Column, ScrollContainer } from '@/components/ui/Layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { ResponsiveUtils, Typography, PlatformType, Spacing } from '@/constants/responsive';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { signUp } = useAuth();
  const scheme = useColorScheme() ?? 'light';

  // Handle keyboard events to ensure proper scroll behavior
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleSignUp = async () => {
    if (!email || !password || !name || !confirmPassword) {
      return Alert.alert('Error', 'Please fill in all fields');
    }

    if (password !== confirmPassword) {
      return Alert.alert('Error', 'Passwords do not match');
    }

    if (password.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      // All self-registered users are assigned 'staff' role for security
      await signUp(email, password, name, 'staff');
      // Staff users always redirect to staff dashboard
      router.replace('/(app)/(tabs)');
    } catch (e:any) {
      Alert.alert('Error', e?.message ?? 'Sign-up failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={PlatformType.isIOS ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: Colors[scheme].background }]}
    >
      <ScrollContainer
        maxWidth
        padding="lg"
        automaticallyAdjustKeyboardInsets={true}
        keyboardDismissMode={PlatformType.isIOS ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          // Adjust content height based on keyboard state
          keyboardVisible ? styles.scrollContentKeyboard : styles.scrollContentNormal
        ]}
      >
        <Column spacing="lg" align="center" style={styles.form}>
          <Column spacing="sm" align="center" style={styles.titleContainer}>
            <ThemedText style={styles.title}>Create Account</ThemedText>
            <ThemedText style={styles.subtitle}>Join Asset Audit as a staff member</ThemedText>
          </Column>

          <Column spacing="md" style={styles.inputContainer}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              required
              accessibilityLabel="Full name"
              accessibilityHint="Enter your full name for the account"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              required
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email address for the account"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              required
              accessibilityLabel="Password"
              accessibilityHint="Create a secure password for your account"
            />
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
              required
              accessibilityLabel="Confirm password"
              accessibilityHint="Re-enter your password to confirm"
            />
          </Column>

          {/* Account Type Information */}
          <Card variant="outlined" padding="md" style={styles.infoCard}>
            <Column spacing="sm">
              <ThemedText style={styles.infoLabel}>Account Type: Staff Member</ThemedText>
              <ThemedText style={styles.infoDescription}>
                Staff members can capture images and create assessments. You will only be able to view your own assessments.
              </ThemedText>
              <ThemedText style={styles.adminNote}>
                Note: Administrator accounts can only be created by existing administrators through the admin dashboard.
              </ThemedText>
            </Column>
          </Card>

          <Column spacing="sm" style={styles.buttonContainer}>
            <Button
              title={loading ? "Creating Account..." : "Create Account"}
              onPress={handleSignUp}
              disabled={loading}
              fullWidth
              size="lg"
              accessibilityLabel="Create account button"
              accessibilityHint="Tap to create your new staff account"
            />
            <Button
              title="Already have an account? Sign In"
              onPress={() => router.replace('/(auth)/sign-in')}
              variant="secondary"
              fullWidth
              accessibilityLabel="Sign in button"
              accessibilityHint="Tap to navigate to sign in if you already have an account"
            />
          </Column>
        </Column>
      </ScrollContainer>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    // Base scroll content style
  },
  scrollContentNormal: {
    // When keyboard is hidden, ensure full height
    minHeight: '100%',
  },
  scrollContentKeyboard: {
    // When keyboard is visible, allow content to shrink
    minHeight: 'auto',
  },
  form: {
    maxWidth: ResponsiveUtils.getResponsiveValue({
      phone: ResponsiveUtils.widthPercentage(100),
      tablet: 450, // Slightly wider to accommodate larger text
      desktop: 450,
      default: ResponsiveUtils.widthPercentage(100),
    }),
    width: '100%',
    // Remove fixed minHeight to allow proper keyboard handling
    // The ScrollContainer will handle content sizing automatically
  },
  titleContainer: {
    width: '100%',
    // Ensure title text has enough space
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: ResponsiveUtils.getResponsiveValue({
      phone: ResponsiveUtils.fontSize(Typography.responsive.heading),
      tablet: ResponsiveUtils.fontSize(Typography.responsive.title),
      desktop: ResponsiveUtils.fontSize(Typography.responsive.title),
      default: ResponsiveUtils.fontSize(Typography.responsive.heading),
    }),
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: ResponsiveUtils.getResponsiveValue({
      phone: ResponsiveUtils.fontSize(Typography.responsive.heading) * 1.2,
      tablet: ResponsiveUtils.fontSize(Typography.responsive.title) * 1.2,
      desktop: ResponsiveUtils.fontSize(Typography.responsive.title) * 1.2,
      default: ResponsiveUtils.fontSize(Typography.responsive.heading) * 1.2,
    }),
    // Ensure text doesn't overflow container
    flexShrink: 1,
    maxWidth: '100%',
  },
  subtitle: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.subtitle),
    opacity: 0.7,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
    marginTop: Spacing.md,
  },
  infoCard: {
    width: '100%',
  },
  infoLabel: {
    fontSize: ResponsiveUtils.fontSize(Typography.base),
    fontWeight: '600',
    color: '#007AFF',
  },
  infoDescription: {
    fontSize: ResponsiveUtils.fontSize(Typography.sm),
    opacity: 0.8,
    lineHeight: ResponsiveUtils.fontSize(Typography.sm) * 1.4,
  },
  adminNote: {
    fontSize: ResponsiveUtils.fontSize(Typography.xs),
    opacity: 0.6,
    fontStyle: 'italic',
    lineHeight: ResponsiveUtils.fontSize(Typography.xs) * 1.4,
  },
});

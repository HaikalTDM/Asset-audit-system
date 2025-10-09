import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Container, Column } from '@/components/ui/Layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth/AuthContext';
import { ResponsiveUtils, Typography, PlatformType, Spacing, DeviceType } from '@/constants/responsive';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const scheme = useColorScheme() ?? 'light';

  const handleSignIn = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields');
    setLoading(true);
    try {
      await signIn(email, password);
      // Note: RouteProtection will handle the role-based redirect automatically
      // We don't need to manually redirect here as the AuthContext will trigger
      // the RouteProtection logic which will redirect based on user role
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Sign-in failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={PlatformType.isIOS ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: Colors[scheme].background }]}
    >
      <Container center maxWidth padding="lg" style={styles.containerInner}>
        <Column spacing="lg" align="center" justify="center" style={styles.form}>
          <Column spacing="sm" align="center">
            <ThemedText style={styles.title}>Asset Audit</ThemedText>
            <ThemedText style={styles.subtitle}>Sign in to continue</ThemedText>
          </Column>

          <Column spacing="md" style={styles.inputContainer}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              required
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email address to sign in"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              required
              accessibilityLabel="Password"
              accessibilityHint="Enter your password to sign in"
            />
          </Column>

          <Column spacing="sm" style={styles.buttonContainer}>
            <Button
              title={loading ? "Signing In..." : "Sign In"}
              onPress={handleSignIn}
              disabled={loading}
              fullWidth
              size="lg"
              accessibilityLabel="Sign in button"
              accessibilityHint="Tap to sign in with your credentials"
            />
          </Column>
        </Column>
      </Container>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerInner: {
    flex: 1,
    justifyContent: 'center',
  },
  form: {
    flex: 1,
    maxWidth: ResponsiveUtils.getResponsiveValue({
      phone: '100%',
      tablet: 400,
      desktop: 400,
      default: '100%',
    }),
    width: '100%',
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
});

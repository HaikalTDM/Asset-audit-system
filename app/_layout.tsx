// app/_layout.tsx
import { Slot } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ThemeProvider } from '@/lib/theme-context';
import { RouteProtection } from '@/lib/auth/RouteProtection';

function AuthGate() {
  return (
    <RouteProtection>
      <Slot />
    </RouteProtection>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

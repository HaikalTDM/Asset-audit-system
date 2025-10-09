// app/_layout.tsx
import { Slot } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ThemeProvider } from '@/lib/theme-context';
import { RouteProtection } from '@/lib/auth/RouteProtection';
import { OfflineProvider } from '@/lib/offline/OfflineContext';

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
        <OfflineProvider>
          <AuthGate />
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

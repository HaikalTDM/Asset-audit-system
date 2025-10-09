import React from 'react';
import { View } from 'react-native';
import { useAuth } from './AuthContext';
import { UserRole } from '../firestore';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { userProfile, loading } = useAuth();
  const scheme = useColorScheme() ?? 'light';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors[scheme].background }}>
        <ThemedText>Loading...</ThemedText>
      </View>
    );
  }

  if (!userProfile || !allowedRoles.includes(userProfile.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors[scheme].background, padding: 16 }}>
        <ThemedText style={{ textAlign: 'center', fontSize: 18, marginBottom: 8 }}>
          Access Denied
        </ThemedText>
        <ThemedText style={{ textAlign: 'center', opacity: 0.7 }}>
          You don't have permission to access this feature.
        </ThemedText>
      </View>
    );
  }

  return <>{children}</>;
}

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminOnly({ children, fallback }: AdminOnlyProps) {
  return (
    <RoleGuard allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

interface StaffOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StaffOnly({ children, fallback }: StaffOnlyProps) {
  return (
    <RoleGuard allowedRoles={['staff']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

interface StaffOrAdminProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StaffOrAdmin({ children, fallback }: StaffOrAdminProps) {
  return (
    <RoleGuard allowedRoles={['staff', 'admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

// Hook for conditional rendering based on roles
export function useRoleAccess() {
  const { userProfile, isAdmin, isStaff, hasRole } = useAuth();

  return {
    userProfile,
    isAdmin: isAdmin(),
    isStaff: isStaff(),
    hasRole,
    canAccessAdminFeatures: isAdmin(),
    canCaptureImages: isStaff() || isAdmin(),
    canCreateAssessments: isStaff() || isAdmin(),
    canViewOwnAssessments: isStaff() || isAdmin(),
    canViewAllAssessments: isAdmin(),
  };
}

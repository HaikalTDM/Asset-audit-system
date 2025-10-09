import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './AuthContext';

export function useRouteProtection() {
  const { user, userProfile, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuth = segments.length > 0 && segments[0] === '(auth)';
    const inApp = segments.length > 0 && segments[0] === '(app)';
    const inAdminTabs = segments.length > 1 && segments[1] === '(admin-tabs)';
    const inStaffTabs = segments.length > 1 && segments[1] === '(tabs)';

    // Debug logging (disabled for cleaner output)
    // console.log('RouteProtection - Current segments:', segments);
    // console.log('RouteProtection - User role:', userProfile?.role);
    // console.log('RouteProtection - Route flags:', { inAuth, inApp, inAdminTabs, inStaffTabs });

    // Not authenticated - redirect to sign in
    if (!user && !inAuth) {
      router.replace('/(auth)/sign-in');
      return;
    }

    // Authenticated but in auth screens - redirect based on role
    if (user && inAuth && userProfile) {
      if (userProfile.role === 'admin') {
        router.replace('/(app)/(admin-tabs)');
      } else {
        router.replace('/(app)/(tabs)');
      }
      return;
    }

    // Authenticated and in app - check role-based access
    if (user && inApp && userProfile) {
      // Staff user trying to access admin routes
      if (userProfile.role === 'staff' && inAdminTabs) {
        router.replace('/(app)/(tabs)');
        return;
      }

      // Admin user trying to access staff routes
      // For now, redirect admin users to their admin dashboard to avoid confusion
      // TODO: Later we can allow admins to access staff routes if needed
      if (userProfile.role === 'admin' && inStaffTabs) {
        // console.log('RouteProtection - Admin user accessing staff routes, redirecting to admin dashboard');
        router.replace('/(app)/(admin-tabs)');
        return;
      }

      // Check if user is accessing other app routes (like review, history, etc.)
      const isInOtherAppRoute = inApp && !inAdminTabs && !inStaffTabs;

      // Allow access to other app routes (review, history, etc.) for all authenticated users
      if (isInOtherAppRoute) {
        return; // Allow access to review, history, and other app routes
      }

      // Only redirect to role-specific sections if user is at the root app level
      // This prevents redirecting when users are on specific routes like review
      const isAtAppRoot = segments.length <= 1 || (segments.length === 2 && (!segments[1] || segments[1] === ''));

      if (isAtAppRoot) {
        // Ensure users are in the correct section when at app root
        if (userProfile.role === 'admin') {
          router.replace('/(app)/(admin-tabs)');
          return;
        }

        if (userProfile.role === 'staff') {
          router.replace('/(app)/(tabs)');
          return;
        }
      }
    }
  }, [user, userProfile, initializing, segments, router]);
}

// Component wrapper for route protection
interface RouteProtectionProps {
  children: React.ReactNode;
}

export function RouteProtection({ children }: RouteProtectionProps) {
  useRouteProtection();
  return <>{children}</>;
}

// Higher-order component for protecting specific routes
export function withRouteProtection<T extends object>(
  Component: React.ComponentType<T>
) {
  return function ProtectedComponent(props: T) {
    useRouteProtection();
    return <Component {...props} />;
  };
}

// Hook for checking current route permissions
export function useRoutePermissions() {
  const { userProfile } = useAuth();
  const segments = useSegments();

  const isInAdminRoute = segments.length > 1 && segments[1] === '(admin-tabs)';
  const isInStaffRoute = segments.length > 1 && segments[1] === '(tabs)';
  const isInAuthRoute = segments.length > 0 && segments[0] === '(auth)';

  return {
    canAccessCurrentRoute: (() => {
      if (isInAuthRoute) return true; // Auth routes are always accessible
      if (!userProfile) return false; // No profile means no access

      if (isInAdminRoute) {
        return userProfile.role === 'admin';
      }

      if (isInStaffRoute) {
        return userProfile.role === 'staff' || userProfile.role === 'admin';
      }

      return true; // Other routes are accessible
    })(),
    userRole: userProfile?.role,
    isAdmin: userProfile?.role === 'admin',
    isStaff: userProfile?.role === 'staff',
    isInAdminRoute,
    isInStaffRoute,
    isInAuthRoute,
  };
}

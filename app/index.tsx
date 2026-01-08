import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// DEVELOPMENT MODE - Set to true to bypass login and go straight to admin dashboard
const DEV_MODE = false; // Change to true to skip login during development

export default function Index() {
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (DEV_MODE) {
      console.log('DEV_MODE enabled - bypassing auth check');
      router.replace('/(app)/(admin-tabs)');
      return;
    }

    if (!user) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (user && userProfile) {
      if (userProfile.role === 'admin') {
        router.replace('/(app)/(admin-tabs)');
      } else {
        router.replace('/(app)/(tabs)');
      }
      return;
    }
  }, [user, userProfile, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color="#22c55e" />
    </View>
  );
}

import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

export default function AppStackLayout() {
  const scheme = useColorScheme() ?? 'light';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors[scheme].background },
        headerTintColor: Colors[scheme].tint,
        headerTitleStyle: { fontWeight: '700', color: Colors[scheme].text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors[scheme].background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin-tabs)" options={{ headerShown: false }} />

      {/* History pages with proper back navigation */}
      <Stack.Screen
        name="history/index"
        options={{
          title: 'History',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginRight: 15 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={Colors[scheme].tint}
              />
            </Pressable>
          ),
        }}
      />

      <Stack.Screen
        name="history/[id]"
        options={{
          title: 'Assessment Details',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                // Try to go back, but if there's no history, go to the History tab
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.push('/(app)/(tabs)/history');
                }
              }}
              style={{ marginRight: 15 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={Colors[scheme].tint}
              />
            </Pressable>
          ),
        }}
      />

      <Stack.Screen
        name="review"
        options={{
          title: 'Review Summary',
          headerLeft: () => (
            <Pressable
              onPress={() => router.push('/(app)/(tabs)')}
              style={{ marginRight: 15 }}
            >
              <Ionicons
                name="home-outline"
                size={24}
                color={Colors[scheme].tint}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

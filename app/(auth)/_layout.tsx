import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function AuthLayout() {
  const scheme = useColorScheme() ?? 'light';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors[scheme].background },
        headerTintColor: Colors[scheme].tint,
        headerTitleStyle: { fontWeight: '600', color: Colors[scheme].text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors[scheme].background },
      }}
    >
      <Stack.Screen name="sign-in" options={{ title: 'Sign In' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create Account' }} />
    </Stack>
  );
}

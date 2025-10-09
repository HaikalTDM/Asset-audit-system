import { Tabs } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { AdminOnly } from '@/lib/auth/RoleGuard';

export default function AdminTabsLayout() {
  const scheme = useColorScheme() ?? 'light';

  return (
    <AdminOnly>
      <Tabs
        screenOptions={{
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', color: Colors[scheme].text },
          headerTintColor: Colors[scheme].tint,
          headerStyle: { backgroundColor: Colors[scheme].background },
          tabBarStyle: { 
            backgroundColor: Colors[scheme].background,
            borderTopColor: Colors[scheme].border,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: Colors[scheme].tint,
          tabBarInactiveTintColor: Colors[scheme].tabIconDefault,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          contentStyle: { backgroundColor: Colors[scheme].background },
        }}
      >
        <Tabs.Screen 
          name="index" 
          options={{ 
            title: 'Dashboard', 
            tabBarIcon: ({ color }) => <Ionicons name="analytics-outline" size={24} color={color} /> 
          }} 
        />
        <Tabs.Screen 
          name="all-assessments" 
          options={{ 
            title: 'Assessments', 
            tabBarIcon: ({ color }) => <Ionicons name="list-outline" size={24} color={color} /> 
          }} 
        />
        <Tabs.Screen 
          name="users" 
          options={{ 
            title: 'Users', 
            tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} /> 
          }} 
        />
        <Tabs.Screen 
          name="settings" 
          options={{ 
            title: 'Settings', 
            tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} /> 
          }} 
        />
      </Tabs>
    </AdminOnly>
  );
}

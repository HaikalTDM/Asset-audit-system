import { Tabs } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StaffOrAdmin } from '@/lib/auth/RoleGuard';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';

export default function TabsLayout() {
  const scheme = useColorScheme() ?? 'light';

  return (
    <StaffOrAdmin>
      <Tabs
        screenOptions={{
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', color: Colors[scheme].text },
          headerTintColor: Colors[scheme].tint,
          headerStyle: { backgroundColor: Colors[scheme].background },
          headerRight: () => <SyncStatusIndicator compact showLabel={false} />,
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
        {/* Dashboard - Always visible for staff and admin */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />
          }}
        />

        {/* Capture - Always visible for staff and admin */}
        <Tabs.Screen
          name="capture"
          options={{
            title: 'Capture',
            tabBarIcon: ({ color }) => <Ionicons name="camera-outline" size={24} color={color} />
          }}
        />

        {/* History - Always visible for staff and admin */}
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => <Ionicons name="time-outline" size={24} color={color} />
          }}
        />

        {/* Settings - Always visible for staff and admin */}
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} />
          }}
        />

        {/* Assess - Hidden from navigation but still accessible programmatically */}
        <Tabs.Screen
          name="assess"
          options={{
            title: 'Assess',
            tabBarIcon: ({ color }) => <Ionicons name="search-outline" size={24} color={color} />,
            href: null // This hides the tab from the navigation bar
          }}
        />
      </Tabs>
    </StaffOrAdmin>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSegments } from 'expo-router';

export function DebugInfo() {
  const { user, userProfile } = useAuth();
  const segments = useSegments();

  if (__DEV__) {
    return (
      <View style={{ 
        position: 'absolute', 
        top: 50, 
        right: 10, 
        backgroundColor: 'rgba(0,0,0,0.8)', 
        padding: 8, 
        borderRadius: 4,
        zIndex: 1000
      }}>
        <Text style={{ color: 'white', fontSize: 10 }}>
          User: {user?.uid?.slice(0, 8)}...
        </Text>
        <Text style={{ color: 'white', fontSize: 10 }}>
          Role: {userProfile?.role || 'loading...'}
        </Text>
        <Text style={{ color: 'white', fontSize: 10 }}>
          Route: {segments.join('/')}
        </Text>
      </View>
    );
  }

  return null;
}

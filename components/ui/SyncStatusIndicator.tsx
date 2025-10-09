import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '@/lib/offline/OfflineContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';

/**
 * Sync Status Indicator
 * Shows current network and sync status in the UI
 */

type SyncStatusIndicatorProps = {
  onPress?: () => void;
  showLabel?: boolean;
  compact?: boolean;
};

export function SyncStatusIndicator({ onPress, showLabel = true, compact = false }: SyncStatusIndicatorProps) {
  const { isOnline, networkQuality, pendingCount, isSyncing } = useOffline();
  const scheme = useColorScheme() ?? 'light';

  // Animated pulse effect for syncing
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSyncing, pulseAnim]);

  // Determine status color and icon
  const getStatusInfo = () => {
    if (isSyncing) {
      return {
        color: '#f59e0b', // Orange
        icon: 'sync' as const,
        label: 'Syncing...',
        bgColor: '#fef3c7',
      };
    }

    if (!isOnline) {
      return {
        color: '#ef4444', // Red
        icon: 'cloud-offline' as const,
        label: 'Offline',
        bgColor: '#fee2e2',
      };
    }

    if (pendingCount > 0) {
      return {
        color: '#f59e0b', // Orange
        icon: 'cloud-upload' as const,
        label: `${pendingCount} pending`,
        bgColor: '#fef3c7',
      };
    }

    return {
      color: '#10b981', // Green
      icon: 'cloud-done' as const,
      label: 'Synced',
      bgColor: '#d1fae5',
    };
  };

  const status = getStatusInfo();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (pendingCount > 0) {
      router.push('/(app)/sync-status' as any);
    }
  };

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        style={[
          styles.compactContainer,
          {
            backgroundColor: scheme === 'dark' ? status.color + '30' : status.bgColor,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: isSyncing ? pulseAnim : 1 }] }}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={status.color} />
          ) : (
            <Ionicons name={status.icon} size={16} color={status.color} />
          )}
        </Animated.View>
        {pendingCount > 0 && (
          <View style={[styles.badge, { backgroundColor: status.color }]}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor: scheme === 'dark' ? status.color + '30' : status.bgColor,
          borderColor: status.color + '50',
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: isSyncing ? pulseAnim : 1 }] }}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={status.color} />
        ) : (
          <Ionicons name={status.icon} size={20} color={status.color} />
        )}
      </Animated.View>

      {showLabel && (
        <Text style={[styles.label, { color: status.color }]}>{status.label}</Text>
      )}

      {pendingCount > 0 && !isSyncing && (
        <View style={[styles.badge, { backgroundColor: status.color }]}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Network Quality Indicator
 * Shows signal strength icon based on network quality
 */
export function NetworkQualityIndicator() {
  const { networkQuality, isOnline } = useOffline();
  const scheme = useColorScheme() ?? 'light';

  const getQualityInfo = () => {
    if (!isOnline) {
      return { icon: 'cellular-outline' as const, color: '#ef4444', bars: 0 };
    }

    switch (networkQuality) {
      case 'excellent':
        return { icon: 'cellular' as const, color: '#10b981', bars: 4 };
      case 'good':
        return { icon: 'cellular' as const, color: '#10b981', bars: 3 };
      case 'poor':
        return { icon: 'cellular' as const, color: '#f59e0b', bars: 1 };
      default:
        return { icon: 'cellular-outline' as const, color: '#6b7280', bars: 0 };
    }
  };

  const quality = getQualityInfo();

  return (
    <View style={styles.qualityContainer}>
      <Ionicons name={quality.icon} size={16} color={quality.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  compactContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  qualityContainer: {
    padding: 4,
  },
});


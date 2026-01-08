import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useOffline } from '@/lib/offline/OfflineContext';
import { getOfflineAssessments, resetRetryCount, type OfflineAssessment } from '@/lib/offline/offlineStorage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Sync Status Screen
 * Shows all pending and failed sync items
 */
export default function SyncStatusScreen() {
  const scheme = useColorScheme() ?? 'light';
  const {
    isOnline,
    networkQuality,
    pendingCount,
    isSyncing,
    syncProgress,
    lastSyncTime,
    syncError,
    manualSync,
    retrySync,
    refreshPendingCount,
  } = useOffline();

  const [pendingAssessments, setPendingAssessments] = useState<OfflineAssessment[]>([]);
  const [failedAssessments, setFailedAssessments] = useState<OfflineAssessment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssessments = React.useCallback(async () => {
    const pending = await getOfflineAssessments('pending');
    const failed = await getOfflineAssessments('failed');
    
    setPendingAssessments(pending);
    setFailedAssessments(failed);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAssessments();
    }, [loadAssessments])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssessments();
    await refreshPendingCount();
    setRefreshing(false);
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please connect to the internet.');
      return;
    }

    const result = await manualSync();
    
    if (result.success || result.syncedCount > 0) {
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${result.syncedCount} assessment(s).${
          result.failedCount > 0 ? `\n${result.failedCount} failed.` : ''
        }`
      );
    } else {
      Alert.alert('Sync Failed', result.errors[0]?.error || 'Unknown error');
    }

    await loadAssessments();
  };

  const handleRetryFailed = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please connect to the internet.');
      return;
    }

    await retrySync();
    await loadAssessments();
  };

  const handleRetryOne = async (assessmentId: string) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please connect to the internet.');
      return;
    }

    await resetRetryCount(assessmentId);
    await retrySync(assessmentId);
    await loadAssessments();
  };

  const getNetworkStatusColor = () => {
    if (!isOnline) return '#ef4444';
    switch (networkQuality) {
      case 'excellent': return '#10b981';
      case 'good': return '#10b981';
      case 'poor': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getNetworkStatusText = () => {
    if (!isOnline) return 'Offline';
    return `Online (${networkQuality})`;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sync Status', headerTitle: 'Sync Status' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: Colors[scheme].background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Network Status Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name={isOnline ? 'wifi' : 'wifi-off'}
              size={24}
              color={getNetworkStatusColor()}
            />
            <ThemedText style={styles.cardTitle}>Network Status</ThemedText>
          </View>
          <View style={[styles.statusRow, { backgroundColor: Colors[scheme].background }]}>
            <ThemedText style={styles.statusLabel}>Connection:</ThemedText>
            <ThemedText
              style={[styles.statusValue, { color: getNetworkStatusColor() }]}
            >
              {getNetworkStatusText()}
            </ThemedText>
          </View>
          <View style={[styles.statusRow, { backgroundColor: Colors[scheme].background }]}>
            <ThemedText style={styles.statusLabel}>Pending Items:</ThemedText>
            <ThemedText style={styles.statusValue}>{pendingCount}</ThemedText>
          </View>
          {lastSyncTime && (
            <View style={[styles.statusRow, { backgroundColor: Colors[scheme].background }]}>
              <ThemedText style={styles.statusLabel}>Last Sync:</ThemedText>
              <ThemedText style={styles.statusValue}>
                {new Date(lastSyncTime).toLocaleString()}
              </ThemedText>
            </View>
          )}
        </Card>

        {/* Sync Progress */}
        {isSyncing && syncProgress && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="sync" size={24} color={Colors[scheme].tint} />
              <ThemedText style={styles.cardTitle}>Syncing...</ThemedText>
            </View>
            <View style={[styles.progressContainer, { backgroundColor: Colors[scheme].background }]}>
              <ThemedText style={styles.progressText}>
                {syncProgress.current} of {syncProgress.total}
              </ThemedText>
              <View style={[styles.progressBar, { backgroundColor: Colors[scheme].border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: Colors[scheme].tint,
                      width: `${(syncProgress.current / syncProgress.total) * 100}%`,
                    },
                  ]}
                />
              </View>
              <ThemedText style={styles.progressStatus}>
                {syncProgress.status}
              </ThemedText>
            </View>
          </Card>
        )}

        {/* Sync Error */}
        {syncError && (
          <Card style={[styles.card, { backgroundColor: '#fee2e2' }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="alert-circle" size={24} color="#ef4444" />
              <ThemedText style={[styles.cardTitle, { color: '#ef4444' }]}>Sync Error</ThemedText>
            </View>
            <ThemedText style={{ color: '#991b1b' }}>{syncError}</ThemedText>
          </Card>
        )}

        {/* Quick Actions */}
        <Card style={styles.card}>
          <ThemedText style={styles.cardTitle}>Quick Actions</ThemedText>
          <View style={styles.actionButtons}>
            <Button
              title="Sync Now"
              onPress={handleManualSync}
              disabled={!isOnline || isSyncing || pendingCount === 0}
            />
            {failedAssessments.length > 0 && (
              <Button
                title={`Retry Failed (${failedAssessments.length})`}
                onPress={handleRetryFailed}
                disabled={!isOnline || isSyncing}
                variant="secondary"
              />
            )}
          </View>
        </Card>

        {/* Pending Assessments */}
        {pendingAssessments.length > 0 && (
          <Card style={styles.card}>
            <ThemedText style={styles.cardTitle}>
              Pending Assessments ({pendingAssessments.length})
            </ThemedText>
            {pendingAssessments.map((assessment) => (
              <View
                key={assessment.id}
                style={[
                  styles.assessmentItem,
                  { borderBottomColor: Colors[scheme].border },
                ]}
              >
                <View style={styles.assessmentInfo}>
                  <ThemedText style={styles.assessmentTitle}>
                    {assessment.assessmentData.category}  -  {assessment.assessmentData.element}
                  </ThemedText>
                  <ThemedText style={styles.assessmentDate}>
                    {new Date(assessment.createdAt).toLocaleString()}
                  </ThemedText>
                </View>
                <Ionicons name="time" size={20} color="#f59e0b" />
              </View>
            ))}
          </Card>
        )}

        {/* Failed Assessments */}
        {failedAssessments.length > 0 && (
          <Card style={styles.card}>
            <ThemedText style={styles.cardTitle}>
              Failed Assessments ({failedAssessments.length})
            </ThemedText>
            {failedAssessments.map((assessment) => (
              <View
                key={assessment.id}
                style={[
                  styles.assessmentItem,
                  { borderBottomColor: Colors[scheme].border },
                ]}
              >
                <View style={styles.assessmentInfo}>
                  <ThemedText style={styles.assessmentTitle}>
                    {assessment.assessmentData.category}  -  {assessment.assessmentData.element}
                  </ThemedText>
                  <ThemedText style={styles.assessmentDate}>
                    {new Date(assessment.createdAt).toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.errorText}>
                    {assessment.errorMessage || 'Unknown error'}
                  </ThemedText>
                  <ThemedText style={styles.retryText}>
                    Retries: {assessment.retryCount}
                  </ThemedText>
                </View>
                <Button
                  title="Retry"
                  onPress={() => handleRetryOne(assessment.id)}
                  disabled={!isOnline || isSyncing}
                  variant="secondary"
                  size="sm"
                />
              </View>
            ))}
          </Card>
        )}

        {/* Empty State */}
        {pendingAssessments.length === 0 && failedAssessments.length === 0 && (
          <Card style={styles.card}>
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color={Colors[scheme].tint} />
              <ThemedText style={styles.emptyTitle}>All Synced!</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                All your assessments have been synced to the cloud.
              </ThemedText>
            </View>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    padding: 12,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  progressStatus: {
    fontSize: 12,
    opacity: 0.7,
  },
  actionButtons: {
    gap: 8,
    marginTop: 12,
  },
  assessmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  assessmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  assessmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  assessmentDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  retryText: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});


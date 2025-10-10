import React from 'react';
import { Alert, StyleSheet, View, ScrollView, Platform } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/themed-text';
import { exportZip, importZip, type ExportFilters } from '@/lib/exportImport';
import { useThemePreference } from '@/lib/theme-context';
// Removed old SQLite imports - now using FirestoreService
import { Card } from '@/components/ui/Card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { FirestoreService } from '@/lib/firestore';
import { router } from 'expo-router';
import { DateFilterModal } from '@/components/ui/DateFilterModal';
import { StorageCalculationService, type FormattedStorageMetrics } from '@/lib/storageCalculation';

// Create dynamic styles based on current color scheme
const createStyles = (scheme: 'light' | 'dark') => StyleSheet.create({
  container: { padding: 16, gap: 16 },
  cardTitle: { fontWeight: '700', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  
  // Storage metrics styles
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors[scheme].card,
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.8,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: scheme === 'dark' ? '#7f1d1d' : '#fee2e2',
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: scheme === 'dark' ? '#fca5a5' : '#dc2626',
    fontSize: 14,
    marginBottom: 8,
  },
  noDataContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors[scheme].card,
    borderRadius: 8,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  metricsContainer: {
    backgroundColor: Colors[scheme].card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors[scheme].border,
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors[scheme].tint,
  },
  lastUpdated: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default function AdminSettings() {
  const scheme = useColorScheme() ?? 'light';
  const styles = createStyles(scheme);
  const [busy, setBusy] = React.useState<'export' | 'import' | null>(null);
  const { preferred, setPreferred } = useThemePreference();
  const [storageMetrics, setStorageMetrics] = React.useState<FormattedStorageMetrics | null>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [calculationError, setCalculationError] = React.useState<string | null>(null);
  const { user, userProfile, signOut } = useAuth();
  const [showDateFilterModal, setShowDateFilterModal] = React.useState(false);

  const calculateStorageMetrics = React.useCallback(async () => {
    if (!user) {
      setStorageMetrics(null);
      setCalculationError(null);
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      console.log('Calculating ALL Firebase storage metrics (admin view)');
      // Admin views ALL system storage
      const metrics = await StorageCalculationService.getFormattedSystemStorageMetrics();
      console.log('System storage metrics calculated:', metrics);
      setStorageMetrics(metrics);
    } catch (error) {
      console.error('Error calculating storage metrics:', error);
      setCalculationError(error instanceof Error ? error.message : 'Failed to calculate storage usage');
      setStorageMetrics(null);
    } finally {
      setIsCalculating(false);
    }
  }, [user]);

  React.useEffect(() => { calculateStorageMetrics(); }, [calculateStorageMetrics]);
  useFocusEffect(React.useCallback(() => { calculateStorageMetrics(); }, [calculateStorageMetrics]));

  const handleExportWithFilter = async (filters: ExportFilters | null) => {
    try { 
      setBusy('export');
      
      // Format filter display text
      let filterText = '';
      if (filters && filters.month && filters.year) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        filterText = ` (${monthNames[filters.month - 1]} ${filters.year})`;
      } else {
        filterText = ' (All Time)';
      }
      
      const path = await exportZip(undefined, filters || undefined); // Admin exports all assessments
      Alert.alert(
        'Export Complete', 
        `All system data has been exported to CSV${filterText}.\n\nFile: ${path.split('/').pop()}\n\nImage URLs are included and clickable in Excel/Google Sheets.`,
        [{ text: 'OK' }]
      );
    } catch (e: any) { 
      Alert.alert('Export Failed', String(e?.message || e)); 
    } finally { 
      setBusy(null); 
    }
  };

  const onExport = () => {
    setShowDateFilterModal(true);
  };

  const onImport = async () => {
    try { 
      setBusy('import'); 
      const result = await importZip(user?.uid);
      if (result) { 
        Alert.alert(
          'Import Complete', 
          'CSV data has been imported successfully.\n\nNote: Images must already be in Firebase Storage (via exported URLs).',
          [{ text: 'OK' }]
        ); 
        await calculateStorageMetrics(); 
      }
    } catch (e: any) { 
      Alert.alert('Import Failed', String(e?.message || e)); 
    } finally { 
      setBusy(null); 
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={{ backgroundColor: Colors[scheme].background }} contentContainerStyle={styles.container}>
      <ThemedText type="title" style={{ marginBottom: 12 }}>Admin Settings</ThemedText>

      {/* Admin Profile Section */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors[scheme].text} style={{ marginRight: 6 }} />
          <ThemedText style={styles.cardTitle}>Admin Profile</ThemedText>
        </View>
        <View style={styles.rowBetween}>
          <ThemedText>Name</ThemedText>
          <ThemedText style={{ opacity: 0.9 }}>{user?.displayName || 'Unknown'}</ThemedText>
        </View>
        <View style={styles.rowBetween}>
          <ThemedText>Email</ThemedText>
          <ThemedText style={{ opacity: 0.9 }}>{user?.email || 'Unknown'}</ThemedText>
        </View>
        <View style={styles.rowBetween}>
          <ThemedText>Role</ThemedText>
          <View style={[styles.badge, { backgroundColor: '#ff6b6b' }]}>
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>ADMIN</ThemedText>
          </View>
        </View>
        <View style={{ height: 12 }} />
        <Button title="Sign Out" onPress={handleSignOut} variant="danger" />
      </Card>

      {/* Quick Admin Actions */}
      <Card>
        <ThemedText style={styles.cardTitle}>Quick Actions</ThemedText>
        <View style={{ gap: 8 }}>
          <Button 
            title="View All Assessments" 
            onPress={() => router.push('/(app)/(admin-tabs)/all-assessments')} 
          />
          <Button 
            title="Manage Users" 
            onPress={() => router.push('/(app)/(admin-tabs)/users')} 
            variant="secondary"
          />
          <Button 
            title="Admin Dashboard" 
            onPress={() => router.push('/(app)/(admin-tabs)/')} 
            variant="secondary"
          />
        </View>
      </Card>

      {/* Appearance */}
      <Card>
        <ThemedText style={styles.cardTitle}>Appearance</ThemedText>
        <View style={{ gap: 8 }}>
          <Button title={preferred === 'light' ? 'Light •' : 'Light'} onPress={() => setPreferred('light')} variant={preferred === 'light' ? 'primary' : 'secondary'} />
          <Button title={preferred === 'dark' ? 'Dark •' : 'Dark'} onPress={() => setPreferred('dark')} variant={preferred === 'dark' ? 'primary' : 'secondary'} />
          <Button title={preferred === 'system' ? 'System •' : 'System'} onPress={() => setPreferred('system')} variant={preferred === 'system' ? 'primary' : 'secondary'} />
        </View>
      </Card>

      {/* Data Management */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="server-outline" size={18} color={Colors[scheme].text} style={{ marginRight: 6 }} />
          <ThemedText style={styles.cardTitle}>Data Management (All System Data)</ThemedText>
        </View>

        {/* Storage Metrics Display */}
        {isCalculating ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>Calculating system storage usage...</ThemedText>
          </View>
        ) : calculationError ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>Error: {calculationError}</ThemedText>
            <Button
              title="Retry Calculation"
              onPress={calculateStorageMetrics}
              variant="secondary"
              size="sm"
            />
          </View>
        ) : storageMetrics ? (
          <View style={styles.metricsContainer}>
            <View style={styles.metricRow}>
              <ThemedText style={styles.metricLabel}>Total Assessments:</ThemedText>
              <ThemedText style={styles.metricValue}>{storageMetrics.assessmentCount}</ThemedText>
            </View>
            <View style={styles.metricRow}>
              <ThemedText style={styles.metricLabel}>Images Stored:</ThemedText>
              <ThemedText style={styles.metricValue}>{storageMetrics.imageCount}</ThemedText>
            </View>
            <View style={styles.metricRow}>
              <ThemedText style={styles.metricLabel}>Firestore Data:</ThemedText>
              <ThemedText style={styles.metricValue}>{storageMetrics.formattedFirestoreSize}</ThemedText>
            </View>
            <View style={styles.metricRow}>
              <ThemedText style={styles.metricLabel}>Image Storage:</ThemedText>
              <ThemedText style={styles.metricValue}>{storageMetrics.formattedStorageSize}</ThemedText>
            </View>
            <View style={[styles.metricRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>Total Storage:</ThemedText>
              <ThemedText style={styles.totalValue}>{storageMetrics.formattedTotalSize}</ThemedText>
            </View>
            <ThemedText style={styles.lastUpdated}>
              Last updated: {new Date(storageMetrics.lastCalculated).toLocaleString()}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <ThemedText style={styles.noDataText}>No storage data available</ThemedText>
            <Button
              title="Calculate Storage"
              onPress={calculateStorageMetrics}
              variant="secondary"
              size="sm"
            />
          </View>
        )}

        <View style={{ height: 16 }} />

        {/* Action Buttons */}
        <Button title={busy === 'export' ? 'Exporting...' : 'Export All Data to CSV'} onPress={onExport} disabled={!!busy} />
        <View style={{ height: 8 }} />
        <Button title={busy === 'import' ? 'Importing...' : 'Import Data from CSV'} onPress={onImport} disabled={!!busy} variant="secondary" />
        <View style={{ height: 8 }} />
        <Button title="Clear All System Data" onPress={() => {
          Alert.alert('Clear all system data', 'This will remove ALL assessments and photos from ALL users. This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete All', style: 'destructive', onPress: async () => {
              await FirestoreService.clearAllSystemData();
              await calculateStorageMetrics();
            } },
          ]);
        }} variant="danger" />
      </Card>

      {/* About */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="information-circle-outline" size={18} color={Colors[scheme].text} style={{ marginRight: 6 }} />
          <ThemedText style={styles.cardTitle}>About Asset Audit</ThemedText>
        </View>
        <View style={styles.rowBetween}>
          <ThemedText>Version</ThemedText>
          <View style={[styles.badge, { backgroundColor: Colors[scheme].tint }]}>
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
              {Constants?.expoConfig?.version || (Constants as any)?.manifest?.version || Constants?.nativeAppVersion || '1.0.0'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.rowBetween}>
          <ThemedText>Platform</ThemedText>
          <ThemedText style={{ opacity: 0.9 }}>
            {Platform.OS === 'web' ? 'Mobile Web App' : Platform.OS === 'ios' ? 'iOS App' : 'Android App'}
          </ThemedText>
        </View>
      </Card>

      {/* Date Filter Modal */}
      <DateFilterModal
        visible={showDateFilterModal}
        onClose={() => setShowDateFilterModal(false)}
        onApply={handleExportWithFilter}
      />
    </ScrollView>
  );
}

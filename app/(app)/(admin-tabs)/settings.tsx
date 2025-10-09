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

export default function AdminSettings() {
  const scheme = useColorScheme() ?? 'light';
  const [busy, setBusy] = React.useState<'export' | 'import' | null>(null);
  const { preferred, setPreferred } = useThemePreference();
  const [counts, setCounts] = React.useState({ total: 0, sizeKB: 0 });
  const { user, userProfile, signOut } = useAuth();
  const [showDateFilterModal, setShowDateFilterModal] = React.useState(false);

  const recalc = React.useCallback(async () => {
    // Admin can see all assessments
    const rows = await FirestoreService.listAllAssessments();
    let bytes = 0;

    const FS: any = FileSystem as any;
    const doc = FS.documentDirectory as string | undefined;
    const cache = FS.cacheDirectory as string | undefined;
    const photoDirs = [doc ? doc + 'photos/' : null, cache ? cache + 'photos/' : null].filter(Boolean) as string[];
    for (const dir of photoDirs) {
      try {
        const names = await FileSystem.readDirectoryAsync(dir);
        for (const name of names) {
          try {
            const info = await FileSystem.getInfoAsync(dir + name, { size: true } as any);
            if ((info as any).exists && typeof (info as any).size === 'number') bytes += (info as any).size as number;
          } catch {}
        }
      } catch {}
    }

    setCounts({ total: rows.length, sizeKB: Math.round(bytes / 1024) });
  }, []);

  useFocusEffect(React.useCallback(() => {
    recalc();
  }, [recalc]));

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
        await recalc(); 
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
        <ThemedText style={styles.cardTitle}>Data Management</ThemedText>
        <ThemedText style={{ marginBottom: 8 }}>Total Audits: {counts.total}   •   Storage: {counts.sizeKB} KB</ThemedText>
        <Button title={busy === 'export' ? 'Exporting...' : 'Export All Data to CSV'} onPress={onExport} disabled={!!busy} />
        <View style={{ height: 8 }} />
        <Button title={busy === 'import' ? 'Importing...' : 'Import Data from CSV'} onPress={onImport} disabled={!!busy} variant="secondary" />
        <View style={{ height: 8 }} />
        <Button title="Clear All System Data" onPress={() => {
          Alert.alert('Clear all system data', 'This will remove ALL assessments and photos from ALL users. This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete All', style: 'destructive', onPress: async () => {
              await FirestoreService.clearAllSystemData();
              await recalc();
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

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  cardTitle: { fontWeight: '700', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
});

import React from 'react';
import { Alert, StyleSheet, View, ScrollView, Platform, Modal, TextInput, TouchableOpacity } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StorageCalculationService, type FormattedStorageMetrics } from '@/lib/storageCalculation';
import { DateFilterModal } from '@/components/ui/DateFilterModal';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function Settings() {
  const scheme = useColorScheme() ?? 'light';
  const [busy, setBusy] = React.useState<'export' | 'import' | null>(null);
  const { preferred, setPreferred } = useThemePreference();
  const [storageMetrics, setStorageMetrics] = React.useState<FormattedStorageMetrics | null>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [calculationError, setCalculationError] = React.useState<string | null>(null);
  const { user, userProfile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [showDateFilterModal, setShowDateFilterModal] = React.useState(false);
  
  // Profile edit states
  const [showNameModal, setShowNameModal] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [newDisplayName, setNewDisplayName] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [updating, setUpdating] = React.useState(false);

  // Create dynamic styles based on current color scheme
  const createStyles = (scheme: 'light' | 'dark') => StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    container: {
      padding: 16,
      gap: 16,
      flexGrow: 1,
    },
    pageTitle: {
      marginBottom: 20,
      textAlign: 'center',
      // Ensure proper spacing and visibility
      paddingHorizontal: 16,
    },
    cardTitle: {
      fontWeight: '700',
      marginBottom: 8
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'flex-start', // Changed from 'center' to handle multi-line text
      justifyContent: 'space-between',
      paddingVertical: 8,
      minHeight: 32, // Ensure consistent row height
    },
    labelText: {
      flex: 0,
      minWidth: 60,
      marginRight: 12,
    },
    valueText: {
      flex: 1,
      opacity: 0.9,
      textAlign: 'right',
      // Ensure text wraps properly within container
      flexShrink: 1,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      flexShrink: 0, // Prevent badge from shrinking
    },
    badgeText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
    },

    // Storage metrics styles - now properly themed
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
      backgroundColor: scheme === 'dark' ? '#7f1d1d' : '#fee2e2', // Dark red for dark mode, light red for light mode
      borderRadius: 8,
      marginBottom: 8,
    },
    errorText: {
      color: scheme === 'dark' ? '#fca5a5' : '#dc2626', // Light red text for dark mode, dark red for light mode
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
    
    // Profile edit styles
    editButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    readOnlyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
      borderWidth: 1,
      borderColor: Colors[scheme].border,
    },
    readOnlyText: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 500,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 20,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 14,
      opacity: 0.7,
    },
    modalCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBody: {
      padding: 20,
      maxHeight: 400,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: Colors[scheme].border,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    helperText: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 6,
    },
    infoBox: {
      flexDirection: 'row',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 10,
      alignItems: 'flex-start',
    },
    infoText: {
      fontSize: 13,
      flex: 1,
      lineHeight: 18,
    },
  });

  const styles = createStyles(scheme);

  const calculateStorageMetrics = React.useCallback(async () => {
    if (!user) {
      setStorageMetrics(null);
      setCalculationError(null);
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      console.log('Calculating Firebase storage metrics for user:', user.uid);
      const metrics = await StorageCalculationService.getFormattedUserStorageMetrics(user.uid);
      console.log('Storage metrics calculated:', metrics);
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
      
      const path = await exportZip(user?.uid, filters || undefined);
      Alert.alert(
        'Export Complete', 
        `Your data has been exported to CSV${filterText}.\n\nFile: ${path.split('/').pop()}\n\nImage URLs are included and clickable in Excel/Google Sheets.`,
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
          'Your CSV data has been imported successfully.\n\nNote: Images must already be in Firebase Storage (via exported URLs).',
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

  const handleUpdateDisplayName = async () => {
    if (!newDisplayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    if (newDisplayName.trim().length < 2) {
      Alert.alert('Error', 'Display name must be at least 2 characters');
      return;
    }

    try {
      setUpdating(true);
      if (user) {
        await updateProfile(user, {
          displayName: newDisplayName.trim()
        });
        Alert.alert('Success', 'Display name updated successfully');
        setShowNameModal(false);
        setNewDisplayName('');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update display name');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    try {
      setUpdating(true);

      // Re-authenticate user before password change (security requirement)
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Update password
        await updatePassword(user, newPassword);
        
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Current password is incorrect');
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('Error', 'Too many failed attempts. Please try again later');
      } else {
        Alert.alert('Error', error?.message || 'Failed to change password');
      }
    } finally {
      setUpdating(false);
    }
  };

  const openNameModal = () => {
    setNewDisplayName(user?.displayName || '');
    setShowNameModal(true);
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
    <View style={[styles.wrapper, { backgroundColor: Colors[scheme].background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title" style={styles.pageTitle}>Settings</ThemedText>

      {/* User Profile Section */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="person-circle-outline" size={20} color={Colors[scheme].text} style={{ marginRight: 8 }} />
          <ThemedText style={styles.cardTitle}>Profile Information</ThemedText>
        </View>
        
        {/* Display Name - Editable */}
        <View style={[styles.rowBetween, { marginBottom: 12 }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.labelText}>Display Name</ThemedText>
            <ThemedText style={[styles.valueText, { marginTop: 4, fontSize: 16 }]}>
              {user?.displayName || 'Not set'}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={openNameModal}
            style={[styles.editButton, { backgroundColor: Colors[scheme].tint + '20' }]}
          >
            <Ionicons name="pencil" size={16} color={Colors[scheme].tint} />
          </TouchableOpacity>
        </View>

        {/* Email - Read Only */}
        <View style={[styles.rowBetween, { marginBottom: 12 }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.labelText}>Email</ThemedText>
            <ThemedText style={[styles.valueText, { marginTop: 4, fontSize: 14, opacity: 0.7 }]} numberOfLines={1}>
              {user?.email || 'Unknown'}
            </ThemedText>
          </View>
          <View style={[styles.readOnlyBadge, { backgroundColor: Colors[scheme].background }]}>
            <Ionicons name="lock-closed" size={14} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
            <ThemedText style={[styles.readOnlyText, { opacity: 0.5 }]}>Admin Only</ThemedText>
          </View>
        </View>

        {/* Role - Read Only */}
        <View style={[styles.rowBetween, { marginBottom: 16 }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.labelText}>Role</ThemedText>
            <View style={{ marginTop: 6 }}>
              <View style={[styles.badge, {
                backgroundColor: userProfile?.role === 'admin' ? '#ef4444' : '#10b981',
                alignSelf: 'flex-start'
              }]}>
                <Ionicons 
                  name={userProfile?.role === 'admin' ? 'shield-checkmark' : 'person'} 
                  size={14} 
                  color="white" 
                  style={{ marginRight: 4 }} 
                />
                <ThemedText style={styles.badgeText}>
                  {userProfile?.role === 'admin' ? 'Admin' : 'Staff'}
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={[styles.readOnlyBadge, { backgroundColor: Colors[scheme].background }]}>
            <Ionicons name="lock-closed" size={14} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
            <ThemedText style={[styles.readOnlyText, { opacity: 0.5 }]}>Admin Only</ThemedText>
          </View>
        </View>

        {/* Account Security */}
        <View style={{ 
          borderTopWidth: 1, 
          borderTopColor: Colors[scheme].border, 
          paddingTop: 16,
          marginBottom: 16 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors[scheme].text} style={{ marginRight: 6, opacity: 0.7 }} />
            <ThemedText style={[styles.labelText, { fontWeight: '600' }]}>Account Security</ThemedText>
          </View>
          <Button 
            title="Change Password" 
            onPress={() => setShowPasswordModal(true)} 
            variant="secondary"
            style={{ marginBottom: 8 }}
          />
        </View>

        <Button title="Sign Out" onPress={handleSignOut} variant="danger" />
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>Appearance</ThemedText>
        <View style={{ gap: 8 }}>
          <Button title={preferred === 'light' ? 'Light •' : 'Light'} onPress={() => setPreferred('light')} variant={preferred === 'light' ? 'primary' : 'secondary'} />
          <Button title={preferred === 'dark' ? 'Dark •' : 'Dark'} onPress={() => setPreferred('dark')} variant={preferred === 'dark' ? 'primary' : 'secondary'} />
          <Button title={preferred === 'system' ? 'System •' : 'System'} onPress={() => setPreferred('system')} variant={preferred === 'system' ? 'primary' : 'secondary'} />
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="server-outline" size={18} color={Colors[scheme].text} style={{ marginRight: 6 }} />
          <ThemedText style={styles.cardTitle}>Data Management</ThemedText>
        </View>

        {/* Storage Metrics Display */}
        {isCalculating ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>Calculating storage usage...</ThemedText>
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
        <Button title={busy === 'export' ? 'Exporting...' : 'Export Data to CSV'} onPress={onExport} disabled={!!busy} />
        <View style={{ height: 8 }} />
        <Button title={busy === 'import' ? 'Importing...' : 'Import Data from CSV'} onPress={onImport} disabled={!!busy} variant="secondary" />
        <View style={{ height: 8 }} />
        <Button title="Clear My Data" onPress={() => {
          Alert.alert('Clear my data', 'This will remove all your assessments and photos.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
              if (user) {
                await FirestoreService.clearUserData(user.uid);
                await calculateStorageMetrics();
              }
            } },
          ]);
        }} variant="danger" />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="information-circle-outline" size={18} color={Colors[scheme].text} style={{ marginRight: 6 }} />
          <ThemedText style={styles.cardTitle}>About Asset Audit</ThemedText>
        </View>
        <View style={styles.rowBetween}>
          <ThemedText style={styles.labelText}>Version</ThemedText>
          <View style={[styles.badge, { backgroundColor: Colors[scheme].tint }]}>
            <ThemedText style={styles.badgeText}>
              {Constants?.expoConfig?.version || (Constants as any)?.manifest?.version || Constants?.nativeAppVersion || '1.0.0'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.rowBetween}>
          <ThemedText style={styles.labelText}>Platform</ThemedText>
          <ThemedText style={styles.valueText}>
            {Platform.OS === 'web' ? 'Mobile Web App' : Platform.OS === 'ios' ? 'iOS App' : 'Android App'}
          </ThemedText>
        </View>
      </Card>
      </ScrollView>

      {/* Date Filter Modal */}
      <DateFilterModal
        visible={showDateFilterModal}
        onClose={() => setShowDateFilterModal(false)}
        onApply={handleExportWithFilter}
      />

      {/* Edit Display Name Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[scheme].card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: Colors[scheme].border }]}>
              <View>
                <ThemedText style={styles.modalTitle}>Edit Display Name</ThemedText>
                <ThemedText style={styles.modalSubtitle}>Update your display name</ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => setShowNameModal(false)}
                style={[styles.modalCloseButton, { backgroundColor: Colors[scheme].background }]}
              >
                <Ionicons name="close" size={24} color={Colors[scheme].text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <ThemedText style={styles.inputLabel}>Display Name</ThemedText>
              <TextInput
                style={[styles.input, {
                  backgroundColor: Colors[scheme].background,
                  borderColor: Colors[scheme].border,
                  color: Colors[scheme].text,
                }]}
                value={newDisplayName}
                onChangeText={setNewDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor={Colors[scheme].text + '60'}
                autoCapitalize="words"
              />
              <ThemedText style={styles.helperText}>
                This name will be displayed throughout the app
              </ThemedText>
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setShowNameModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <View style={{ width: 12 }} />
              <Button
                title={updating ? "Updating..." : "Save Changes"}
                onPress={handleUpdateDisplayName}
                disabled={updating}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[scheme].card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: Colors[scheme].border }]}>
              <View>
                <ThemedText style={styles.modalTitle}>Change Password</ThemedText>
                <ThemedText style={styles.modalSubtitle}>Update your account password</ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={[styles.modalCloseButton, { backgroundColor: Colors[scheme].background }]}
              >
                <Ionicons name="close" size={24} color={Colors[scheme].text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 16 }}>
                <ThemedText style={styles.inputLabel}>Current Password</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: Colors[scheme].background,
                    borderColor: Colors[scheme].border,
                    color: Colors[scheme].text,
                  }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={Colors[scheme].text + '60'}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <ThemedText style={styles.inputLabel}>New Password</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: Colors[scheme].background,
                    borderColor: Colors[scheme].border,
                    color: Colors[scheme].text,
                  }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={Colors[scheme].text + '60'}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <ThemedText style={styles.helperText}>
                  Must be at least 6 characters
                </ThemedText>
              </View>

              <View style={{ marginBottom: 16 }}>
                <ThemedText style={styles.inputLabel}>Confirm New Password</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: Colors[scheme].background,
                    borderColor: Colors[scheme].border,
                    color: Colors[scheme].text,
                  }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors[scheme].text + '60'}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.infoBox, { 
                backgroundColor: Colors[scheme].tint + '15',
                borderColor: Colors[scheme].tint + '30',
              }]}>
                <Ionicons name="shield-checkmark" size={20} color={Colors[scheme].tint} />
                <ThemedText style={styles.infoText}>
                  For security, you'll need your current password to make changes
                </ThemedText>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setShowPasswordModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <View style={{ width: 12 }} />
              <Button
                title={updating ? "Changing..." : "Change Password"}
                onPress={handleChangePassword}
                disabled={updating}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

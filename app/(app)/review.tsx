import { router, useLocalSearchParams, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, View, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { FirestoreService } from '@/lib/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { useOffline } from '@/lib/offline/OfflineContext';
import { saveOfflineAssessment } from '@/lib/offline/offlineStorage';

function getRiskInfo(score: number) {
  if (score >= 1 && score <= 6) return { level: 'Low', color: '#22c55e' };
  if (score >= 7 && score <= 12) return { level: 'Medium', color: '#f59e0b' };
  if (score >= 13 && score <= 18) return { level: 'High', color: '#fb923c' };
  return { level: 'Critical', color: '#ef4444' };
}

export default function Review() {
  const scheme = useColorScheme() ?? 'light';
  const params = useLocalSearchParams<{
    photoUri?: string; lat?: string; lon?: string;
    building?: string; floor?: string; room?: string;
    category?: string; element?: string; floorLevel?: string;
    createdAt?: string;
    condition?: string; priority?: string;
    damageCategory?: string; rootCause?: string; rootCauseDetails?: string;
    notes?: string;
  }>();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { user } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();

  const createdAt = params.createdAt ? Number(params.createdAt) : Date.now();
  const createdAtLabel = Number.isFinite(createdAt) ? new Date(createdAt).toLocaleString() : 'Unknown';
  const floorDisplay = params.floor || params.floorLevel || '';

  const condition = Number(params.condition ?? 0);
  const priority  = Number(params.priority ?? 0);
  const total = condition * priority;
  const riskInfo = getRiskInfo(total);

  async function onSave() {
    if (!params.photoUri || !user) return;

    setSaving(true);

    try {
      // Validate that we have an image URI
      if (!params.photoUri || params.photoUri.trim() === '') {
        Alert.alert('Error', 'No image selected. Please select an image before saving.');
        return;
      }

      const assessmentData = {
        userId: user.id,
        created_at: createdAt,
        latitude: params.lat ? Number(params.lat) : null,
        longitude: params.lon ? Number(params.lon) : null,
        building: params.building || '',
        floor: params.floor || '',
        room: params.room || '',
        category: params.category as string,
        element: params.element as string,
        floorLevel: params.floorLevel || '',
        condition,
        priority,
        damageCategory: params.damageCategory || '',
        rootCause: params.rootCause || '',
        rootCauseDetails: params.rootCauseDetails || '',
        photo_uri: params.photoUri,
        notes: params.notes || '',
      };

      // Check if online
      if (isOnline) {
        // Online: Upload to API
        setUploadingImage(true);
        await FirestoreService.createAssessmentWithImageUpload(assessmentData);
        console.log('✅ Assessment saved to API successfully');
        
        setShowSuccessModal(true);
      } else {
        // Offline: Save to local database
        const photoId = `photo_${Date.now()}`;
        await saveOfflineAssessment(assessmentData, [
          { id: photoId, uri: params.photoUri }
        ]);
        console.log('✅ Assessment saved offline successfully');
        
        // Refresh pending count
        await refreshPendingCount();

        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);

      // Provide more specific error messages based on the error
      let errorMessage = 'Failed to save the assessment. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('Failed to upload image')) {
          errorMessage = 'Failed to upload the image. Please check your internet connection and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. The assessment has been saved offline and will sync when connection is restored.';
          
          // Try to save offline as fallback
          try {
            const photoId = `photo_${Date.now()}`;
            await saveOfflineAssessment({
              userId: user.id,
              created_at: createdAt,
              latitude: params.lat ? Number(params.lat) : null,
              longitude: params.lon ? Number(params.lon) : null,
              building: params.building || '',
              floor: params.floor || '',
              room: params.room || '',
              category: params.category as string,
              element: params.element as string,
              floorLevel: params.floorLevel || '',
              condition,
              priority,
              damageCategory: params.damageCategory || '',
              rootCause: params.rootCause || '',
              rootCauseDetails: params.rootCauseDetails || '',
              photo_uri: params.photoUri,
              notes: params.notes || '',
            }, [{ id: photoId, uri: params.photoUri }]);
            console.log('✅ Assessment saved offline as fallback');
            
            await refreshPendingCount();
            router.replace('/(app)/(tabs)/');
            return;
          } catch (offlineError) {
            console.error('Failed to save offline:', offlineError);
          }
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission error. Please make sure you have the necessary permissions.';
        }
      }

      Alert.alert('Save Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Review Summary',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={{ marginRight: 15 }}
              disabled={saving || uploadingImage}
            >
              <Ionicons name="arrow-back" size={24} color={Colors[scheme].text} />
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView 
        style={{ flex: 1, backgroundColor: Colors[scheme].background }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {params.photoUri ? <Image source={{ uri: params.photoUri }} style={styles.photo} /> : null}
        
        <ThemedText style={styles.h1}>Assessment Summary</ThemedText>
      
      {/* Risk Score Card */}
      <View style={[styles.riskCard, { backgroundColor: riskInfo.color + '15', borderColor: riskInfo.color }]}>
        <View style={[styles.riskBadge, { backgroundColor: riskInfo.color }]}>
          <ThemedText style={styles.riskScore}>{total}</ThemedText>
        </View>
        <View style={styles.riskInfo}>
          <ThemedText style={[styles.riskLevel, { color: riskInfo.color }]}>{riskInfo.level} Risk</ThemedText>
          <ThemedText style={styles.riskFormula}>Condition ({condition}) × Priority ({priority})</ThemedText>
        </View>
      </View>

      {/* Asset Details */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Asset Information</ThemedText>
        <View style={styles.row}>
          <ThemedText style={styles.label}>ID:</ThemedText>
          <ThemedText style={styles.value}>Auto-generated on save</ThemedText>
        </View>
        {params.building ? (
          <View style={styles.row}>
            <ThemedText style={styles.label}>Building:</ThemedText>
            <ThemedText style={styles.value}>{params.building}</ThemedText>
          </View>
        ) : null}
        {floorDisplay ? (
          <View style={styles.row}>
            <ThemedText style={styles.label}>Floor:</ThemedText>
            <ThemedText style={styles.value}>{floorDisplay}</ThemedText>
          </View>
        ) : null}
        {params.room ? (
          <View style={styles.row}>
            <ThemedText style={styles.label}>Room:</ThemedText>
            <ThemedText style={styles.value}>{params.room}</ThemedText>
          </View>
        ) : null}
        <View style={styles.row}>
          <ThemedText style={styles.label}>Category:</ThemedText>
          <ThemedText style={styles.value}>{params.category}</ThemedText>
        </View>
        <View style={styles.row}>
          <ThemedText style={styles.label}>Element:</ThemedText>
          <ThemedText style={styles.value}>{params.element}</ThemedText>
        </View>
      </View>

      {/* Damage & Cause */}
      {(params.damageCategory || params.rootCause) && (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Damage Analysis</ThemedText>
          {params.damageCategory && (
            <View style={styles.row}>
              <ThemedText style={styles.label}>Damage Type:</ThemedText>
              <ThemedText style={styles.value}>{params.damageCategory}</ThemedText>
            </View>
          )}
          {params.rootCause && (
            <View style={styles.row}>
              <ThemedText style={styles.label}>Root Cause:</ThemedText>
              <ThemedText style={styles.value}>{params.rootCause}</ThemedText>
            </View>
          )}
          {params.rootCauseDetails && (
            <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <ThemedText style={styles.label}>Details:</ThemedText>
              <ThemedText style={[styles.value, { marginTop: 4 }]}>{params.rootCauseDetails}</ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Audit Metadata */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Audit Metadata</ThemedText>
        <View style={styles.row}>
          <ThemedText style={styles.label}>Time:</ThemedText>
          <ThemedText style={styles.value}>{createdAtLabel}</ThemedText>
        </View>
        {(params.lat && params.lon) ? (
          <View style={styles.row}>
            <ThemedText style={styles.label}>GPS:</ThemedText>
            <ThemedText style={styles.value}>
              {Number(params.lat).toFixed(6)}, {Number(params.lon).toFixed(6)}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.row}>
            <ThemedText style={styles.label}>GPS:</ThemedText>
            <ThemedText style={styles.value}>Unavailable</ThemedText>
          </View>
        )}
      </View>

      {/* Notes */}
      {params.notes && (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Notes & Observations</ThemedText>
          <ThemedText style={styles.notesText}>{params.notes}</ThemedText>
        </View>
      )}

      <View style={{ height: 20 }} />
      
      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Button
          title="Back to Edit"
          onPress={() => router.back()}
          variant="secondary"
          disabled={saving || uploadingImage}
          style={{ flex: 1 }}
        />
        <Button
          title={uploadingImage ? 'Uploading...' : saving ? 'Saving...' : 'Save Assessment'}
          onPress={onSave}
          disabled={saving || uploadingImage}
          style={{ flex: 1 }}
        />
      </View>
      
      <View style={{ height: 20 }} />
    </ScrollView>

    {/* Success Modal */}
    <Modal
      visible={showSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowSuccessModal(false);
        router.replace('/(app)/(tabs)/');
      }}
    >
      <View style={styles.successModalOverlay}>
        <Pressable 
          style={styles.successModalBackdrop} 
          onPress={() => {
            setShowSuccessModal(false);
            router.replace('/(app)/(tabs)/');
          }}
        />
        <View style={[styles.successModalContent, { backgroundColor: Colors[scheme].background }]}>
          <View style={styles.successIconContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
          </View>
          
          <ThemedText style={styles.successTitle}>Success!</ThemedText>
          <ThemedText style={styles.successMessage}>
            {isOnline 
              ? 'Assessment saved successfully!' 
              : 'Assessment saved offline and will sync when connected.'}
          </ThemedText>
          
          <TouchableOpacity
            style={[styles.successButton, { backgroundColor: Colors[scheme].tint }]}
            onPress={() => {
              setShowSuccessModal(false);
              console.log('Navigating to home after save...');
              router.replace('/(app)/(tabs)/');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={20} color="#fff" style={{ marginRight: 8 }} />
            <ThemedText style={styles.successButtonText}>Go to Dashboard</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  h1: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  photo: { width: '100%', height: 240, resizeMode: 'cover', marginBottom: 16, borderRadius: 12 },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  riskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
  },
  riskBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  riskScore: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  riskInfo: {
    flex: 1,
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  riskFormula: {
    fontSize: 13,
    opacity: 0.7,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    opacity: 0.7,
    width: 110,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  successModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  successModalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


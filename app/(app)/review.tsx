import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, View, Alert } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/themed-text';
// Removed old SQLite import - now using FirestoreService
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { FirestoreService } from '@/lib/firestore';
import { useAuth } from '@/lib/auth/AuthContext';

function bucket(total: number) {
  if (total <= 5) return { grade: 'A', label: 'Very Good' };
  if (total <= 10) return { grade: 'B', label: 'Good' };
  if (total <= 15) return { grade: 'C', label: 'Fair' };
  return { grade: 'D', label: 'Poor' };
}

export default function Review() {
  const scheme = useColorScheme() ?? 'light';
  const params = useLocalSearchParams<{
    photoUri?: string; lat?: string; lon?: string;
    category?: string; element?: string;
    condition?: string; priority?: string; notes?: string;
  }>();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user } = useAuth();

  const condition = Number(params.condition ?? 0);
  const priority  = Number(params.priority ?? 0);
  const total = condition * priority;
  const b = bucket(total);

  async function onSave() {
    if (!params.photoUri || !user) return;

    setSaving(true);
    setUploadingImage(true);

    try {
      // Validate that we have an image URI
      if (!params.photoUri || params.photoUri.trim() === '') {
        Alert.alert('Error', 'No image selected. Please select an image before saving.');
        return;
      }

      // Use the new method that uploads image to Firebase Storage
      await FirestoreService.createAssessmentWithImageUpload({
        userId: user.uid,
        created_at: Date.now(),
        latitude: params.lat ? Number(params.lat) : null,
        longitude: params.lon ? Number(params.lon) : null,
        category: params.category as string,
        element: params.element as string,
        condition,
        priority,
        photo_uri: params.photoUri, // This will be replaced with Firebase Storage URL
        notes: params.notes || '',
      });

      // Navigate to History tab to show the newly created assessment
      router.replace('/(app)/(tabs)/history');
    } catch (error) {
      console.error('Error saving assessment:', error);

      // Provide more specific error messages based on the error
      let errorMessage = 'Failed to save the assessment. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('Failed to upload image')) {
          errorMessage = 'Failed to upload the image. Please check your internet connection and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission error. Please make sure you have the necessary permissions.';
        }
      }

      Alert.alert('Upload Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      {params.photoUri ? <Image source={{ uri: params.photoUri }} style={styles.photo} /> : null}
      <ThemedText style={styles.h1}>Summary</ThemedText>
      <ThemedText>Category: {params.category}</ThemedText>
      <ThemedText>Element: {params.element}</ThemedText>
      <ThemedText>Condition: {condition}</ThemedText>
      <ThemedText>Priority: {priority}</ThemedText>
      <ThemedText>Matrix Score: {total} — {b.label} ({b.grade})</ThemedText>
      {(params.lat && params.lon) ? (
        <ThemedText>GPS: {Number(params.lat).toFixed(6)}, {Number(params.lon).toFixed(6)}</ThemedText>
      ) : null}
      <ThemedText>Notes: {params.notes || '-'}</ThemedText>

      <View style={{ height: 12 }} />
      <Button
        title={uploadingImage ? 'Uploading image...' : saving ? 'Saving...' : 'Save assessment'}
        onPress={onSave}
        disabled={saving || uploadingImage}
      />
      <View style={{ height: 8 }} />
      <Button
        title="New assessment"
        onPress={() => router.replace('/(app)/(tabs)')}
        variant="secondary"
        disabled={saving || uploadingImage}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h1: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  photo: { width: '100%', height: 240, resizeMode: 'cover', marginBottom: 12, borderRadius: 8 },
});

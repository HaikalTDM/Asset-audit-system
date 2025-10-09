import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, Pressable, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { FirestoreService, type Assessment } from '@/lib/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { ZoomImageModal } from '@/components/ui/ZoomImageModal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

function grade(total: number) {
  if (total <= 5) return { grade: 'A', label: 'Very Good' };
  if (total <= 10) return { grade: 'B', label: 'Good' };
  if (total <= 15) return { grade: 'C', label: 'Fair' };
  return { grade: 'D', label: 'Poor' };
}

export default function AssessmentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Assessment | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const scheme = useColorScheme() ?? 'light';
  const { user } = useAuth();

  useEffect(() => {
    (async () => { 
      if (id && user) {
        try {
          const assessment = await FirestoreService.getAssessment(id);
          setItem(assessment);
        } catch (error) {
          console.error('Error loading assessment:', error);
        }
      }
    })();
  }, [id, user]);

  if (!item) {
    return (
      <>
        <Stack.Screen options={{ title: String(id) }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <ThemedText>Loading…</ThemedText>
        </View>
      </>
    );
  }

  const total = item.condition * item.priority;
  const g = grade(total);

  return (
    <>
      <Stack.Screen options={{ title: item.id }} />
      <ScrollView style={{ backgroundColor: Colors[scheme].background }} contentContainerStyle={styles.container}>
        <Pressable onPress={() => setViewerOpen(true)}>
          {imageError ? (
            <View style={[styles.photo, { backgroundColor: Colors[scheme].card, justifyContent: 'center', alignItems: 'center' }]}>
              <ThemedText style={{ textAlign: 'center', opacity: 0.6 }}>
                Image not available{'\n'}
                <ThemedText style={{ fontSize: 12 }}>
                  This may be an older assessment with a local image
                </ThemedText>
              </ThemedText>
            </View>
          ) : (
            <Image
              source={{ uri: item.photo_uri }}
              style={styles.photo}
              onError={() => setImageError(true)}
            />
          )}
        </Pressable>
        <ThemedText type="subtitle" style={{ marginBottom: 6 }}>Assessment</ThemedText>
        <ThemedText>Category: {item.category}</ThemedText>
        <ThemedText>Element: {item.element}</ThemedText>
        <ThemedText>Condition: {item.condition}</ThemedText>
        <ThemedText>Priority: {item.priority}</ThemedText>
        <ThemedText>Score: {total} — {g.label} ({g.grade})</ThemedText>
        {item.latitude != null && item.longitude != null && (
          <ThemedText>GPS: {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}</ThemedText>
        )}
        <ThemedText>Date: {new Date(item.created_at).toLocaleString()}</ThemedText>

        <View style={{ height: 12 }} />
        <ThemedText type="subtitle" style={{ marginBottom: 6 }}>Notes</ThemedText>
        <ThemedText>{item.notes || '-'}</ThemedText>

        <View style={{ height: 16 }} />
        <Button title="View Photo" onPress={() => setViewerOpen(true)} variant="secondary" />
        {item.latitude != null && item.longitude != null ? (
          <>
            <View style={{ height: 8 }} />
            <Button title="Open on map" onPress={() => openOnMap(item.latitude!, item.longitude!, item.id!)} />
          </>
        ) : null}

        {!imageError && (
          <ZoomImageModal uri={item.photo_uri} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
        )}
      </ScrollView>
    </>
  );
}
const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  photo: { width: '100%', height: 260, resizeMode: 'cover', borderRadius: 10, marginBottom: 8 },
});
function openOnMap(lat: number, lon: number, id: string) {
  const label = encodeURIComponent(id);
  const apple = `http://maps.apple.com/?ll=${lat},${lon}&q=${label}`;
  const geo = `geo:${lat},${lon}?q=${lat},${lon}(${label})`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  const url = Platform.OS === 'ios' ? apple : geo;
  return Linking.openURL(url).catch(() => Linking.openURL(gmaps));
}

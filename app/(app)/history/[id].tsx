import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, Pressable, Platform, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FirestoreService, type Assessment } from '@/lib/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { ZoomImageModal } from '@/components/ui/ZoomImageModal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { generateSingleAssessmentPDF, sharePDF } from '@/lib/pdf/pdfGenerator';
import { Ionicons } from '@expo/vector-icons';

function grade(total: number) {
  if (total <= 5) return { grade: 'A', label: 'Very Good', color: '#22c55e' };
  if (total <= 10) return { grade: 'B', label: 'Good', color: '#3b82f6' };
  if (total <= 15) return { grade: 'C', label: 'Fair', color: '#f59e0b' };
  return { grade: 'D', label: 'Poor', color: '#ef4444' };
}

function getConditionInfo(condition: number) {
  // Mapping: 1=Excellent, 2=Good, 3=Fair, 4=Poor, 5=Critical
  const conditions = [
    { label: 'Excellent', color: '#10b981', icon: 'star' as const },           // 1
    { label: 'Good', color: '#22c55e', icon: 'checkmark-circle' as const },   // 2
    { label: 'Fair', color: '#f59e0b', icon: 'information-circle' as const }, // 3
    { label: 'Poor', color: '#ea580c', icon: 'warning' as const },            // 4
    { label: 'Critical', color: '#dc2626', icon: 'alert-circle' as const },   // 5
  ];
  return conditions[condition - 1] || conditions[0];
}

function getPriorityInfo(priority: number) {
  // Mapping: 1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High
  const priorities = [
    { label: 'Very Low', color: '#6b7280', icon: 'arrow-down' as const },     // 1
    { label: 'Low', color: '#3b82f6', icon: 'arrow-down' as const },          // 2
    { label: 'Medium', color: '#f59e0b', icon: 'remove' as const },           // 3
    { label: 'High', color: '#fb923c', icon: 'arrow-up' as const },           // 4
    { label: 'Very High', color: '#dc2626', icon: 'arrow-up' as const },      // 5
  ];
  return priorities[priority - 1] || priorities[0];
}

export default function AssessmentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Assessment | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
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

  const handleGeneratePDF = async () => {
    if (!item || !id) return;
    
    setGeneratingPDF(true);
    try {
      const pdfUri = await generateSingleAssessmentPDF(id, {
        includePhotos: true,
        includeMap: true,
      });
      
      await sharePDF(pdfUri, `assessment-${id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

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
  const conditionInfo = getConditionInfo(item.condition);
  const priorityInfo = getPriorityInfo(item.priority);

  return (
    <>
      <Stack.Screen options={{ title: item.id }} />
      <ScrollView 
        style={{ backgroundColor: Colors[scheme].background }} 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Section */}
        <Pressable onPress={() => setViewerOpen(true)} style={styles.photoContainer}>
          {imageError ? (
            <View style={[styles.photo, { backgroundColor: Colors[scheme].card, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="image-outline" size={48} color={Colors[scheme].text} style={{ opacity: 0.3, marginBottom: 8 }} />
              <ThemedText style={{ textAlign: 'center', opacity: 0.6 }}>
                Image not available
              </ThemedText>
              <ThemedText style={{ fontSize: 12, textAlign: 'center', opacity: 0.5, marginTop: 4 }}>
                This may be an older assessment
              </ThemedText>
            </View>
          ) : (
            <>
              <Image
                source={{ uri: item.photo_uri }}
                style={styles.photo}
                onError={() => setImageError(true)}
              />
              <View style={styles.photoOverlay}>
                <View style={styles.photoHint}>
                  <Ionicons name="expand-outline" size={16} color="#fff" />
                  <ThemedText style={styles.photoHintText}>Tap to zoom</ThemedText>
                </View>
              </View>
            </>
          )}
        </Pressable>

        {/* Score Badge - Prominent */}
        <Card variant="elevated" style={[styles.scoreCard, { backgroundColor: g.color + '15', borderColor: g.color + '40', borderWidth: 1 }]}>
          <View style={styles.scoreContent}>
            <View style={[styles.scoreCircle, { backgroundColor: g.color }]}>
              <ThemedText style={styles.scoreGrade}>{g.grade}</ThemedText>
            </View>
            <View style={styles.scoreInfo}>
              <ThemedText style={[styles.scoreLabel, { color: g.color }]}>Overall Score</ThemedText>
              <ThemedText style={[styles.scoreValue, { color: g.color }]}>
                {total} — {g.label}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Assessment Details Card */}
        <Card variant="elevated">
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={20} color={Colors[scheme].tint} />
            <ThemedText style={styles.cardTitle}>Assessment Details</ThemedText>
          </View>

          {/* Category & Element */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="apps-outline" size={18} color={Colors[scheme].tint} />
            </View>
            <View style={styles.detailContent}>
              <ThemedText style={styles.detailLabel}>Category</ThemedText>
              <ThemedText style={styles.detailValue}>{item.category}</ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="cube-outline" size={18} color={Colors[scheme].tint} />
            </View>
            <View style={styles.detailContent}>
              <ThemedText style={styles.detailLabel}>Element</ThemedText>
              <ThemedText style={styles.detailValue}>{item.element}</ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: Colors[scheme].border }]} />

          {/* Condition & Priority Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.badgeContainer}>
              <ThemedText style={styles.badgeTitle}>Condition</ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: conditionInfo.color + '20', borderColor: conditionInfo.color + '40', borderWidth: 1 }]}>
                <Ionicons name={conditionInfo.icon as any} size={13} color={conditionInfo.color} />
                <ThemedText style={[styles.badgeText, { color: conditionInfo.color }]}>
                  {conditionInfo.label}
                </ThemedText>
              </View>
              <ThemedText style={styles.badgeSubtext}>Level {item.condition}/5</ThemedText>
            </View>

            <View style={styles.badgeContainer}>
              <ThemedText style={styles.badgeTitle}>Priority</ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: priorityInfo.color + '20', borderColor: priorityInfo.color + '40', borderWidth: 1 }]}>
                <Ionicons name={priorityInfo.icon as any} size={13} color={priorityInfo.color} />
                <ThemedText style={[styles.badgeText, { color: priorityInfo.color }]}>
                  {priorityInfo.label}
                </ThemedText>
              </View>
              <ThemedText style={styles.badgeSubtext}>Level {item.priority}/5</ThemedText>
            </View>
          </View>
        </Card>

        {/* Location & Time Card */}
        <Card variant="elevated">
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={20} color={Colors[scheme].tint} />
            <ThemedText style={styles.cardTitle}>Location & Time</ThemedText>
          </View>

          {item.latitude != null && item.longitude != null ? (
            <TouchableOpacity 
              style={styles.detailRow}
              onPress={() => openOnMap(item.latitude!, item.longitude!, item.id!)}
              activeOpacity={0.7}
            >
              <View style={styles.detailIcon}>
                <Ionicons name="location" size={18} color={Colors[scheme].tint} />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>GPS Coordinates</ThemedText>
                <ThemedText style={[styles.detailValue, { color: Colors[scheme].tint }]}>
                  {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                </ThemedText>
                <ThemedText style={styles.detailHint}>Tap to open in maps</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors[scheme].text} style={{ opacity: 0.3 }} />
            </TouchableOpacity>
          ) : (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="location-outline" size={18} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>GPS Coordinates</ThemedText>
                <ThemedText style={[styles.detailValue, { opacity: 0.5 }]}>Not recorded</ThemedText>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar" size={18} color={Colors[scheme].tint} />
            </View>
            <View style={styles.detailContent}>
              <ThemedText style={styles.detailLabel}>Date & Time</ThemedText>
              <ThemedText style={styles.detailValue}>
                {new Date(item.created_at).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </ThemedText>
              <ThemedText style={styles.detailHint}>
                {new Date(item.created_at).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Notes Card */}
        {item.notes && (
          <Card variant="elevated">
            <View style={styles.cardHeader}>
              <Ionicons name="document" size={20} color={Colors[scheme].tint} />
              <ThemedText style={styles.cardTitle}>Notes</ThemedText>
            </View>
            <ThemedText style={styles.notesText}>{item.notes}</ThemedText>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {item.latitude != null && item.longitude != null && (
            <Button 
              title="Open in Maps" 
              onPress={() => openOnMap(item.latitude!, item.longitude!, item.id!)} 
              variant="secondary"
              style={{ flex: 1 }}
            />
          )}
          <Button 
            title={generatingPDF ? "Generating..." : "Export PDF"} 
            onPress={handleGeneratePDF} 
            variant="primary"
            disabled={generatingPDF}
            style={{ flex: 1 }}
          />
        </View>

        {!imageError && (
          <ZoomImageModal uri={item.photo_uri} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
        )}
      </ScrollView>
    </>
  );
}
const styles = StyleSheet.create({
  container: { 
    padding: 16, 
    gap: 16,
    paddingBottom: 32,
  },
  
  // Photo styles
  photoContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  photo: { 
    width: '100%', 
    height: 280, 
    resizeMode: 'cover', 
    borderRadius: 16,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  photoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoHintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },

  // Score card styles
  scoreCard: {
    padding: 16,
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreGrade: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Card styles
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Detail row styles
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailHint: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 1,
    marginVertical: 16,
  },

  // Badge styles
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-around',
  },
  badgeContainer: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 6,
    alignSelf: 'stretch',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  badgeSubtext: {
    fontSize: 11,
    opacity: 0.5,
  },

  // Notes styles
  notesText: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
function openOnMap(lat: number, lon: number, id: string) {
  const label = encodeURIComponent(id);
  const apple = `http://maps.apple.com/?ll=${lat},${lon}&q=${label}`;
  const geo = `geo:${lat},${lon}?q=${lat},${lon}(${label})`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  const url = Platform.OS === 'ios' ? apple : geo;
  return Linking.openURL(url).catch(() => Linking.openURL(gmaps));
}

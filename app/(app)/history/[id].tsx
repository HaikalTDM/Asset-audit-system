import { Stack, useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, Pressable, Platform, Alert, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
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

  const handleDelete = async () => {
    if (!id || !item) return;

    setDeleting(true);
    setDeleteModalVisible(false);

    try {
      await FirestoreService.deleteAssessment(id);
      router.back();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      Alert.alert('Error', 'Failed to delete assessment. Please try again.');
      setDeleting(false);
    }
  };

  const handleEditNotes = () => {
    setEditedNotes(item?.notes || '');
    setIsEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    if (!id || !item) return;

    setSavingNotes(true);
    try {
      await FirestoreService.updateAssessment(id, { notes: editedNotes });
      setItem({ ...item, notes: editedNotes });
      setIsEditingNotes(false);
      Alert.alert('Success', 'Notes updated successfully');
    } catch (error) {
      console.error('Error updating notes:', error);
      Alert.alert('Error', 'Failed to update notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingNotes(false);
    setEditedNotes('');
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
  const floorDisplay = item.floor || item.floorLevel;

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
        <Card 
          variant="elevated" 
          style={{
            ...styles.scoreCard,
            backgroundColor: g.color + '15',
            borderColor: g.color + '40',
            borderWidth: 1,
          }}
        >
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

          {item.building ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="business-outline" size={18} color={Colors[scheme].tint} />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Building</ThemedText>
                <ThemedText style={styles.detailValue}>{item.building}</ThemedText>
              </View>
            </View>
          ) : null}

          {floorDisplay ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="layers-outline" size={18} color={Colors[scheme].tint} />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Floor</ThemedText>
                <ThemedText style={styles.detailValue}>{floorDisplay}</ThemedText>
              </View>
            </View>
          ) : null}

          {item.room ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="door-closed-outline" size={18} color={Colors[scheme].tint} />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Room</ThemedText>
                <ThemedText style={styles.detailValue}>{item.room}</ThemedText>
              </View>
            </View>
          ) : null}

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

          {item.damageCategory && (
            <>
              <View style={[styles.divider, { backgroundColor: Colors[scheme].border }]} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="warning-outline" size={18} color={Colors[scheme].tint} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText style={styles.detailLabel}>Damage Type</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.damageCategory}</ThemedText>
                </View>
              </View>
            </>
          )}

          {item.rootCause && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="search-outline" size={18} color={Colors[scheme].tint} />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Root Cause</ThemedText>
                <ThemedText style={styles.detailValue}>{item.rootCause}</ThemedText>
              </View>
            </View>
          )}

          {item.rootCauseDetails && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="list-outline" size={18} color={Colors[scheme].tint} />
              </View>
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Cause Details</ThemedText>
                <ThemedText style={styles.detailValue}>{item.rootCauseDetails}</ThemedText>
              </View>
            </View>
          )}

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
        <Card variant="elevated">
          <View style={styles.cardHeader}>
            <Ionicons name="document" size={20} color={Colors[scheme].tint} />
            <ThemedText style={styles.cardTitle}>Notes</ThemedText>
            {!isEditingNotes && (
              <TouchableOpacity 
                onPress={handleEditNotes}
                style={styles.editButton}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={20} color={Colors[scheme].tint} />
              </TouchableOpacity>
            )}
          </View>
          
          {isEditingNotes ? (
            <>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: Colors[scheme].background,
                    borderColor: Colors[scheme].border,
                    color: Colors[scheme].text,
                  }
                ]}
                value={editedNotes}
                onChangeText={setEditedNotes}
                placeholder="Add notes about this assessment..."
                placeholderTextColor={Colors[scheme].text + '60'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.editButtonsRow}>
                <Button
                  title="Cancel"
                  onPress={handleCancelEdit}
                  variant="secondary"
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Button
                  title={savingNotes ? "Saving..." : "Save"}
                  onPress={handleSaveNotes}
                  variant="primary"
                  size="sm"
                  disabled={savingNotes}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          ) : (
            <ThemedText style={styles.notesText}>
              {item.notes || 'No notes added yet. Tap the edit icon to add notes.'}
            </ThemedText>
          )}
        </Card>

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

        {/* Delete Button */}
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            { 
              backgroundColor: pressed ? '#DC2626' : 'rgba(220, 38, 38, 0.1)',
              borderColor: pressed ? '#DC2626' : 'rgba(220, 38, 38, 0.3)',
            }
          ]}
          onPress={() => setDeleteModalVisible(true)}
          disabled={deleting}
        >
          <Ionicons 
            name="trash-outline" 
            size={20} 
            color="#DC2626"
          />
          <ThemedText style={styles.deleteButtonText}>
            {deleting ? "Deleting..." : "Delete Assessment"}
          </ThemedText>
        </Pressable>

        {!imageError && (
          <ZoomImageModal uri={item.photo_uri} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: Colors[scheme].card }]}>
            {/* Icon */}
            <View style={[styles.deleteIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={32} color="#DC2626" />
            </View>

            {/* Title */}
            <ThemedText style={styles.deleteModalTitle}>Delete Assessment?</ThemedText>

            {/* Description */}
            <ThemedText style={styles.deleteModalDescription}>
              Are you sure you want to delete this assessment?
            </ThemedText>

            {/* Assessment Info */}
            <View style={[styles.deleteModalInfo, { backgroundColor: Colors[scheme].background }]}>
              <ThemedText style={styles.deleteModalInfoText}>
                {item.category} — {item.element}
              </ThemedText>
              <ThemedText style={styles.deleteModalInfoDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </ThemedText>
            </View>

            {/* Warning */}
            <View style={styles.deleteModalWarning}>
              <Ionicons name="warning-outline" size={16} color="#F59E0B" />
              <ThemedText style={styles.deleteModalWarningText}>
                This action cannot be undone
              </ThemedText>
            </View>

            {/* Buttons */}
            <View style={styles.deleteModalButtons}>
              <Pressable
                style={[styles.deleteModalButton, styles.deleteModalCancelButton, { backgroundColor: Colors[scheme].background }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <ThemedText style={styles.deleteModalCancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.deleteModalButton, styles.deleteModalDeleteButton]}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <ThemedText style={styles.deleteModalDeleteText}>Delete</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  scoreGrade: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
    includeFontPadding: false,
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
    flex: 1,
  },
  editButton: {
    padding: 4,
    marginLeft: 'auto',
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
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
    letterSpacing: 0,
  },
  badgeSubtext: {
    fontSize: 13,
    opacity: 0.6,
    fontWeight: '500',
  },

  // Notes styles
  notesText: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
  },
  notesInput: {
    fontSize: 15,
    lineHeight: 24,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 100,
    marginBottom: 12,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },

  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  deleteIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalDescription: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  deleteModalInfo: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  deleteModalInfoText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  deleteModalInfoDate: {
    fontSize: 13,
    opacity: 0.6,
  },
  deleteModalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    marginBottom: 24,
  },
  deleteModalWarningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deleteModalCancelButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalDeleteButton: {
    backgroundColor: '#DC2626',
  },
  deleteModalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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

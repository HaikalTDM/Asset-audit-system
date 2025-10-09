import React from 'react';
import { Image, Pressable, StyleSheet, View, FlatList, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FirestoreService, type Assessment } from '@/lib/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

/**
 * History Tab Page
 * Shows the list of user's assessments with proper tab navigation context
 */
export default function HistoryTab() {
  const scheme = useColorScheme() ?? 'light';
  const [rows, setRows] = React.useState<Assessment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const { user } = useAuth();

  const load = React.useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const assessments = await FirestoreService.listAssessments(user.uid);
      setRows(assessments);
    } catch (err) {
      console.error('Error loading assessments:', err);
      setError('Failed to load assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleDeleteAssessment = React.useCallback(async (assessment: Assessment) => {
    if (!assessment.id) return;

    Alert.alert(
      'Delete Assessment',
      `Are you sure you want to delete this assessment?\n\n${assessment.category} — ${assessment.element}\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(assessment.id);
              await FirestoreService.deleteAssessment(assessment.id);

              // Remove from local state immediately for better UX
              setRows(prevRows => prevRows.filter(row => row.id !== assessment.id));

              // Optionally reload to ensure consistency
              await load();
            } catch (error) {
              console.error('Error deleting assessment:', error);
              Alert.alert('Error', 'Failed to delete assessment. Please try again.');
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  }, [load]);

  // Use useFocusEffect to reload data when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      {loading ? (
        <View style={styles.centerContent}>
          <ThemedText>Loading assessments...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Button title="Retry" onPress={load} variant="secondary" />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.centerContent}>
          <ThemedText style={styles.emptyText}>No history yet.</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Start capturing assessments to see them here.
          </ThemedText>
          <Button
            title="Start First Assessment"
            onPress={() => router.push('/(app)/(tabs)/capture')}
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => String(it.id)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: Colors[scheme].card }]}>
              <Pressable
                style={styles.itemPressable}
                onPress={() => router.push({ pathname: '/(app)/history/[id]', params: { id: item.id } })}
              >
                <Image source={{ uri: item.photo_uri }} style={styles.thumb} />
                <View style={styles.itemContent}>
                  <ThemedText style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">
                    {item.category} — {item.element}
                  </ThemedText>
                  <ThemedText style={styles.itemDate}>
                    {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                </View>
              </Pressable>

              <View style={styles.actionButtons}>
                <Button
                  title="Open"
                  onPress={() => router.push({ pathname: '/(app)/history/[id]', params: { id: item.id } })}
                  variant="secondary"
                  size="sm"
                  style={styles.openButton}
                />
                <Pressable
                  style={[styles.deleteButton, { opacity: deletingId === item.id ? 0.5 : 1 }]}
                  onPress={() => handleDeleteAssessment(item)}
                  disabled={deletingId === item.id}
                  accessibilityLabel="Delete assessment"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#DC2626"
                  />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    opacity: 0.7,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  separator: {
    height: 12
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDate: {
    opacity: 0.7,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openButton: {
    minWidth: 60,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
});

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FirestoreService, type Assessment, type UserProfile } from '@/lib/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View, FlatList, Image, Pressable, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { useAuth } from '@/lib/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { generateBatchAssessmentPDF, sharePDF } from '@/lib/pdf/pdfGenerator';

export default function AllAssessments() {
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = React.useState<Assessment[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState<string>('all');
  const [generatingPDF, setGeneratingPDF] = React.useState(false);
  const [showUserPicker, setShowUserPicker] = React.useState(false);
  const scheme = useColorScheme() ?? 'light';
  const { user, userProfile } = useAuth();

  const load = React.useCallback(async () => {
    if (!user || userProfile?.role !== 'admin') return;

    try {
      setLoading(true);
      setError(null);
      
      // Load all assessments and users
      const [allAssessments, allUsers] = await Promise.all([
        FirestoreService.listAllAssessments(),
        FirestoreService.listAllUsers()
      ]);
      
      setAssessments(allAssessments);
      setUsers(allUsers);
      setFilteredAssessments(allAssessments);
    } catch (err) {
      console.error('Error loading assessments:', err);
      setError('Failed to load assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, userProfile]);

  // Filter assessments based on search and user selection
  React.useEffect(() => {
    let filtered = assessments;

    // Filter by user
    if (selectedUser !== 'all') {
      filtered = filtered.filter(assessment => assessment.userId === selectedUser);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(assessment =>
        assessment.category.toLowerCase().includes(query) ||
        assessment.element.toLowerCase().includes(query) ||
        assessment.notes.toLowerCase().includes(query)
      );
    }

    setFilteredAssessments(filtered);
  }, [assessments, searchQuery, selectedUser]);

  useFocusEffect(React.useCallback(() => {
    load();
  }, [load]));

  const handleExportFiltered = React.useCallback(async () => {
    if (filteredAssessments.length === 0) {
      Alert.alert('No Data', 'No assessments to export.');
      return;
    }

    const assessmentIds = filteredAssessments.map(a => a.id).filter((id): id is string => id !== undefined);
    if (assessmentIds.length === 0) {
      Alert.alert('Error', 'No valid assessments found.');
      return;
    }

    setGeneratingPDF(true);
    try {
      const pdfUri = await generateBatchAssessmentPDF(assessmentIds, {
        includePhotos: false,
      });
      
      const userFilter = selectedUser !== 'all' ? `-${getUserDisplayName(selectedUser)}` : '';
      await sharePDF(pdfUri, `assessments${userFilter}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating batch PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  }, [filteredAssessments, selectedUser]);

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.displayName || 'Unknown User';
  };

  const getSelectedUserName = () => {
    if (selectedUser === 'all') return 'All Users';
    return getUserDisplayName(selectedUser);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    setShowUserPicker(false);
  };

  const renderAssessmentItem = ({ item }: { item: Assessment }) => (
    <Pressable 
      style={[styles.assessmentItem, { borderBottomColor: Colors[scheme].text + '10' }]} 
      onPress={() => router.push({ pathname: '/(app)/history/[id]', params: { id: item.id } })}
    >
      <Image source={{ uri: item.photo_uri }} style={styles.thumbnail} />
      <View style={styles.assessmentInfo}>
        <ThemedText style={styles.assessmentTitle}>
          {item.category} — {item.element}
        </ThemedText>
        <ThemedText style={styles.assessmentUser}>
          By: {getUserDisplayName(item.userId)}
        </ThemedText>
        <ThemedText style={styles.assessmentDate}>
          {new Date(item.created_at).toLocaleString()}
        </ThemedText>
        <View style={styles.conditionRow}>
          <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(item.condition) }]}>
            <ThemedText style={styles.conditionText}>Condition: {item.condition}</ThemedText>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <ThemedText style={styles.priorityText}>Priority: {item.priority}</ThemedText>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
    </Pressable>
  );

  const getConditionColor = (condition: number) => {
    // Condition: 1-2=Good (green), 3=Fair (yellow), 4-5=Bad (red)
    if (condition <= 2) return '#44aa44'; // Green for Good/Excellent
    if (condition <= 3) return '#ffaa00'; // Yellow for Fair
    return '#ff4444'; // Red for Poor/Critical
  };

  const getPriorityColor = (priority: number) => {
    // Priority: 1-2=Low (green), 3=Medium (yellow), 4-5=High (red)
    if (priority <= 2) return '#44aa44'; // Green for Low priority
    if (priority <= 3) return '#ffaa00'; // Yellow for Medium priority
    return '#ff4444'; // Red for High priority
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: Colors[scheme].background }]}>
        <ThemedText>Loading assessments...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: Colors[scheme].background }]}>
        <ThemedText style={{ color: 'red', marginBottom: 8 }}>{error}</ThemedText>
        <Button title="Retry" onPress={load} variant="secondary" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      {/* Search and Filter Header */}
      <View style={styles.header}>
        <View style={[styles.searchContainer, { backgroundColor: Colors[scheme].text + '10' }]}>
          <Ionicons name="search" size={20} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
          <TextInput
            style={[styles.searchInput, { color: Colors[scheme].text }]}
            placeholder="Search assessments..."
            placeholderTextColor={Colors[scheme].text + '60'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterContainer}>
          <ThemedText style={styles.filterLabel}>Filter by user:</ThemedText>
          <Pressable
            style={[styles.dropdownButton, { backgroundColor: Colors[scheme].card, borderColor: Colors[scheme].text + '30' }]}
            onPress={() => setShowUserPicker(true)}
          >
            <Ionicons name="person-outline" size={18} color={Colors[scheme].text} style={{ opacity: 0.7 }} />
            <ThemedText style={styles.dropdownText}>{getSelectedUserName()}</ThemedText>
            <Ionicons name="chevron-down" size={18} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
          </Pressable>
        </View>
      </View>

      {/* User Picker Modal */}
      <Modal
        visible={showUserPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowUserPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: Colors[scheme].card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select User</ThemedText>
              <Pressable onPress={() => setShowUserPicker(false)}>
                <Ionicons name="close" size={24} color={Colors[scheme].text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.userList}>
              <Pressable
                style={[
                  styles.userOption,
                  selectedUser === 'all' && { backgroundColor: Colors[scheme].tint + '15' }
                ]}
                onPress={() => handleUserSelect('all')}
              >
                <Ionicons 
                  name="people-outline" 
                  size={20} 
                  color={selectedUser === 'all' ? Colors[scheme].tint : Colors[scheme].text} 
                />
                <ThemedText 
                  style={[
                    styles.userOptionText,
                    selectedUser === 'all' && { color: Colors[scheme].tint, fontWeight: '600' }
                  ]}
                >
                  All Users
                </ThemedText>
                {selectedUser === 'all' && (
                  <Ionicons name="checkmark" size={20} color={Colors[scheme].tint} />
                )}
              </Pressable>

              {users.map(user => (
                <Pressable
                  key={user.id}
                  style={[
                    styles.userOption,
                    selectedUser === user.id && { backgroundColor: Colors[scheme].tint + '15' }
                  ]}
                  onPress={() => handleUserSelect(user.id)}
                >
                  <Ionicons 
                    name="person-outline" 
                    size={20} 
                    color={selectedUser === user.id ? Colors[scheme].tint : Colors[scheme].text} 
                  />
                  <ThemedText 
                    style={[
                      styles.userOptionText,
                      selectedUser === user.id && { color: Colors[scheme].tint, fontWeight: '600' }
                    ]}
                  >
                    {user.displayName}
                  </ThemedText>
                  {selectedUser === user.id && (
                    <Ionicons name="checkmark" size={20} color={Colors[scheme].tint} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Results Summary */}
      <View style={styles.summaryContainer}>
        <ThemedText style={styles.summaryText}>
          Showing {filteredAssessments.length} of {assessments.length} assessments
        </ThemedText>
        {filteredAssessments.length > 0 && (
          <Button
            title={generatingPDF ? "Generating..." : "Export as PDF"}
            onPress={handleExportFiltered}
            variant="secondary"
            size="sm"
            disabled={generatingPDF}
            style={styles.exportButton}
          />
        )}
      </View>

      {/* Assessments List */}
      {filteredAssessments.length === 0 ? (
        <View style={styles.centered}>
          <ThemedText style={{ opacity: 0.7 }}>No assessments found.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredAssessments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAssessmentItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  userList: {
    maxHeight: 400,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userOptionText: {
    flex: 1,
    fontSize: 16,
  },
  summaryContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    opacity: 0.7,
  },
  exportButton: {
    minWidth: 120,
  },
  assessmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  assessmentUser: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  assessmentDate: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 6,
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  conditionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 0,
    minWidth: 85,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 0,
    minWidth: 75,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
});

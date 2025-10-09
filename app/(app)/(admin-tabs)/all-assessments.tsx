import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FirestoreService, type Assessment, type UserProfile } from '@/lib/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View, FlatList, Image, Pressable, TextInput } from 'react-native';
import { useAuth } from '@/lib/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function AllAssessments() {
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = React.useState<Assessment[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState<string>('all');
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

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.displayName || 'Unknown User';
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
    if (condition <= 2) return '#ff4444';
    if (condition <= 3) return '#ffaa00';
    return '#44aa44';
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return '#44aa44';
    if (priority <= 3) return '#ffaa00';
    return '#ff4444';
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
          <View style={styles.userFilterButtons}>
            <Button
              title="All Users"
              onPress={() => setSelectedUser('all')}
              variant={selectedUser === 'all' ? 'primary' : 'secondary'}
              style={styles.filterButton}
            />
            {users.slice(0, 3).map(user => (
              <Button
                key={user.id}
                title={user.displayName}
                onPress={() => setSelectedUser(user.id)}
                variant={selectedUser === user.id ? 'primary' : 'secondary'}
                style={styles.filterButton}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Results Summary */}
      <View style={styles.summaryContainer}>
        <ThemedText style={styles.summaryText}>
          Showing {filteredAssessments.length} of {assessments.length} assessments
        </ThemedText>
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
  userFilterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryContainer: {
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    opacity: 0.7,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
});

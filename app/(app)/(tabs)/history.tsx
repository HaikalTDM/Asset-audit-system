import React from 'react';
import { Image, Pressable, StyleSheet, View, FlatList, Alert, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FirestoreService, type Assessment } from '@/lib/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { generateBatchAssessmentPDF, sharePDF } from '@/lib/pdf/pdfGenerator';
import { Card } from '@/components/ui/Card';

const CATEGORIES = ['Civil', 'Electrical', 'Mechanical'];

/**
 * History Tab Page
 * Shows the list of user's assessments with proper tab navigation context
 */
export default function HistoryTab() {
  const scheme = useColorScheme() ?? 'light';
  const [rows, setRows] = React.useState<Assessment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = React.useState(false);
  const { user } = useAuth();

  // Filter states
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [showCategoryPicker, setShowCategoryPicker] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [datePreset, setDatePreset] = React.useState<string>('all');

  const load = React.useCallback(async () => {
    if (!user) return;

    try {
      console.log('📜 History page: Loading assessments for user:', user.id);
      setLoading(true);
      setError(null);
      const assessments = await FirestoreService.listAssessments(user.id);
      console.log('📜 History page: Loaded', assessments.length, 'assessments');
      setRows(assessments);
    } catch (err) {
      console.error('❌ History page: Error loading assessments:', err);
      setError('Failed to load assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Use useFocusEffect to reload data when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('📜 History page focused, reloading...');
      load();
    }, [load])
  );

  // Date preset handlers
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'today':
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        setStartDate(todayStart);
        setEndDate(todayEnd);
        break;
      
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = new Date(yesterday);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        setStartDate(yesterdayStart);
        setEndDate(yesterdayEnd);
        break;
      
      case 'last7days':
        const last7Start = new Date(now);
        last7Start.setDate(last7Start.getDate() - 6);
        last7Start.setHours(0, 0, 0, 0);
        const last7End = new Date(now);
        last7End.setHours(23, 59, 59, 999);
        setStartDate(last7Start);
        setEndDate(last7End);
        break;
      
      case 'last30days':
        const last30Start = new Date(now);
        last30Start.setDate(last30Start.getDate() - 29);
        last30Start.setHours(0, 0, 0, 0);
        const last30End = new Date(now);
        last30End.setHours(23, 59, 59, 999);
        setStartDate(last30Start);
        setEndDate(last30End);
        break;
      
      case 'thisMonth':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(now);
        monthEnd.setHours(23, 59, 59, 999);
        setStartDate(monthStart);
        setEndDate(monthEnd);
        break;
      
      case 'all':
      default:
        setStartDate(null);
        setEndDate(null);
        break;
    }
  };

  const formatDateShort = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter logic
  const filteredRows = React.useMemo(() => {
    let filtered = [...rows];

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(r => r.created_at >= startDate.getTime());
    }

    if (endDate) {
      filtered = filtered.filter(r => r.created_at <= endDate.getTime());
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    return filtered;
  }, [rows, startDate, endDate, selectedCategory]);

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedCategory('all');
    setDatePreset('all');
  };

  const hasActiveFilters = startDate !== null || endDate !== null || selectedCategory !== 'all';

  const handleExportFiltered = React.useCallback(async () => {
    if (filteredRows.length === 0) {
      Alert.alert('No Data', 'No assessments to export with current filters.');
      return;
    }

    const assessmentIds = filteredRows.map(r => r.id).filter((id): id is string => id !== undefined);
    if (assessmentIds.length === 0) {
      Alert.alert('Error', 'No valid assessments found.');
      return;
    }

    setGeneratingPDF(true);
    try {
      const pdfUri = await generateBatchAssessmentPDF(assessmentIds, {
        includePhotos: false, // Don't include photos in batch to keep file size reasonable
      });
      
      await sharePDF(pdfUri, `assessments-${hasActiveFilters ? 'filtered-' : ''}${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating batch PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  }, [filteredRows, hasActiveFilters]);

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
        <>
          {/* Filters Section */}
          <Card variant="elevated" style={styles.filterCard}>
            <TouchableOpacity
              style={styles.filterHeader}
              onPress={() => setShowFilters(!showFilters)}
              activeOpacity={0.7}
            >
              <View style={styles.filterTitleContainer}>
                <Ionicons name="filter" size={20} color={Colors[scheme].tint} />
                <ThemedText style={styles.filterTitle}>Filters</ThemedText>
                {hasActiveFilters && (
                  <View style={[styles.filterBadge, { backgroundColor: Colors[scheme].tint }]}>
                    <ThemedText style={styles.filterBadgeText}>Active</ThemedText>
                  </View>
                )}
              </View>
              <Ionicons
                name={showFilters ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors[scheme].text}
                style={{ opacity: 0.5 }}
              />
            </TouchableOpacity>

            {showFilters && (
              <View style={styles.filterContent}>
                {/* Date Range Presets */}
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterLabel}>Date Range</ThemedText>
                  <View style={styles.datePresetsContainer}>
                    {[
                      { id: 'all', label: 'All Time', icon: 'infinite' },
                      { id: 'today', label: 'Today', icon: 'today' },
                      { id: 'yesterday', label: 'Yesterday', icon: 'calendar' },
                      { id: 'last7days', label: 'Last 7 Days', icon: 'calendar-outline' },
                      { id: 'last30days', label: 'Last 30 Days', icon: 'calendar-outline' },
                      { id: 'thisMonth', label: 'This Month', icon: 'calendar' },
                    ].map((preset) => (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.datePresetButton,
                          {
                            backgroundColor: datePreset === preset.id ? Colors[scheme].tint : Colors[scheme].card,
                            borderColor: datePreset === preset.id ? Colors[scheme].tint : Colors[scheme].border,
                          }
                        ]}
                        onPress={() => applyDatePreset(preset.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={preset.icon as any}
                          size={16}
                          color={datePreset === preset.id ? '#fff' : Colors[scheme].text}
                          style={{ opacity: datePreset === preset.id ? 1 : 0.7 }}
                        />
                        <ThemedText
                          style={[
                            styles.datePresetButtonText,
                            { color: datePreset === preset.id ? '#fff' : Colors[scheme].text }
                          ]}
                        >
                          {preset.label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Show selected date range */}
                  {(startDate || endDate) && (
                    <View style={[styles.selectedDateRange, { backgroundColor: Colors[scheme].tint + '15' }]}>
                      <Ionicons name="calendar" size={16} color={Colors[scheme].tint} />
                      <ThemedText style={[styles.selectedDateRangeText, { color: Colors[scheme].tint }]}>
                        {formatDateShort(startDate)} - {formatDateShort(endDate)}
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Category Filter */}
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterLabel}>Category</ThemedText>
                  <TouchableOpacity
                    style={[styles.categoryButton, { 
                      backgroundColor: Colors[scheme].card,
                      borderColor: Colors[scheme].border
                    }]}
                    onPress={() => setShowCategoryPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="apps-outline" size={18} color={Colors[scheme].text} style={{ opacity: 0.7 }} />
                    <ThemedText style={styles.categoryButtonText}>
                      {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={18} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
                  </TouchableOpacity>
                </View>

                {/* Filter Actions */}
                {hasActiveFilters && (
                  <Button
                    title="Clear Filters"
                    onPress={clearFilters}
                    variant="secondary"
                    size="sm"
                    style={styles.clearButton}
                  />
                )}
              </View>
            )}
          </Card>

          {/* Results */}
          {filteredRows.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="search-outline" size={64} color={Colors[scheme].text} style={{ opacity: 0.3, marginBottom: 16 }} />
              <ThemedText style={styles.emptyText}>No assessments found</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Try adjusting your filters
              </ThemedText>
              <Button
                title="Clear Filters"
                onPress={clearFilters}
                variant="secondary"
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <FlatList
              data={filteredRows}
              keyExtractor={(it) => String(it.id)}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <ThemedText style={styles.headerText}>
                    {filteredRows.length} of {rows.length} Assessment{filteredRows.length !== 1 ? 's' : ''}
                  </ThemedText>
                  <Button
                    title={generatingPDF ? "Generating..." : "Export as PDF"}
                    onPress={handleExportFiltered}
                    variant="secondary"
                    size="sm"
                    disabled={generatingPDF}
                    style={styles.exportButton}
                  />
                </View>
              }
              renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.assessmentCard,
                { backgroundColor: Colors[scheme].card },
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
              ]}
              onPress={() => router.push({ pathname: '/(app)/history/[id]', params: { id: item.id } })}
            >
              {/* Card Content */}
              <Image source={{ uri: item.photo_uri }} style={styles.thumbnail} />
              <View style={styles.cardContent}>
                <ThemedText style={styles.cardTitle} numberOfLines={1}>
                  {item.category} — {item.element}
                </ThemedText>
                <View style={styles.cardMeta}>
                  <Ionicons name="calendar-outline" size={14} color={Colors[scheme].text} style={{ opacity: 0.6 }} />
                  <ThemedText style={styles.cardDate}>
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </ThemedText>
                  <View style={styles.dotSeparator} />
                  <Ionicons name="time-outline" size={14} color={Colors[scheme].text} style={{ opacity: 0.6 }} />
                  <ThemedText style={styles.cardDate}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                </View>
              </View>
              
              {/* Chevron Indicator */}
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={Colors[scheme].text} 
                style={{ opacity: 0.3, marginLeft: 'auto' }} 
              />
            </Pressable>
          )}
        />
          )}

          {/* Category Picker Modal */}
          <Modal
            visible={showCategoryPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowCategoryPicker(false)}
          >
            <Pressable 
              style={styles.modalOverlay} 
              onPress={() => setShowCategoryPicker(false)}
            >
              <View style={[styles.modalContent, { backgroundColor: Colors[scheme].card }]}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Select Category</ThemedText>
                  <Pressable onPress={() => setShowCategoryPicker(false)}>
                    <Ionicons name="close" size={24} color={Colors[scheme].text} />
                  </Pressable>
                </View>
                
                <ScrollView style={styles.categoryList}>
                  {/* All Categories Option */}
                  <Pressable
                    style={[
                      styles.categoryOption,
                      selectedCategory === 'all' && { backgroundColor: Colors[scheme].tint + '15' }
                    ]}
                    onPress={() => {
                      setSelectedCategory('all');
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Ionicons 
                      name="apps" 
                      size={20} 
                      color={selectedCategory === 'all' ? Colors[scheme].tint : Colors[scheme].text} 
                    />
                    <ThemedText 
                      style={[
                        styles.categoryOptionText,
                        selectedCategory === 'all' && { color: Colors[scheme].tint, fontWeight: '600' }
                      ]}
                    >
                      All Categories
                    </ThemedText>
                    {selectedCategory === 'all' && (
                      <Ionicons name="checkmark" size={20} color={Colors[scheme].tint} />
                    )}
                  </Pressable>

                  {/* Individual Categories */}
                  {CATEGORIES.map(category => (
                    <Pressable
                      key={category}
                      style={[
                        styles.categoryOption,
                        selectedCategory === category && { backgroundColor: Colors[scheme].tint + '15' }
                      ]}
                      onPress={() => {
                        setSelectedCategory(category);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Ionicons 
                        name={
                          category === 'Civil' ? 'construct' : 
                          category === 'Electrical' ? 'flash' : 
                          'cog'
                        }
                        size={20} 
                        color={selectedCategory === category ? Colors[scheme].tint : Colors[scheme].text} 
                      />
                      <ThemedText 
                        style={[
                          styles.categoryOptionText,
                          selectedCategory === category && { color: Colors[scheme].tint, fontWeight: '600' }
                        ]}
                      >
                        {category}
                      </ThemedText>
                      {selectedCategory === category && (
                        <Ionicons name="checkmark" size={20} color={Colors[scheme].tint} />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
        </>
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

  // Filter styles
  filterCard: {
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  filterContent: {
    marginTop: 16,
    gap: 16,
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  datePresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  datePresetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  datePresetButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectedDateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  selectedDateRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  categoryButtonText: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    marginTop: 8,
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
    maxWidth: 400,
    maxHeight: '60%',
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
  categoryList: {
    maxHeight: 300,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 16,
  },

  // List styles
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exportButton: {
    minWidth: 140,
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
  
  // Assessment Card (New Clean Design)
  assessmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    gap: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  cardContent: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDate: {
    fontSize: 13,
    opacity: 0.65,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9ca3af',
    opacity: 0.5,
    marginHorizontal: 2,
  },
});


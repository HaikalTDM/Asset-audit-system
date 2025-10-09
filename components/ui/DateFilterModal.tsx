import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface DateFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: { month?: number; year?: number } | null) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DateFilterModal({ visible, onClose, onApply }: DateFilterModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [filterType, setFilterType] = useState<'all' | 'month'>('month');

  // Reset scroll position when modal opens
  useEffect(() => {
    if (visible && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    }
  }, [visible]);

  // Generate years (current year and past 5 years)
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const handleApply = () => {
    if (filterType === 'all') {
      onApply(null); // Export all data
    } else if (selectedMonth && selectedYear) {
      onApply({ month: selectedMonth, year: selectedYear });
    }
    onClose();
  };

  const handleReset = () => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setFilterType('month');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: Colors[scheme].card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: Colors[scheme].border }]}>
            <View>
              <ThemedText style={styles.title}>Export Filter</ThemedText>
              <ThemedText style={styles.subtitle}>Select the period to export</ThemedText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: Colors[scheme].background }]}
            >
              <Ionicons name="close" size={24} color={Colors[scheme].text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Filter Type Selection */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Export Type</ThemedText>
              <View style={styles.filterTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.filterTypeButton,
                    { 
                      backgroundColor: filterType === 'all' 
                        ? Colors[scheme].tint 
                        : Colors[scheme].background,
                      borderColor: Colors[scheme].border,
                    }
                  ]}
                  onPress={() => setFilterType('all')}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={filterType === 'all' ? '#fff' : Colors[scheme].text} 
                  />
                  <ThemedText style={[
                    styles.filterTypeText,
                    filterType === 'all' && styles.filterTypeTextActive
                  ]}>
                    All Time
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterTypeButton,
                    { 
                      backgroundColor: filterType === 'month' 
                        ? Colors[scheme].tint 
                        : Colors[scheme].background,
                      borderColor: Colors[scheme].border,
                    }
                  ]}
                  onPress={() => setFilterType('month')}
                >
                  <Ionicons 
                    name="calendar" 
                    size={20} 
                    color={filterType === 'month' ? '#fff' : Colors[scheme].text} 
                  />
                  <ThemedText style={[
                    styles.filterTypeText,
                    filterType === 'month' && styles.filterTypeTextActive
                  ]}>
                    By Month
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Month/Year Selection (only show when filterType is 'month') */}
            {filterType === 'month' && (
              <>
                {/* Year Selection */}
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Select Year</ThemedText>
                  <View style={styles.yearGrid}>
                    {years.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearButton,
                          {
                            backgroundColor: selectedYear === year
                              ? Colors[scheme].tint
                              : Colors[scheme].background,
                            borderColor: Colors[scheme].border,
                          }
                        ]}
                        onPress={() => setSelectedYear(year)}
                      >
                        <ThemedText style={[
                          styles.yearText,
                          selectedYear === year && styles.yearTextActive
                        ]}>
                          {year}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Month Selection */}
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Select Month</ThemedText>
                  <View style={styles.monthGrid}>
                    {MONTHS.map((month, index) => {
                      const monthNumber = index + 1;
                      const isSelected = selectedMonth === monthNumber;
                      const isCurrent = monthNumber === currentMonth && selectedYear === currentYear;
                      
                      return (
                        <TouchableOpacity
                          key={month}
                          style={[
                            styles.monthButton,
                            {
                              backgroundColor: isSelected
                                ? Colors[scheme].tint
                                : Colors[scheme].background,
                              borderColor: isCurrent 
                                ? Colors[scheme].tint 
                                : Colors[scheme].border,
                              borderWidth: isCurrent ? 2 : 1,
                            }
                          ]}
                          onPress={() => setSelectedMonth(monthNumber)}
                        >
                          <ThemedText style={[
                            styles.monthText,
                            isSelected && styles.monthTextActive
                          ]}>
                            {month.substring(0, 3)}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedMonth === currentMonth && selectedYear === currentYear && (
                    <View style={styles.currentMonthHint}>
                      <Ionicons name="information-circle" size={16} color={Colors[scheme].tint} />
                      <ThemedText style={styles.hintText}>Current month selected</ThemedText>
                    </View>
                  )}
                </View>

                {/* Summary */}
                <View style={[styles.summaryBox, { 
                  backgroundColor: Colors[scheme].tint + '15',
                  borderColor: Colors[scheme].tint + '30',
                }]}>
                  <Ionicons name="download-outline" size={20} color={Colors[scheme].tint} />
                  <ThemedText style={styles.summaryText}>
                    Export data for {MONTHS[selectedMonth! - 1]} {selectedYear}
                  </ThemedText>
                </View>
              </>
            )}

            {filterType === 'all' && (
              <View style={[styles.summaryBox, { 
                backgroundColor: Colors[scheme].tint + '15',
                borderColor: Colors[scheme].tint + '30',
              }]}>
                <Ionicons name="download-outline" size={20} color={Colors[scheme].tint} />
                <ThemedText style={styles.summaryText}>
                  Export all available data
                </ThemedText>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: Colors[scheme].border }]}>
            <Button
              title="Reset"
              variant="secondary"
              onPress={handleReset}
              style={{ flex: 1 }}
            />
            <View style={{ width: 12 }} />
            <Button
              title="Export"
              onPress={handleApply}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  filterTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  filterTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTypeTextActive: {
    color: '#fff',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  yearTextActive: {
    color: '#fff',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    width: '23%',
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 13,
    fontWeight: '600',
  },
  monthTextActive: {
    color: '#fff',
  },
  currentMonthHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  hintText: {
    fontSize: 12,
    opacity: 0.7,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
  },
});


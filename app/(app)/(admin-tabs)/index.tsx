import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container, Column } from '@/components/ui/Layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FirestoreService, type Assessment, type UserProfile } from '@/lib/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View, ScrollView, Image, Modal, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from '@/lib/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { ResponsiveUtils, Typography, Spacing, DeviceType } from '@/constants/responsive';
// import { DebugInfo } from '@/components/DebugInfo';

export default function AdminDashboard() {
  const [totalAssessments, setTotalAssessments] = React.useState(0);
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [todayAssessments, setTodayAssessments] = React.useState(0);
  const [recentAssessments, setRecentAssessments] = React.useState<Assessment[]>([]);
  const [activeUsers, setActiveUsers] = React.useState(0);
  const [allAssessments, setAllAssessments] = React.useState<Assessment[]>([]);
  const [selectedMatrixCell, setSelectedMatrixCell] = React.useState<{ condition: number; priority: number } | null>(null);
  const [matrixModalVisible, setMatrixModalVisible] = React.useState(false);
  const scheme = useColorScheme() ?? 'light';
  const { user, userProfile, signingOut } = useAuth();

  const load = React.useCallback(async () => {
    // Debug logging (disabled for cleaner output)
    // console.log('Admin Dashboard - Loading data...');
    // console.log('Admin Dashboard - User:', user?.uid);
    // console.log('Admin Dashboard - User Profile:', userProfile);
    // console.log('Admin Dashboard - User Role:', userProfile?.role);

    if (signingOut || !user) {
      // console.log('Admin Dashboard - No user, skipping load');
      return;
    }

    if (signingOut || !userProfile) {
      // console.log('Admin Dashboard - No user profile yet, skipping load');
      return;
    }

    if (signingOut || userProfile.role !== 'admin') {
      // console.log('Admin Dashboard - User is not admin, role:', userProfile.role);
      return;
    }

    try {
      // console.log('Admin Dashboard - Loading all assessments...');
      // Load all assessments
      const assessments = await FirestoreService.listAllAssessments();
      if (signingOut) return;
      // console.log('Admin Dashboard - Loaded assessments:', assessments.length);
      setAllAssessments(assessments); // Store all assessments for matrix
      setTotalAssessments(assessments.length);
      
      // Calculate today's assessments
      const start = new Date(); 
      start.setHours(0, 0, 0, 0);
      const end = new Date(); 
      end.setHours(23, 59, 59, 999);
      const todayCount = assessments.filter((assessment: Assessment) => 
        assessment.created_at >= start.getTime() && assessment.created_at <= end.getTime()
      ).length;
      if (signingOut) return;
      setTodayAssessments(todayCount);
      
      // Get recent assessments
      if (signingOut) return;
      setRecentAssessments(assessments.slice(0, 5));
      
      // Load all users
      const allUsers = await FirestoreService.listAllUsers();
      if (signingOut) return;
      setTotalUsers(allUsers.length);
      setActiveUsers(allUsers.filter(user => user.isActive).length);
    } catch (error) {
      console.error('Error loading admin dashboard data:', error);
    }
  }, [user, userProfile, signingOut]);

  useFocusEffect(React.useCallback(() => {
    load();
  }, [load]));

  // Matrix helper functions
  const getMatrixCount = (condition: number, priority: number) => {
    return allAssessments.filter(
      (assessment) => assessment.condition === condition && assessment.priority === priority
    ).length;
  };

  const getMatrixAssessments = (condition: number, priority: number) => {
    return allAssessments.filter(
      (assessment) => assessment.condition === condition && assessment.priority === priority
    );
  };

  const handleMatrixCellClick = (condition: number, priority: number) => {
    const count = getMatrixCount(condition, priority);
    if (count > 0) {
      setSelectedMatrixCell({ condition, priority });
      setMatrixModalVisible(true);
    }
  };

  const getConditionLabel = (condition: number) => {
    const labels = ['', 'Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
    return labels[condition] || 'Unknown';
  };

  const getPriorityLabel = (priority: number) => {
    const labels = ['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];
    return labels[priority] || 'Unknown';
  };

  /**
   * Calculate risk score based on priority and condition
   * Higher priority number (5=Very High) + Higher condition number (5=Critical) = Higher risk
   * Using formula: priority * condition
   * This gives us scores from 1 (Very Low priority + Excellent condition) to 25 (Very High priority + Critical condition)
   */
  const getRiskScore = (priority: number, condition: number) => {
    return priority * condition;
  };

  const getRiskLabel = (priority: number, condition: number) => {
    const riskScore = getRiskScore(priority, condition);
    if (riskScore <= 6) return 'Low';
    if (riskScore <= 12) return 'Medium';
    if (riskScore <= 18) return 'High';
    return 'Critical';
  };

  const getMatrixCellColor = (priority: number, condition: number, count: number) => {
    if (count === 0) return scheme === 'dark' ? '#1a1a1a' : '#f8f9fa';
    
    const riskScore = getRiskScore(priority, condition);
    
    // Risk score ranges from 1-25
    // 1-6: Green (Low risk)
    // 7-12: Yellow (Medium risk)
    // 13-18: Orange (High risk)
    // 19-25: Red (Critical risk)
    
    if (riskScore <= 6) return scheme === 'dark' ? '#1e5f4d' : '#86efac'; // Green
    if (riskScore <= 12) return scheme === 'dark' ? '#7c6f2d' : '#fde68a'; // Yellow
    if (riskScore <= 18) return scheme === 'dark' ? '#7c4a28' : '#fdba74'; // Orange
    return scheme === 'dark' ? '#7f2020' : '#fca5a5'; // Red
  };

  const getMatrixTextColor = (count: number) => {
    if (count === 0) return Colors[scheme].text + '40'; // 40% opacity
    return Colors[scheme].text;
  };

  return (
    <Container 
      style={{ backgroundColor: Colors[scheme].background }} 
      maxWidth={false}
      padding="sm"
    >
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Column spacing="lg" style={styles.content}>
          {/* Header */}
          <Column spacing="xs" align="center" style={styles.header}>
            <ThemedText style={styles.welcomeText}>Welcome, Admin</ThemedText>
            <ThemedText style={styles.subtitle}>System Overview</ThemedText>
          </Column>

          {/* Metrics Cards - 2x2 Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCardWrapper}>
              <Card
                variant="elevated"
                padding="sm"
                style={[styles.metricCard, { backgroundColor: Colors[scheme].tint + '20' }]}
              >
                <View style={styles.metricContent}>
                  <Ionicons
                    name="document-text-outline"
                    size={ResponsiveUtils.getResponsiveValue({
                      phone: 22, // Even smaller to prevent cramping
                      tablet: 28,
                      desktop: 32,
                      default: 22,
                    })}
                    color={Colors[scheme].tint}
                  />
                  <ThemedText style={styles.metricNumber}>{totalAssessments}</ThemedText>
                  <ThemedText style={styles.metricLabel} numberOfLines={2}>
                    Total{'\n'}Assessments
                  </ThemedText>
                </View>
              </Card>
            </View>

            <View style={styles.metricCardWrapper}>
              <Card
                variant="elevated"
                padding="sm"
                style={[styles.metricCard, { backgroundColor: Colors[scheme].tint + '20' }]}
              >
                <View style={styles.metricContent}>
                  <Ionicons
                    name="today-outline"
                    size={ResponsiveUtils.getResponsiveValue({
                      phone: 22, // Even smaller to prevent cramping
                      tablet: 28,
                      desktop: 32,
                      default: 22,
                    })}
                    color={Colors[scheme].tint}
                  />
                  <ThemedText style={styles.metricNumber}>{todayAssessments}</ThemedText>
                  <ThemedText style={styles.metricLabel} numberOfLines={1}>
                    Today
                  </ThemedText>
                </View>
              </Card>
            </View>

            <View style={styles.metricCardWrapper}>
              <Card
                variant="elevated"
                padding="sm"
                style={[styles.metricCard, { backgroundColor: Colors[scheme].tint + '20' }]}
              >
                <View style={styles.metricContent}>
                  <Ionicons
                    name="people-outline"
                    size={ResponsiveUtils.getResponsiveValue({
                      phone: 22, // Even smaller to prevent cramping
                      tablet: 28,
                      desktop: 32,
                      default: 22,
                    })}
                    color={Colors[scheme].tint}
                  />
                  <ThemedText style={styles.metricNumber}>{totalUsers}</ThemedText>
                  <ThemedText style={styles.metricLabel} numberOfLines={2}>
                    Total{'\n'}Users
                  </ThemedText>
                </View>
              </Card>
            </View>

            <View style={styles.metricCardWrapper}>
              <Card
                variant="elevated"
                padding="sm"
                style={[styles.metricCard, { backgroundColor: Colors[scheme].tint + '20' }]}
              >
                <View style={styles.metricContent}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={ResponsiveUtils.getResponsiveValue({
                      phone: 22, // Even smaller to prevent cramping
                      tablet: 28,
                      desktop: 32,
                      default: 22,
                    })}
                    color={Colors[scheme].tint}
                  />
                  <ThemedText style={styles.metricNumber}>{activeUsers}</ThemedText>
                  <ThemedText style={styles.metricLabel} numberOfLines={2}>
                    Active{'\n'}Users
                  </ThemedText>
                </View>
              </Card>
            </View>
          </View>

          {/* Condition & Priority Matrix */}
          <Card style={styles.matrixCard}>
            <View style={styles.matrixCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconContainer, { backgroundColor: Colors[scheme].tint + '20' }]}>
                  <Ionicons name="grid" size={20} color={Colors[scheme].tint} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <ThemedText style={styles.matrixTitle}>Condition & Priority Matrix</ThemedText>
                  <ThemedText style={styles.matrixSubtext}>
                    Tap any cell to view detailed assessments
                  </ThemedText>
                </View>
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.matrixScrollView}
            >
              <View style={styles.matrixContainer}>
                {/* Header Row - Condition Labels (Critical to Excellent) */}
                <View style={styles.matrixRow}>
                  <View style={[
                    styles.matrixCell, 
                    styles.matrixHeaderCell,
                    { backgroundColor: Colors[scheme].tint + '15', borderColor: Colors[scheme].border }
                  ]}>
                    <ThemedText style={styles.matrixHeaderText}>Priority ↓</ThemedText>
                    <ThemedText style={[styles.matrixHeaderText, { fontSize: 9, marginTop: 2 }]}>Condition →</ThemedText>
                  </View>
                  {[5, 4, 3, 2, 1].map((condition) => (
                    <View 
                      key={`header-${condition}`} 
                      style={[
                        styles.matrixCell, 
                        styles.matrixHeaderCell,
                        { backgroundColor: Colors[scheme].tint + '15', borderColor: Colors[scheme].border }
                      ]}
                    >
                      <ThemedText style={styles.matrixHeaderText}>{getConditionLabel(condition)}</ThemedText>
                      <ThemedText style={[styles.matrixHeaderText, { fontSize: 8, opacity: 0.6, marginTop: 2 }]}>({condition})</ThemedText>
                    </View>
                  ))}
                </View>

                {/* Data Rows - Priority (Very High to Very Low) */}
                {[5, 4, 3, 2, 1].map((priority) => (
                  <View key={`row-${priority}`} style={styles.matrixRow}>
                    {/* Priority Label */}
                    <View style={[
                      styles.matrixCell, 
                      styles.matrixHeaderCell,
                      { backgroundColor: Colors[scheme].tint + '15', borderColor: Colors[scheme].border }
                    ]}>
                      <ThemedText style={styles.matrixHeaderText}>{getPriorityLabel(priority)}</ThemedText>
                      <ThemedText style={[styles.matrixHeaderText, { fontSize: 8, opacity: 0.6, marginTop: 2 }]}>({priority})</ThemedText>
                    </View>
                    
                    {/* Matrix Cells - Conditions from Critical (5) to Excellent (1) */}
                    {[5, 4, 3, 2, 1].map((condition) => {
                      const count = getMatrixCount(condition, priority);
                      const riskLabel = getRiskLabel(priority, condition);
                      return (
                        <TouchableOpacity
                          key={`cell-${condition}-${priority}`}
                          style={[
                            styles.matrixCell,
                            styles.matrixDataCell,
                            { 
                              backgroundColor: getMatrixCellColor(priority, condition, count),
                              borderColor: Colors[scheme].border,
                              opacity: count === 0 ? 0.5 : 1,
                            }
                          ]}
                          onPress={() => handleMatrixCellClick(condition, priority)}
                          disabled={count === 0}
                          activeOpacity={0.7}
                        >
                          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <ThemedText style={[
                              styles.matrixCellText,
                              { 
                                fontWeight: count > 0 ? '700' : '400',
                                color: getMatrixTextColor(count),
                                marginBottom: 4,
                              }
                            ]}>
                              {count}
                            </ThemedText>
                            <ThemedText style={[
                              styles.matrixCellLabel,
                              { color: getMatrixTextColor(count) }
                            ]}>
                              {riskLabel}
                            </ThemedText>
                          </View>
                          {count > 0 && (
                            <Ionicons 
                              name="chevron-forward" 
                              size={10} 
                              color={Colors[scheme].text} 
                              style={{ opacity: 0.4, position: 'absolute', bottom: 4, right: 4 }}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Legend */}
            <View style={[styles.legendContainer, { backgroundColor: Colors[scheme].background, borderTopColor: Colors[scheme].border }]}>
              <View style={styles.legendHeader}>
                <Ionicons name="color-palette-outline" size={14} color={Colors[scheme].text} style={{ opacity: 0.7 }} />
                <ThemedText style={styles.legendTitle}>Risk Level (Priority × Condition)</ThemedText>
              </View>
              <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                  <View style={[
                    styles.legendColor, 
                    { backgroundColor: scheme === 'dark' ? '#1e5f4d' : '#86efac', borderColor: Colors[scheme].border }
                  ]} />
                  <ThemedText style={styles.legendText}>Low (1-6)</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[
                    styles.legendColor, 
                    { backgroundColor: scheme === 'dark' ? '#7c6f2d' : '#fde68a', borderColor: Colors[scheme].border }
                  ]} />
                  <ThemedText style={styles.legendText}>Medium (7-12)</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[
                    styles.legendColor, 
                    { backgroundColor: scheme === 'dark' ? '#7c4a28' : '#fdba74', borderColor: Colors[scheme].border }
                  ]} />
                  <ThemedText style={styles.legendText}>High (13-18)</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[
                    styles.legendColor, 
                    { backgroundColor: scheme === 'dark' ? '#7f2020' : '#fca5a5', borderColor: Colors[scheme].border }
                  ]} />
                  <ThemedText style={styles.legendText}>Critical (19-25)</ThemedText>
                </View>
              </View>
            </View>
          </Card>

      {/* Quick Actions */}
      <Card>
        <ThemedText style={[styles.title, { marginBottom: 12 }]}>Quick Actions</ThemedText>
        <View style={styles.actionButtons}>
          <Button 
            title="View All Assessments" 
            onPress={() => router.push('/(app)/(admin-tabs)/all-assessments')} 
            style={styles.actionButton}
          />
          <Button 
            title="Manage Users" 
            onPress={() => router.push('/(app)/(admin-tabs)/users')} 
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
      </Card>

      {/* Recent Assessments */}
      <Card>
        <ThemedText style={[styles.title, { marginBottom: 12 }]}>Recent Assessments</ThemedText>
        {recentAssessments.length === 0 ? (
          <ThemedText style={{ opacity: 0.7 }}>No assessments yet.</ThemedText>
        ) : (
          recentAssessments.map((assessment) => (
            <View key={assessment.id} style={styles.assessmentItem}>
              <Image source={{ uri: assessment.photo_uri }} style={styles.assessmentThumb} />
              <View style={styles.assessmentInfo}>
                <ThemedText style={styles.assessmentTitle}>
                  {assessment.category} — {assessment.element}
                </ThemedText>
                <ThemedText style={styles.assessmentDate}>
                  {new Date(assessment.created_at).toLocaleString()}
                </ThemedText>
              </View>
              <Button 
                title="View" 
                onPress={() => router.push({ 
                  pathname: '/(app)/history/[id]', 
                  params: { id: assessment.id ?? '' } 
                })} 
                variant="secondary" 
                style={styles.viewButton}
              />
            </View>
          ))
        )}
        {recentAssessments.length > 0 && (
          <Button 
            title="View All Assessments" 
            onPress={() => router.push('/(app)/(admin-tabs)/all-assessments')} 
            variant="secondary" 
            style={{ marginTop: 12 }}
          />
        )}
      </Card>
        </Column>
      </ScrollView>

      {/* Matrix Detail Modal */}
      <Modal
        visible={matrixModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMatrixModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[scheme].card }]}>
            {selectedMatrixCell && (
              <>
                {/* Modal Header */}
                <View style={[styles.modalHeader, { borderBottomColor: Colors[scheme].border }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={[styles.modalBadge, { 
                        backgroundColor: getMatrixCellColor(
                          selectedMatrixCell.priority, 
                          selectedMatrixCell.condition,
                          getMatrixCount(selectedMatrixCell.condition, selectedMatrixCell.priority)
                        )
                      }]}>
                        <ThemedText style={styles.modalBadgeText}>
                          {getMatrixCount(selectedMatrixCell.condition, selectedMatrixCell.priority)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.modalTitle}>
                        {getPriorityLabel(selectedMatrixCell.priority)} × {getConditionLabel(selectedMatrixCell.condition)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.modalSubtitle}>
                      {getMatrixAssessments(selectedMatrixCell.condition, selectedMatrixCell.priority).length} assessment{getMatrixAssessments(selectedMatrixCell.condition, selectedMatrixCell.priority).length !== 1 ? 's' : ''} found
                    </ThemedText>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setMatrixModalVisible(false)} 
                    style={[styles.closeButton, { backgroundColor: Colors[scheme].background }]}
                  >
                    <Ionicons name="close" size={20} color={Colors[scheme].text} />
                  </TouchableOpacity>
                </View>

                {/* Assessment List */}
                <FlatList
                  data={getMatrixAssessments(selectedMatrixCell.condition, selectedMatrixCell.priority)}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalAssessmentItem, { backgroundColor: Colors[scheme].background }]}
                      onPress={() => {
                        setMatrixModalVisible(false);
                        router.push({ pathname: '/(app)/history/[id]', params: { id: item.id } });
                      }}
                      activeOpacity={0.7}
                    >
                      <Image 
                        source={{ uri: item.photo_uri }} 
                        style={[styles.assessmentThumb, { borderColor: Colors[scheme].border }]} 
                      />
                      <View style={styles.assessmentInfo}>
                        <ThemedText style={styles.assessmentTitle}>
                          {item.category} — {item.element}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Ionicons name="time-outline" size={12} color={Colors[scheme].text} style={{ opacity: 0.5, marginRight: 4 }} />
                          <ThemedText style={styles.assessmentDate}>
                            {new Date(item.created_at).toLocaleString()}
                          </ThemedText>
                        </View>
                        {item.notes && (
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
                            <Ionicons name="document-text-outline" size={12} color={Colors[scheme].text} style={{ opacity: 0.5, marginRight: 4, marginTop: 2 }} />
                            <ThemedText style={styles.assessmentNotes} numberOfLines={2}>
                              {item.notes}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={Colors[scheme].tint} />
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  contentContainerStyle={{ padding: 16 }}
                  ListEmptyComponent={() => (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Ionicons name="folder-open-outline" size={48} color={Colors[scheme].text} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <ThemedText style={{ opacity: 0.7 }}>No assessments found</ThemedText>
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  content: {
    paddingBottom: Spacing.xl,
    width: '100%',
  },
  header: {
    marginBottom: Spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginHorizontal: -3, // Tighter negative margin
  },
  metricCardWrapper: {
    width: '50%', // Exactly 50% for 2 columns
    paddingHorizontal: 3, // Less padding for tighter layout
    paddingVertical: 3, // Less vertical spacing
  },
  metricCard: {
    width: '100%',
    minHeight: ResponsiveUtils.getResponsiveValue({
      phone: 115, // Slightly taller for better spacing
      tablet: 150, // Bigger on tablets
      desktop: 180, // Biggest on desktop
      default: 115,
    }),
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: ResponsiveUtils.getResponsiveValue({
      phone: 24, // Smaller on phones to prevent cutoff
      tablet: 32,
      desktop: 36,
      default: 24,
    }),
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0, // Reduce letter spacing
    paddingHorizontal: 16, // Add horizontal padding
  },
  subtitle: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.body),
    opacity: 0.7,
    textAlign: 'center',
  },
  title: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.title),
    fontWeight: '600',
  },
  metricContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: ResponsiveUtils.getResponsiveValue({
      phone: 8, // More space between icon and number
      tablet: 10,
      desktop: 12,
      default: 8,
    }),
    width: '100%',
    paddingVertical: 8, // Extra vertical padding
  },
  metricNumber: {
    fontSize: ResponsiveUtils.getResponsiveValue({
      phone: 24, // Smaller for better spacing
      tablet: 32, // Bigger on tablets
      desktop: 40, // Biggest on desktop
      default: 24,
    }),
    fontWeight: '700',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: ResponsiveUtils.getResponsiveValue({
      phone: 10, // Even smaller on phones
      tablet: 13, // Bigger on tablets
      desktop: 14, // Biggest on desktop
      default: 10,
    }),
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: ResponsiveUtils.getResponsiveValue({
      phone: 13, // Tighter line height
      tablet: 16,
      desktop: 18,
      default: 13,
    }),
    paddingHorizontal: 2, // Less padding
  },
  actionButtons: {
    gap: Spacing.sm,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
  assessmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000010',
  },
  assessmentThumb: {
    width: ResponsiveUtils.getResponsiveValue({
      phone: 48,
      tablet: 56,
      desktop: 64,
      default: 48,
    }),
    height: ResponsiveUtils.getResponsiveValue({
      phone: 48,
      tablet: 56,
      desktop: 64,
      default: 48,
    }),
    borderRadius: ResponsiveUtils.getBorderRadius('sm'),
    marginRight: Spacing.md,
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentTitle: {
    fontSize: ResponsiveUtils.fontSize(Typography.base),
    fontWeight: '600',
    marginBottom: 2,
  },
  assessmentDate: {
    fontSize: ResponsiveUtils.fontSize(Typography.xs),
    opacity: 0.7,
  },
  viewButton: {
    paddingHorizontal: Spacing.md,
  },
  // Matrix Card styles
  matrixCard: {
    padding: 16,
  },
  matrixCardHeader: {
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matrixTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  matrixSubtext: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  matrixScrollView: {
    marginHorizontal: -8,
  },
  // Matrix Grid styles
  matrixContainer: {
    paddingHorizontal: 8,
  },
  matrixRow: {
    flexDirection: 'row',
  },
  matrixCell: {
    width: 90,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    padding: 6,
  },
  matrixHeaderCell: {
    minWidth: 90,
  },
  matrixDataCell: {
    borderRadius: 8,
    ...ResponsiveUtils.getShadow('sm'),
  },
  matrixHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
  },
  matrixCellText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 2,
  },
  matrixCellLabel: {
    fontSize: 8,
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.7,
  },
  // Legend styles
  legendContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    paddingTop: 60,
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...ResponsiveUtils.getShadow('lg'),
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  modalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  modalBadgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAssessmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    ...ResponsiveUtils.getShadow('sm'),
  },
  assessmentNotes: {
    fontSize: 11,
    opacity: 0.6,
    flex: 1,
  },
});

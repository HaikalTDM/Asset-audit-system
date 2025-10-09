import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FirestoreService, type Assessment } from '@/lib/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View, ScrollView, Image, Dimensions, Platform } from 'react-native';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ResponsiveUtils, Spacing, Typography, DeviceType } from '@/constants/responsive';
// import { DebugInfo } from '@/components/DebugInfo';

export default function Home() {
  const [total, setTotal] = React.useState(0);
  const [today, setToday] = React.useState(0);
  const [recent, setRecent] = React.useState<Assessment[]>([]);
  const scheme = useColorScheme() ?? 'light';
  const { user, userProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const load = React.useCallback(async () => {
    // Debug logging (disabled for cleaner output)
    // console.log('Staff Dashboard - Loading data...');
    // console.log('Staff Dashboard - User:', user?.uid);
    // console.log('Staff Dashboard - User Profile:', userProfile);
    // console.log('Staff Dashboard - User Role:', userProfile?.role);

    if (!user) {
      // console.log('Staff Dashboard - No user, skipping load');
      return;
    }

    // console.log('Staff Dashboard - Loading user assessments...');
    const rows = await FirestoreService.listAssessments(user.uid);
    // console.log('Staff Dashboard - Loaded assessments:', rows.length);
    setTotal(rows.length);
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    setToday(rows.filter((r: Assessment) => r.created_at >= start.getTime() && r.created_at <= end.getTime()).length);
    setRecent(rows.slice(0, 3));
  }, [user]);

  React.useEffect(() => { load(); }, [load]);
  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  return (
    <View style={[styles.wrapper, { backgroundColor: Colors[scheme].background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, Spacing.md),
            paddingBottom: Math.max(insets.bottom, Spacing.xl),
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />

          {/* Enhanced Welcome Section */}
          {userProfile && (
            <Card variant="elevated" style={styles.welcomeCard}>
              <View style={styles.welcomeContent}>
                <View style={styles.welcomeTextContainer}>
                  <ThemedText style={styles.welcomeGreeting}>Welcome back !</ThemedText>
                  <ThemedText style={styles.welcomeName} numberOfLines={2} ellipsizeMode="tail">
                    {user?.displayName || 'User'}
                  </ThemedText>
                  <View style={[styles.roleBadge, {
                    backgroundColor: userProfile.role === 'admin' ? '#ff6b6b' : Colors[scheme].tint
                  }]}>
                    <Ionicons
                      name={userProfile.role === 'admin' ? 'shield-checkmark' : 'person'}
                      size={12}
                      color="#fff"
                      style={styles.roleIcon}
                    />
                    <ThemedText style={styles.roleText}>
                      {userProfile.role.toUpperCase()}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.welcomeIconContainer}>
                  <Ionicons
                    name="person-circle"
                    size={ResponsiveUtils.getResponsiveValue({ phone: 48, tablet: 56, desktop: 64, default: 48 })}
                    color={Colors[scheme].tint}
                  />
                </View>
              </View>
            </Card>
          )}
        </View>

        {/* Enhanced Metrics Section */}
        <View style={styles.metricsSection}>
          <ThemedText style={styles.sectionTitle}>Overview</ThemedText>
          <View style={styles.metricsGrid}>
            <Card variant="elevated" style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View style={[styles.metricIconContainer, { backgroundColor: Colors[scheme].tint + '20' }]}>
                  <Ionicons name="document-text" size={24} color={Colors[scheme].tint} />
                </View>
                <View style={styles.metricTextContainer}>
                  <ThemedText style={styles.metricNumber}>{total}</ThemedText>
                  <ThemedText style={styles.metricLabel}>Total Audits</ThemedText>
                </View>
              </View>
            </Card>

            <Card variant="elevated" style={styles.metricCard}>
              <View style={styles.metricContent}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#22c55e20' }]}>
                  <Ionicons name="today" size={24} color="#22c55e" />
                </View>
                <View style={styles.metricTextContainer}>
                  <ThemedText style={styles.metricNumber}>{today}</ThemedText>
                  <ThemedText style={styles.metricLabel}>Today</ThemedText>
                </View>
              </View>
            </Card>
          </View>
        </View>

        {/* Enhanced Action Section */}
        <View style={styles.actionSection}>
          <Card variant="elevated" style={styles.actionCard}>
            <View style={styles.actionContent}>
              <View style={styles.actionHeader}>
                <View style={[styles.actionIconContainer, { backgroundColor: Colors[scheme].tint + '20' }]}>
                  <Ionicons name="camera" size={28} color={Colors[scheme].tint} />
                </View>
                <View style={styles.actionTextContainer}>
                  <ThemedText style={styles.actionTitle}>Start New Audit</ThemedText>
                  <ThemedText style={styles.actionDescription}>
                    Capture and assess a new asset with our guided process
                  </ThemedText>
                </View>
              </View>
              <Button
                title="Begin Audit"
                onPress={() => router.push('/(app)/(tabs)/capture')}
                style={styles.actionButton}
                size="lg"
              />
            </View>
          </Card>
        </View>

        {/* Enhanced Recent Activity Section */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
            {recent.length > 0 && (
              <Button
                title="View All"
                onPress={() => router.push('/(app)/history')}
                variant="secondary"
                size="sm"
              />
            )}
          </View>

          <Card variant="elevated" style={styles.recentCard}>
            {recent.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, { backgroundColor: Colors[scheme].tint + '10' }]}>
                  <Ionicons name="document-text-outline" size={48} color={Colors[scheme].tint} />
                </View>
                <ThemedText style={styles.emptyTitle}>No audits yet</ThemedText>
                <ThemedText style={styles.emptyDescription}>
                  Start your first audit to see your activity here
                </ThemedText>
                <Button
                  title="Create First Audit"
                  onPress={() => router.push('/(app)/(tabs)/capture')}
                  style={styles.emptyButton}
                  size="sm"
                />
              </View>
            ) : (
              <View style={styles.recentList}>
                {recent.map((it, index) => (
                  <View key={it.id} style={[
                    styles.recentItem,
                    index < recent.length - 1 && styles.recentItemBorder
                  ]}>
                    <Image
                      source={{ uri: it.photo_uri }}
                      style={styles.recentImage}
                      defaultSource={require('@/assets/images/logo.png')}
                    />
                    <View style={styles.recentContent}>
                      <ThemedText style={styles.recentTitle} numberOfLines={1} ellipsizeMode="tail">
                        {it.category} - {it.element}
                      </ThemedText>
                      <ThemedText style={styles.recentDate}>
                        {new Date(it.created_at).toLocaleDateString()} at {new Date(it.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </ThemedText>
                    </View>
                    <Button
                      title="Open"
                      onPress={() => router.push({ pathname: '/(app)/history/[id]', params: { id: it.id ?? '' } })}
                      variant="secondary"
                      size="sm"
                    />
                  </View>
                ))}

                {recent.length > 0 && (
                  <View style={styles.viewAllContainer}>
                    <Button
                      title="View All History"
                      onPress={() => router.push('/(app)/history')}
                      variant="secondary"
                      fullWidth
                    />
                  </View>
                )}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  // Layout containers
  wrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: ResponsiveUtils.getResponsiveValue({
      phone: Spacing.md,
      tablet: Spacing.lg,
      desktop: Spacing.xl,
      default: Spacing.md,
    }),
  },

  // Header section
  header: {
    marginBottom: ResponsiveUtils.getResponsiveValue({
      phone: Spacing.lg,
      tablet: Spacing.xl,
      desktop: Spacing.xxl,
      default: Spacing.lg,
    }),
  },
  logo: {
    width: ResponsiveUtils.getResponsiveValue({
      phone: 160,
      tablet: 200,
      desktop: 240,
      default: 160,
    }),
    height: ResponsiveUtils.getResponsiveValue({
      phone: 36,
      tablet: 45,
      desktop: 54,
      default: 36,
    }),
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },

  // Welcome card styles
  welcomeCard: {
    marginBottom: Spacing.md,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  welcomeGreeting: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.body),
    opacity: 0.8,
    marginBottom: 2,
  },
  welcomeName: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.title),
    fontWeight: '700',
    marginBottom: Spacing.sm,
    lineHeight: ResponsiveUtils.fontSize(Typography.responsive.title) * 1.2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleIcon: {
    marginRight: 4,
  },
  roleText: {
    color: '#fff',
    fontSize: ResponsiveUtils.fontSize(Typography.xs),
    fontWeight: '600',
  },
  welcomeIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section styles
  sectionTitle: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.subtitle),
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: Colors.light.text, // Will be overridden by ThemedText
  },

  // Metrics section
  metricsSection: {
    marginBottom: ResponsiveUtils.getResponsiveValue({
      phone: Spacing.lg,
      tablet: Spacing.xl,
      desktop: Spacing.xxl,
      default: Spacing.lg,
    }),
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metricCard: {
    flex: 1,
    minHeight: ResponsiveUtils.getResponsiveValue({
      phone: 100,
      tablet: 120,
      desktop: 140,
      default: 100,
    }),
  },
  metricContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricIconContainer: {
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
    borderRadius: ResponsiveUtils.getResponsiveValue({
      phone: 24,
      tablet: 28,
      desktop: 32,
      default: 24,
    }),
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metricNumber: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.heading),
    fontWeight: '700',
    lineHeight: ResponsiveUtils.fontSize(Typography.responsive.heading) * 1.1,
  },
  metricLabel: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.caption),
    opacity: 0.8,
    marginTop: 2,
  },

  // Action section
  actionSection: {
    marginBottom: ResponsiveUtils.getResponsiveValue({
      phone: Spacing.lg,
      tablet: Spacing.xl,
      desktop: Spacing.xxl,
      default: Spacing.lg,
    }),
  },
  actionCard: {
    minHeight: ResponsiveUtils.getResponsiveValue({
      phone: 120,
      tablet: 140,
      desktop: 160,
      default: 120,
    }),
  },
  actionContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  actionIconContainer: {
    width: ResponsiveUtils.getResponsiveValue({
      phone: 56,
      tablet: 64,
      desktop: 72,
      default: 56,
    }),
    height: ResponsiveUtils.getResponsiveValue({
      phone: 56,
      tablet: 64,
      desktop: 72,
      default: 56,
    }),
    borderRadius: ResponsiveUtils.getResponsiveValue({
      phone: 28,
      tablet: 32,
      desktop: 36,
      default: 28,
    }),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.title),
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.body),
    opacity: 0.8,
    lineHeight: ResponsiveUtils.fontSize(Typography.responsive.body) * 1.4,
  },
  actionButton: {
    marginTop: Spacing.sm,
  },

  // Recent activity section
  recentSection: {
    marginBottom: ResponsiveUtils.getResponsiveValue({
      phone: Spacing.lg,
      tablet: Spacing.xl,
      desktop: Spacing.xxl,
      default: Spacing.lg,
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  recentCard: {
    minHeight: ResponsiveUtils.getResponsiveValue({
      phone: 120,
      tablet: 140,
      desktop: 160,
      default: 120,
    }),
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ResponsiveUtils.getResponsiveValue({
      phone: Spacing.xl,
      tablet: Spacing.xxl,
      desktop: 48,
      default: Spacing.xl,
    }),
  },
  emptyIconContainer: {
    width: ResponsiveUtils.getResponsiveValue({
      phone: 80,
      tablet: 96,
      desktop: 112,
      default: 80,
    }),
    height: ResponsiveUtils.getResponsiveValue({
      phone: 80,
      tablet: 96,
      desktop: 112,
      default: 80,
    }),
    borderRadius: ResponsiveUtils.getResponsiveValue({
      phone: 40,
      tablet: 48,
      desktop: 56,
      default: 40,
    }),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.title),
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.body),
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: ResponsiveUtils.fontSize(Typography.responsive.body) * 1.4,
  },
  emptyButton: {
    minWidth: ResponsiveUtils.getResponsiveValue({
      phone: 160,
      tablet: 180,
      desktop: 200,
      default: 160,
    }),
  },

  // Recent list
  recentList: {
    gap: 0,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  recentItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border, // Will be overridden by theme
  },
  recentImage: {
    width: ResponsiveUtils.getResponsiveValue({
      phone: 56,
      tablet: 64,
      desktop: 72,
      default: 56,
    }),
    height: ResponsiveUtils.getResponsiveValue({
      phone: 56,
      tablet: 64,
      desktop: 72,
      default: 56,
    }),
    borderRadius: ResponsiveUtils.getBorderRadius('md'),
    marginRight: Spacing.md,
    backgroundColor: Colors.light.border, // Placeholder background
  },
  recentContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  recentTitle: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.body),
    fontWeight: '600',
    marginBottom: 2,
    lineHeight: ResponsiveUtils.fontSize(Typography.responsive.body) * 1.3,
  },
  recentDate: {
    fontSize: ResponsiveUtils.fontSize(Typography.responsive.caption),
    opacity: 0.8,
  },
  viewAllContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.border, // Will be overridden by theme
  },
});

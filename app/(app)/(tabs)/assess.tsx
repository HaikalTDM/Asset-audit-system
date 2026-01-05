import { router, useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform, Pressable, Modal, TouchableOpacity, FlatList, Linking } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StaffOrAdmin } from '@/lib/auth/RoleGuard';
import MapView, { Marker } from 'react-native-maps';

const DAMAGE_CATEGORIES = [
  'Structural Damage',
  'Water Damage',
  'Surface Defects',
  'Functional Issues',
  'Safety Hazard',
  'Wear & Tear'
];

const ROOT_CAUSES = [
  'Poor Waterproofing',
  'Construction Defect',
  'Material Deterioration',
  'Poor Maintenance',
  'Weather/Natural Wear',
  'Improper Installation',
  'Design Flaw',
  'Overloading/Misuse',
  'Age of Structure',
  'Water Seepage'
];

function SectionHeader({ title, hint }:{ title: string; hint?: string }) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: Colors[scheme].tint, marginRight: 10 }} />
        <ThemedText style={{ fontWeight: '700', fontSize: 16 }}>{title}</ThemedText>
      </View>
      {hint ? <ThemedText style={{ opacity: 0.6, fontSize: 13, marginTop: 4, marginLeft: 13 }}>{hint}</ThemedText> : null}
    </View>
  );
}

function OptionCard({ label, icon, selected, onPress }:{ label: string; icon: keyof typeof Ionicons.glyphMap; selected: boolean; onPress: ()=>void }) {
  const scheme = useColorScheme() ?? 'light';
  const bg = selected ? (scheme === 'light' ? '#3261ceff' : '#3261ceff') : Colors[scheme].card;
  const border = selected ? Colors[scheme].tint : Colors[scheme].border;
  const textColor = selected ? '#fff' : Colors[scheme].text;
  const iconBg = selected ? '#1f2937' : (scheme === 'light' ? '#FFF7ED' : '#374151');
  const iconColor = selected ? '#fff' : Colors[scheme].tint;
  return (
    <Pressable onPress={onPress} style={[styles.optCard, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.optIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <ThemedText style={{ fontWeight: '600', color: textColor }}>{label}</ThemedText>
    </Pressable>
  );
}

function ScoreTile({ value, selected, color, onPress }:{ value: number; selected: boolean; color: string; onPress: ()=>void }) {
  const scheme = useColorScheme() ?? 'light';
  const bg = selected ? color : (scheme === 'light' ? '#F3F4F6' : '#1F2937');
  const textColor = selected ? '#fff' : Colors[scheme].text;
  return (
    <Pressable onPress={onPress} style={[styles.scoreTile, { backgroundColor: bg, shadowOpacity: selected ? 0.2 : 0 }]}>
      <ThemedText style={{ fontSize: 24, fontWeight: '800', color: textColor }}>{value}</ThemedText>
    </Pressable>
  );
}

function scoreMeta(v: number) {
  if (v === 1) return { label: 'Excellent', color: '#16a34a' };
  if (v === 2) return { label: 'Good', color: '#0ea5e9' };
  if (v === 3) return { label: 'Plan', color: '#f59e0b' };
  if (v === 4) return { label: 'Poor', color: '#fb923c' };
  return { label: 'Replace', color: '#ef4444' };
}

// New SelectInput component for dropdown-style selections
function SelectInput({ 
  label, 
  value, 
  placeholder, 
  icon, 
  onPress,
  required = false 
}: { 
  label: string; 
  value: string; 
  placeholder: string; 
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  required?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const hasValue = value !== '';
  
  return (
    <View style={{ marginBottom: 16 }}>
      <ThemedText style={styles.inputLabel}>
        {label}
        {required && <ThemedText style={{ color: '#ff4444' }}> *</ThemedText>}
      </ThemedText>
      <TouchableOpacity
        style={[
          styles.selectInput,
          {
            backgroundColor: Colors[scheme].card,
            borderColor: hasValue ? Colors[scheme].tint : Colors[scheme].border,
          }
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.selectInputLeft}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={hasValue ? Colors[scheme].tint : Colors[scheme].text} 
            style={{ opacity: hasValue ? 1 : 0.5 }}
          />
          <ThemedText style={[styles.selectInputText, !hasValue && { opacity: 0.5 }]}>
            {value || placeholder}
          </ThemedText>
        </View>
        <Ionicons name="chevron-down" size={20} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
      </TouchableOpacity>
    </View>
  );
}

// Selection Modal component
function SelectionModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  renderIcon
}: {
  visible: boolean;
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  renderIcon?: (item: string) => keyof typeof Ionicons.glyphMap;
}) {
  const scheme = useColorScheme() ?? 'light';
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: Colors[scheme].background }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>{title}</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={Colors[scheme].text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  {
                    backgroundColor: item === selectedValue ? Colors[scheme].tint + '15' : 'transparent',
                    borderLeftWidth: item === selectedValue ? 3 : 0,
                    borderLeftColor: Colors[scheme].tint,
                  }
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                {renderIcon && (
                  <Ionicons 
                    name={renderIcon(item)} 
                    size={22} 
                    color={item === selectedValue ? Colors[scheme].tint : Colors[scheme].text} 
                    style={{ marginRight: 12, opacity: item === selectedValue ? 1 : 0.6 }}
                  />
                )}
                <ThemedText style={[
                  styles.modalOptionText,
                  item === selectedValue && { 
                    fontWeight: '600', 
                    color: Colors[scheme].tint 
                  }
                ]}>
                  {item}
                </ThemedText>
                {item === selectedValue && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={22} 
                    color={Colors[scheme].tint} 
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function Assess() {
  const params = useLocalSearchParams<{ 
    photoUri?: string; 
    lat?: string; 
    lon?: string; 
    building?: string;
    floor?: string;
    room?: string;
    category?: string; 
    element?: string;
    createdAt?: string;
  }>();

  const category = params.category || '';
  const element = params.element || '';
  const building = params.building || '';
  const floor = params.floor || '';
  const room = params.room || '';
  const createdAt = params.createdAt ? Number(params.createdAt) : Date.now();
  const createdAtLabel = Number.isFinite(createdAt) ? new Date(createdAt).toLocaleString() : 'Unknown';
  const [condition, setCondition] = useState<number>(3);
  const [priority, setPriority] = useState<number>(3);
  const [damageCategory, setDamageCategory] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [rootCauseDetails, setRootCauseDetails] = useState('');
  const [notes, setNotes] = useState('');
  
  // Modal visibility states
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showRootCauseModal, setShowRootCauseModal] = useState(false);

  const prevPhotoRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevPhotoRef.current !== params.photoUri) {
      setCondition(3); 
      setPriority(3); 
      setDamageCategory('');
      setRootCause('');
      setRootCauseDetails('');
      setNotes('');
      prevPhotoRef.current = params.photoUri as string | undefined;
    }
  }, [params.photoUri]);

  const continueToReview = () => {
    router.push({
      pathname: '/(app)/review',
      params: { 
        photoUri: params.photoUri ?? '', 
        lat: params.lat ?? '', 
        lon: params.lon ?? '', 
        building,
        floor,
        room,
        category, 
        element,
        createdAt: String(createdAt),
        condition: String(condition), 
        priority: String(priority),
        damageCategory: damageCategory || '',
        rootCause: rootCause || '',
        rootCauseDetails: rootCauseDetails || '',
        notes 
      },
    });
  };

  const headerHeight = useHeaderHeight();
  const scheme = useColorScheme() ?? 'light';
  const scrollRef = useRef<ScrollView>(null);
  const [notesY, setNotesY] = useState(0);
  const hasCoords = Boolean(params.lat && params.lon);

  return (
    <StaffOrAdmin>
      <>
      <Stack.Screen options={{ title: 'Assess', headerTitle: 'Assess' }} />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors[scheme].background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {/* Photo Preview */}
            {params.photoUri ? <Image source={{ uri: params.photoUri }} style={styles.photo} /> : null}
            
            {/* Asset Details */}
            <Card variant="elevated" style={styles.card}>
              <SectionHeader title="Asset Information" />
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Building</ThemedText>
                <ThemedText style={styles.detailValue}>{building || '-'}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Floor</ThemedText>
                <ThemedText style={styles.detailValue}>{floor || '-'}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Room</ThemedText>
                <ThemedText style={styles.detailValue}>{room || '-'}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Category</ThemedText>
                <ThemedText style={styles.detailValue}>{category || '-'}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Building Element</ThemedText>
                <ThemedText style={styles.detailValue}>{element || '-'}</ThemedText>
              </View>
            </Card>

            {/* Condition & Priority */}
            <Card variant="elevated" style={styles.card}>
              <SectionHeader title="Condition Rating" hint="1=Excellent, 5=Critical" />
              <View style={styles.scoreRow}>
                {[1,2,3,4,5].map((v) => (
                  <ScoreTile key={`c${v}`} value={v} selected={condition === v} color={scoreMeta(v).color} onPress={() => setCondition(v)} />
                ))}
              </View>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.badge, { backgroundColor: scoreMeta(condition).color }]}>
                  <Ionicons name={condition <= 3 ? 'checkmark-circle' : 'alert-circle-outline'} color="#fff" size={14} />
                  <ThemedText style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>{scoreMeta(condition).label}</ThemedText>
                </View>
              </View>

              <SectionHeader title="Priority Level" hint="1=Very Low, 5=Very High" />
              <View style={styles.scoreRow}>
                {[1,2,3,4,5].map((v) => (
                  <ScoreTile key={`p${v}`} value={v} selected={priority === v} color={scoreMeta(v).color} onPress={() => setPriority(v)} />
                ))}
              </View>
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.badge, { backgroundColor: scoreMeta(priority).color }]}>
                  <Ionicons name={priority >=4 ? 'warning' : 'alert-circle-outline'} color="#fff" size={14} />
                  <ThemedText style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>{scoreMeta(priority).label}</ThemedText>
                </View>
              </View>
            </Card>

            {/* Damage Analysis */}
            <Card variant="elevated" style={styles.card}>
              <SelectInput
                label="Damage Type"
                value={damageCategory}
                placeholder="Select damage type"
                icon="alert-circle-outline"
                onPress={() => setShowDamageModal(true)}
                required
              />
              
              <SelectInput
                label="Root Cause"
                value={rootCause}
                placeholder="Select root cause (optional)"
                icon="search-outline"
                onPress={() => setShowRootCauseModal(true)}
              />

              {rootCause && (
                <Input 
                  label="Cause Details"
                  value={rootCauseDetails} 
                  onChangeText={setRootCauseDetails} 
                  placeholder="E.g., Waterproofing membrane failure, cracks visible..." 
                  multiline
                />
              )}
            </Card>

            {/* Notes */}
            <Card variant="elevated" style={styles.card}>
              <SectionHeader title="Notes & Observations" />
              <View onLayout={(e) => setNotesY(e.nativeEvent.layout.y)}>
                <Input 
                  value={notes} 
                  onChangeText={setNotes} 
                  placeholder="Additional observations, recommendations, or comments..." 
                  multiline
                  onFocus={() => scrollRef.current?.scrollTo({ y: Math.max(0, notesY - 8), animated: true })} 
                />
              </View>
            </Card>

            {/* Location & Time */}
            <Card variant="elevated" style={styles.card}>
              <View style={styles.locationHeader}>
                <View style={styles.locationTitleRow}>
                  <Ionicons name="location" size={20} color={Colors[scheme].tint} />
                  <ThemedText style={styles.locationTitle}>GPS & Time</ThemedText>
                </View>
                {hasCoords ? (
                  <TouchableOpacity 
                    style={[styles.openMapButton, { backgroundColor: Colors[scheme].tint }]}
                    onPress={() => {
                      const url = Platform.select({
                        ios: `maps:0,0?q=${params.lat},${params.lon}`,
                        android: `geo:0,0?q=${params.lat},${params.lon}`,
                      });
                      if (url) Linking.openURL(url);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="open-outline" size={16} color="#fff" />
                    <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Open</ThemedText>
                  </TouchableOpacity>
                ) : null}
              </View>
              
              {hasCoords ? (
                <>
                  <View style={styles.mapContainer}>
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: Number(params.lat),
                        longitude: Number(params.lon),
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                    >
                      <Marker
                        coordinate={{
                          latitude: Number(params.lat),
                          longitude: Number(params.lon),
                        }}
                        title="Assessment Location"
                      />
                    </MapView>
                  </View>
                  
                  <View style={[styles.coordinatesCard, { backgroundColor: Colors[scheme].tint + '15' }]}>
                    <View style={styles.coordinateRow}>
                      <ThemedText style={styles.coordinateLabel}>Latitude:</ThemedText>
                      <ThemedText style={[styles.coordinateValue, { color: Colors[scheme].tint }]}>
                        {Number(params.lat).toFixed(6)}
                      </ThemedText>
                    </View>
                    <View style={styles.coordinateRow}>
                      <ThemedText style={styles.coordinateLabel}>Longitude:</ThemedText>
                      <ThemedText style={[styles.coordinateValue, { color: Colors[scheme].tint }]}>
                        {Number(params.lon).toFixed(6)}
                      </ThemedText>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.coordinatesCard}>
                  <ThemedText style={styles.gpsUnavailable}>GPS unavailable</ThemedText>
                </View>
              )}

              <View style={[styles.timeCard, { backgroundColor: Colors[scheme].card }]}>
                <ThemedText style={styles.coordinateLabel}>Time:</ThemedText>
                <ThemedText style={styles.timeValue}>{createdAtLabel}</ThemedText>
              </View>
            </Card>
            
            <View style={{ height: 88 }} />
          </ScrollView>

          <View style={[styles.fabBar, { backgroundColor: '#3261ceff' }]}>
            <Pressable onPress={continueToReview} style={styles.fabButton}>
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Continue to Review</ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </View>

        {/* Selection Modals */}
        <SelectionModal
          visible={showDamageModal}
          title="Select Damage Type"
          options={DAMAGE_CATEGORIES}
          selectedValue={damageCategory}
          onSelect={setDamageCategory}
          onClose={() => setShowDamageModal(false)}
          renderIcon={(item) => 
            item === 'Structural Damage' ? 'home-outline' :
            item === 'Water Damage' ? 'water-outline' :
            item === 'Surface Defects' ? 'brush-outline' :
            item === 'Functional Issues' ? 'construct-outline' :
            item === 'Safety Hazard' ? 'warning-outline' : 
            'alert-circle-outline'
          }
        />

        <SelectionModal
          visible={showRootCauseModal}
          title="Select Root Cause"
          options={ROOT_CAUSES}
          selectedValue={rootCause}
          onSelect={setRootCause}
          onClose={() => setShowRootCauseModal(false)}
          renderIcon={(item) => 
            item === 'Poor Waterproofing' ? 'water-outline' :
            item === 'Construction Defect' ? 'hammer-outline' :
            item === 'Material Deterioration' ? 'timer-outline' :
            item === 'Poor Maintenance' ? 'build-outline' :
            item === 'Weather/Natural Wear' ? 'rainy-outline' :
            item === 'Improper Installation' ? 'warning-outline' :
            item === 'Design Flaw' ? 'help-circle-outline' :
            item === 'Overloading/Misuse' ? 'alert-circle-outline' :
            item === 'Age of Structure' ? 'time-outline' : 
            'help-circle-outline'
          }
        />
      </KeyboardAvoidingView>
    </>
    </StaffOrAdmin>
  );
}
const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 16 },
  photo: { width: '100%', height: 220, resizeMode: 'cover', borderRadius: 12, marginBottom: 12 },
  card: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    width: 130,
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Location Map styles
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
  coordinatesCard: {
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  gpsUnavailable: {
    fontSize: 14,
    opacity: 0.6,
  },
  timeCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  coordinateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coordinateLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  coordinateValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 8,
    opacity: 0.8,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optCard: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginRight: 10, marginBottom: 10, minWidth: 120 },
  optIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  scoreTile: { width: '18%', aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  fabBar: { position: 'absolute', left: 16, right: 16, bottom: 20, borderRadius: 24, padding: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  fabButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  
  // SelectInput styles
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  selectInputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  selectInputText: {
    fontSize: 15,
    fontWeight: '500',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

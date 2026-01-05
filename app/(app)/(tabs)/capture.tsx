import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ThemedText } from '@/components/themed-text';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, View, ScrollView, Pressable, Modal, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { StaffOrAdmin } from '@/lib/auth/RoleGuard';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['Civil', 'Electrical', 'Mechanical'];

const ELEMENTS_BY_CATEGORY: Record<string, string[]> = {
  'Civil': ['Roof', 'Wall', 'Floor', 'Foundation', 'Ceiling', 'Door', 'Window', 'Staircase'],
  'Electrical': ['Wiring', 'Panel', 'Outlet', 'Switch', 'Lighting', 'Earthing', 'Generator'],
  'Mechanical': ['HVAC', 'Plumbing', 'Elevator', 'Fire System', 'Ventilation', 'Pump']
};

export default function AuditTab() {
  const scheme = useColorScheme() ?? 'light';
  const [uri, setUri] = React.useState<string | null>(null);
  const [coords, setCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [building, setBuilding] = React.useState('');
  const [floor, setFloor] = React.useState('');
  const [room, setRoom] = React.useState('');
  const [category, setCategory] = React.useState<string>('');
  const [element, setElement] = React.useState<string>('');
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [showElementModal, setShowElementModal] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync();
        if (last?.coords) {
          setCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        } else {
          await getCurrentPositionWithTimeout(6000).then((pos) => {
            if (pos) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          });
        }
      } catch {}
    })();
  }, []);

  useFocusEffect(React.useCallback(() => {
    setUri(null);
    setBuilding('');
    setFloor('');
    setRoom('');
    setCategory('');
    setElement('');
    return undefined;
  }, []));

  async function getCurrentPositionWithTimeout(ms: number): Promise<Location.LocationObject | null> {
    let timer: any;
    try {
      const p = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const t = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
      const res = await Promise.race([p as Promise<any>, t]);
      return res ?? null;
    } catch { return null; }
    finally { if (timer) clearTimeout(timer); }
  }

  const takePhoto = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (cam.status !== 'granted') { alert('Camera permission required'); return; }
    await Location.requestForegroundPermissionsAsync();

    const shot = await ImagePicker.launchCameraAsync({ quality: 0.7, exif: true });
    if (shot.canceled) return;

    const asset = shot.assets[0];
    setUri(asset.uri);

    const exifLat = (asset as any)?.exif?.GPSLatitude;
    const exifLon = (asset as any)?.exif?.GPSLongitude;
    if (typeof exifLat === 'number' && typeof exifLon === 'number') {
      setCoords({ latitude: exifLat, longitude: exifLon });
      return;
    }

    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last?.coords) {
        setCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      } else {
        const pos = await getCurrentPositionWithTimeout(6000);
        if (pos) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      }
    } catch {}
  };

  const pickFromLibrary = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (lib.status !== 'granted') { alert('Photo library permission required'); return; }

    await Location.requestForegroundPermissionsAsync();

    const res = await ImagePicker.launchImageLibraryAsync({ 
      quality: 0.8, 
      mediaTypes: ['images'],
      exif: true 
    });
    if (res.canceled) return;

    const asset = res.assets[0];
    setUri(asset.uri);

    const exifLat = (asset as any)?.exif?.GPSLatitude;
    const exifLon = (asset as any)?.exif?.GPSLongitude;
    if (typeof exifLat === 'number' && typeof exifLon === 'number') {
      setCoords({ latitude: exifLat, longitude: exifLon });
      return;
    }

    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last?.coords) {
        setCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      } else {
        const pos = await getCurrentPositionWithTimeout(6000);
        if (pos) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      }
    } catch {}
  };

  const canProceed = building && floor && room && category && element && uri;

  const handleBeginAudit = () => {
    if (!canProceed) return;
    const createdAt = Date.now();
    router.push({
      pathname: '/(app)/(tabs)/assess',
      params: {
        photoUri: uri,
        building,
        floor,
        room,
        category,
        element,
        createdAt: String(createdAt),
        lat: coords?.latitude?.toString() ?? '',
        lon: coords?.longitude?.toString() ?? '',
      },
    });
  };

  const availableElements = category ? ELEMENTS_BY_CATEGORY[category] || [] : [];

  return (
    <StaffOrAdmin>
      <ScrollView 
        style={[styles.container, { backgroundColor: Colors[scheme].background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="clipboard" size={32} color={Colors[scheme].tint} />
          <ThemedText style={styles.headerTitle}>New Asset Audit</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Complete all sections to begin assessment
          </ThemedText>
        </View>

        {/* Step 1: Asset Information */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.stepBadge, { backgroundColor: category ? Colors[scheme].tint : Colors[scheme].border }]}>
              <ThemedText style={[styles.stepBadgeText, { color: category ? '#fff' : Colors[scheme].text }]}>1</ThemedText>
            </View>
            <ThemedText style={styles.cardTitle}>Asset Information</ThemedText>
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.readonlyRow}>
              <ThemedText style={styles.label}>ID</ThemedText>
              <ThemedText style={styles.readonlyValue}>Auto-generated on save</ThemedText>
            </View>

            <Input
              label="Building"
              value={building}
              onChangeText={setBuilding}
              placeholder="Enter building name"
              required
            />
            <Input
              label="Floor"
              value={floor}
              onChangeText={setFloor}
              placeholder="Enter floor"
              required
            />
            <Input
              label="Room"
              value={room}
              onChangeText={setRoom}
              placeholder="Enter room"
              required
            />

            <ThemedText style={styles.label}>Category *</ThemedText>
            <Pressable
              style={[
                styles.selectButton,
                { 
                  backgroundColor: Colors[scheme].card,
                  borderColor: category ? Colors[scheme].tint : Colors[scheme].border
                }
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Ionicons 
                name="apps-outline" 
                size={20} 
                color={category ? Colors[scheme].tint : Colors[scheme].text} 
                style={{ opacity: category ? 1 : 0.5 }}
              />
              <ThemedText style={[styles.selectButtonText, !category && { opacity: 0.5 }]}>
                {category || 'Select Category'}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
            </Pressable>

            <ThemedText style={styles.label}>Element *</ThemedText>
            <Pressable
              style={[
                styles.selectButton,
                { 
                  backgroundColor: Colors[scheme].card,
                  borderColor: element ? Colors[scheme].tint : Colors[scheme].border,
                  opacity: !category ? 0.5 : 1
                }
              ]}
              onPress={() => category && setShowElementModal(true)}
              disabled={!category}
            >
              <Ionicons 
                name="cube-outline" 
                size={20} 
                color={element ? Colors[scheme].tint : Colors[scheme].text} 
                style={{ opacity: element ? 1 : 0.5 }}
              />
              <ThemedText style={[styles.selectButtonText, !element && { opacity: 0.5 }]}>
                {element || (category ? 'Select Element' : 'Select category first')}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={Colors[scheme].text} style={{ opacity: 0.5 }} />
            </Pressable>

          </View>
        </Card>

        {/* Step 2: Documentation */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.stepBadge, { backgroundColor: uri ? Colors[scheme].tint : Colors[scheme].border }]}>
              <ThemedText style={[styles.stepBadgeText, { color: uri ? '#fff' : Colors[scheme].text }]}>2</ThemedText>
            </View>
            <ThemedText style={styles.cardTitle}>Photo Documentation</ThemedText>
          </View>

          <View style={styles.sectionContent}>
            {!uri ? (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={48} color={Colors[scheme].text} style={{ opacity: 0.3, marginBottom: 12 }} />
                <ThemedText style={styles.placeholderText}>
                  Capture or upload asset photo
                </ThemedText>
                <View style={styles.photoButtons}>
                  <Button 
                    title="Take Photo" 
                    onPress={takePhoto} 
                    variant="primary"
                    style={{ flex: 1 }}
                  />
                  <Button 
                    title="Upload" 
                    onPress={pickFromLibrary} 
                    variant="secondary"
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <View>
                <Image source={{ uri }} style={styles.photoPreview} />
                <Button 
                  title="Change Photo" 
                  onPress={() => setUri(null)} 
                  variant="secondary"
                  size="sm"
                  style={styles.changePhotoButton}
                />
              </View>
            )}
          </View>
        </Card>

        {/* Begin Audit Button */}
        <Button
          title={canProceed ? "Begin Assessment" : "Complete Steps 1-2 to Continue"}
          onPress={handleBeginAudit}
          disabled={!canProceed}
          style={styles.beginButton}
        />

        <ThemedText style={styles.footerNote}>
          * Required fields must be completed
        </ThemedText>
      </ScrollView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: Colors[scheme].card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Category</ThemedText>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={Colors[scheme].text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat}
                  style={[
                    styles.modalOption,
                    category === cat && { backgroundColor: Colors[scheme].tint + '15' }
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setElement(''); // Reset element when category changes
                    setShowCategoryModal(false);
                  }}
                >
                  <Ionicons
                    name={
                      cat === 'Civil' ? 'construct' :
                      cat === 'Electrical' ? 'flash' : 'cog'
                    }
                    size={24}
                    color={category === cat ? Colors[scheme].tint : Colors[scheme].text}
                  />
                  <ThemedText style={[
                    styles.modalOptionText,
                    category === cat && { color: Colors[scheme].tint, fontWeight: '600' }
                  ]}>
                    {cat}
                  </ThemedText>
                  {category === cat && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors[scheme].tint} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Element Modal */}
      <Modal
        visible={showElementModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowElementModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowElementModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: Colors[scheme].card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Element</ThemedText>
              <TouchableOpacity onPress={() => setShowElementModal(false)}>
                <Ionicons name="close" size={24} color={Colors[scheme].text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {availableElements.map(elem => (
                <Pressable
                  key={elem}
                  style={[
                    styles.modalOption,
                    element === elem && { backgroundColor: Colors[scheme].tint + '15' }
                  ]}
                  onPress={() => {
                    setElement(elem);
                    setShowElementModal(false);
                  }}
                >
                  <Ionicons
                    name="cube"
                    size={24}
                    color={element === elem ? Colors[scheme].tint : Colors[scheme].text}
                  />
                  <ThemedText style={[
                    styles.modalOptionText,
                    element === elem && { color: Colors[scheme].tint, fontWeight: '600' }
                  ]}>
                    {elem}
                  </ThemedText>
                  {element === elem && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors[scheme].tint} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

    </StaffOrAdmin>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionContent: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 4,
  },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readonlyValue: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 16,
  },
  photoPlaceholder: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderText: {
    fontSize: 15,
    opacity: 0.6,
    marginBottom: 16,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  photoPreview: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 12,
  },
  changePhotoButton: {
    alignSelf: 'center',
  },
  beginButton: {
    marginTop: 8,
    marginBottom: 12,
  },
  footerNote: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: 'center',
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
    maxHeight: '70%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalList: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
  },
});

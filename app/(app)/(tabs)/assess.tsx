import { router, useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StaffOrAdmin } from '@/lib/auth/RoleGuard';

const ELEMENTS: Record<string, string[]> = {
  Civil: ['Roof', 'External wall', 'Internal wall', 'Floor', 'Ceiling', 'Doors/Windows'],
  Electrical: ['Lighting', 'Sockets', 'Wiring', 'DB/Panel', 'Earthing'],
  Mechanical: ['HVAC', 'Pumps', 'Fire system', 'Water distribution', 'Pipe'],
};

function SectionHeader({ title, hint }:{ title: string; hint?: string }) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <View style={{ marginTop: 8, marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: Colors[scheme].tint, marginRight: 8 }} />
        <ThemedText style={{ fontWeight: '700' }}>{title}</ThemedText>
      </View>
      {hint ? <ThemedText style={{ opacity: 0.7 }}>{hint}</ThemedText> : null}
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

export default function Assess() {
  const { photoUri, lat, lon } = useLocalSearchParams<{ photoUri?: string; lat?: string; lon?: string }>();

  const [category, setCategory] = useState('Civil');
  const [element, setElement] = useState(ELEMENTS['Civil'][0]);
  const [condition, setCondition] = useState<number>(3);
  const [priority, setPriority] = useState<number>(3);
  const [notes, setNotes] = useState('');

  useEffect(() => { setElement(ELEMENTS[category][0]); }, [category]);

  const prevPhotoRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevPhotoRef.current !== photoUri) {
      setCategory('Civil'); setElement(ELEMENTS['Civil'][0]); setCondition(3); setPriority(3); setNotes('');
      prevPhotoRef.current = photoUri as string | undefined;
    }
  }, [photoUri]);

  const continueToReview = () => {
    // Debug logging (disabled for cleaner output)
    // console.log('Navigating to review with params:', {
    //   photoUri: photoUri ?? '',
    //   lat: lat ?? '',
    //   lon: lon ?? '',
    //   category,
    //   element,
    //   condition: String(condition),
    //   priority: String(priority),
    //   notes
    // });

    router.push({
      pathname: '/(app)/review',
      params: { photoUri: photoUri ?? '', lat: lat ?? '', lon: lon ?? '', category, element, condition: String(condition), priority: String(priority), notes },
    });
  };

  const headerHeight = useHeaderHeight();
  const scheme = useColorScheme() ?? 'light';
  const scrollRef = useRef<ScrollView>(null);
  const [notesY, setNotesY] = useState(0);

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
            {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}
            {(lat && lon) ? (<ThemedText style={{ marginBottom: 6 }}>GPS: {Number(lat).toFixed(6)}, {Number(lon).toFixed(6)}</ThemedText>) : null}

            <SectionHeader title="Assessment Category" />
            <View style={styles.rowWrap}>
              {Object.keys(ELEMENTS).map((name) => (
                <OptionCard
                  key={name}
                  label={name}
                  icon={name === 'Civil' ? 'construct-outline' : name === 'Electrical' ? 'flash-outline' : 'cog-outline'}
                  selected={category === name}
                  onPress={() => setCategory(name)}
                />
              ))}
            </View>

            <SectionHeader title="Building Element" />
            <View style={styles.rowWrap}>
              {ELEMENTS[category].map((el) => (
                <OptionCard
                  key={el}
                  label={el}
                  icon={
                    el.includes('Roof') ? 'home-outline' :
                    el.includes('External') ? 'leaf-outline' :
                    el.includes('Internal') ? 'cube-outline' :
                    el.includes('Floor') ? 'grid-outline' :
                    el.includes('Ceiling') ? 'layers-outline' :
                    el.includes('Lighting') ? 'bulb-outline' :
                    el.includes('Sockets') ? 'flash-outline' :
                    el.includes('Wiring') ? 'git-branch-outline' :
                    el.includes('DB/Panel') ? 'server-outline' :
                    el.includes('Earthing') ? 'earth-outline' :
                    el.includes('HVAC') ? 'thermometer-outline' :
                    el.includes('Pumps') ? 'cog-outline' :
                    el.includes('Water distribution') ? 'water-outline' :
                    el.includes('Fire System') ? 'flame-outline' :
                    el.includes('Pipe') ? 'git-merge-outline' :
                    'home-outline'
                  }
                  selected={element === el}
                  onPress={() => setElement(el)}
                />
              ))}
            </View>

            <SectionHeader title="Condition" hint="1=Very Good, 5=Very Poor" />
            <View style={styles.scoreRow}>
              {[1,2,3,4,5].map((v) => (
                <ScoreTile key={`c${v}`} value={v} selected={condition === v} color={scoreMeta(v).color} onPress={() => setCondition(v)} />
              ))}
            </View>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <View style={[styles.badge, { backgroundColor: scoreMeta(condition).color }]}>
                <Ionicons name={condition <= 3 ? 'thermometer-outline' : 'alert-circle-outline'} color="#fff" size={14} />
                <ThemedText style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>{scoreMeta(condition).label}</ThemedText>
              </View>
            </View>

            <SectionHeader title="Priority" hint="1=Normal, 5=Replacement" />
            <View style={styles.scoreRow}>
              {[1,2,3,4,5].map((v) => (
                <ScoreTile key={`p${v}`} value={v} selected={priority === v} color={scoreMeta(v).color} onPress={() => setPriority(v)} />
              ))}
            </View>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.badge, { backgroundColor: scoreMeta(priority).color }]}>
                <Ionicons name={priority >=4 ? 'warning-outline' : 'alert-circle-outline'} color="#fff" size={14} />
                <ThemedText style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>{scoreMeta(priority).label}</ThemedText>
              </View>
            </View>

            <SectionHeader title="Notes & Observations" />
            <View onLayout={(e) => setNotesY(e.nativeEvent.layout.y)}>
              <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Describe the defect or observation..." multiline
                     onFocus={() => scrollRef.current?.scrollTo({ y: Math.max(0, notesY - 8), animated: true })} />
            </View>
            <View style={{ height: 88 }} />
          </ScrollView>

          <View style={[styles.fabBar, { backgroundColor: '#3261ceff' }]}>
            <Pressable onPress={continueToReview} style={styles.fabButton}>
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Continue to Review</ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
    </StaffOrAdmin>
  );
}
const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 16 },
  photo: { width: '100%', height: 240, resizeMode: 'cover', borderRadius: 8, marginBottom: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optCard: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginRight: 10, marginBottom: 10, minWidth: 120 },
  optIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreTile: { width: '18%', aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  fabBar: { position: 'absolute', left: 16, right: 16, bottom: 20, borderRadius: 24, padding: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  fabButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
});

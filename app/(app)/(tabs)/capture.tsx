import { Button } from '@/components/ui/Button';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { StaffOrAdmin } from '@/lib/auth/RoleGuard';

export default function Capture() {
  const scheme = useColorScheme() ?? 'light';
  const [uri, setUri] = React.useState<string | null>(null);
  const [coords, setCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [resolvingLoc, setResolvingLoc] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        setResolvingLoc(true);
        const last = await Location.getLastKnownPositionAsync();
        if (last?.coords) {
          setCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        } else {
          await getCurrentPositionWithTimeout(6000).then((pos) => {
            if (pos) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          });
        }
      } catch {} finally { setResolvingLoc(false); }
    })();
  }, []);

  useFocusEffect(React.useCallback(() => {
    setUri(null); setCoords(null); setResolvingLoc(false);
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

    setResolvingLoc(true);
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last?.coords) {
        setCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      } else {
        const pos = await getCurrentPositionWithTimeout(6000);
        if (pos) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      }
    } catch {} finally { setResolvingLoc(false); }
  };

  const pickFromLibrary = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (lib.status !== 'granted') { alert('Photo library permission required'); return; }

    // Request location permissions for uploaded photos too
    await Location.requestForegroundPermissionsAsync();

    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images, exif: true });
    if (res.canceled) return;

    const asset = res.assets[0];
    setUri(asset.uri);

    // Try to get GPS from EXIF data first
    const exifLat = (asset as any)?.exif?.GPSLatitude;
    const exifLon = (asset as any)?.exif?.GPSLongitude;
    if (typeof exifLat === 'number' && typeof exifLon === 'number') {
      setCoords({ latitude: exifLat, longitude: exifLon });
      return;
    }

    // If no EXIF GPS data, get current location
    setResolvingLoc(true);
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last?.coords) {
        setCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      } else {
        const pos = await getCurrentPositionWithTimeout(6000);
        if (pos) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      }
    } catch {} finally { setResolvingLoc(false); }
  };

  const useThis = () => {
    if (!uri) return;
    router.push({
      pathname: '/(app)/(tabs)/assess',
      params: {
        photoUri: uri,
        lat: coords?.latitude?.toString() ?? '',
        lon: coords?.longitude?.toString() ?? '',
      },
    });
  };

  return (
    <StaffOrAdmin>
      <View style={[styles.container, { backgroundColor: Colors[scheme].background }] }>
        {!uri ? (
          <>
            <Button title="Use Camera" onPress={takePhoto} />
            <View style={{ height: 8 }} />
            <Button title="Upload Photo" onPress={pickFromLibrary} variant="secondary" />
            <Text style={{ marginTop: 8, color: Colors[scheme].text, textAlign:'center' }}>
              You'll be asked for camera & location permissions.
            </Text>
          </>
        ) : (
          <>
            <Image source={{ uri }} style={styles.preview} />
            {resolvingLoc && !coords && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <ActivityIndicator color={Colors[scheme].tint} style={{ marginRight: 8 }} />
                <Text style={{ color: Colors[scheme].text }}>Fetching GPS</Text>
              </View>
            )}
            <Button title="Use Photo" onPress={useThis} disabled={resolvingLoc && !coords} />
            <View style={{ height: 6 }} />
            <Button title="Use without GPS" onPress={useThis} variant="secondary" />
            <View style={{ height: 6 }} />
            <Button title="Retake" onPress={() => { setUri(null); }} />
          </>
        )}
      </View>
    </StaffOrAdmin>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  preview: { width: '100%', height: 360, resizeMode: 'cover', borderRadius: 8, marginVertical: 12 },
});

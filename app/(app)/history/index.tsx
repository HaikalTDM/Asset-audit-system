import React from 'react';
import { Image, Pressable, StyleSheet, View, FlatList, Text } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FirestoreService, type Assessment } from '@/lib/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { router } from 'expo-router';

export default function HistoryList() {
  const scheme = useColorScheme() ?? 'light';
  const [rows, setRows] = React.useState<Assessment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { user } = useAuth();

  const load = React.useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const assessments = await FirestoreService.listAssessments(user.uid);
      setRows(assessments);
    } catch (err) {
      console.error('Error loading assessments:', err);
      setError('Failed to load assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      {loading ? (
        <ThemedText>Loading assessments...</ThemedText>
      ) : error ? (
        <View>
          <ThemedText style={{ color: 'red', marginBottom: 8 }}>{error}</ThemedText>
          <Button title="Retry" onPress={load} variant="secondary" />
        </View>
      ) : rows.length === 0 ? (
        <ThemedText>No history yet.</ThemedText>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => String(it.id)}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push({ pathname: '/(app)/history/[id]', params: { id: item.id } })}>
              <Image source={{ uri: item.photo_uri }} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontWeight: '600' }}>{item.category} — {item.element}</ThemedText>
                <ThemedText style={{ opacity: 0.8 }}>{new Date(item.created_at).toLocaleString()}</ThemedText>
              </View>
              <Button title="Open" onPress={() => router.push({ pathname: '/(app)/history/[id]', params: { id: item.id } })} variant="secondary" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container:{ flex:1, padding:16 },
  row:{ flexDirection:'row', alignItems:'center', gap:10 },
  thumb:{ width:48, height:48, borderRadius:8 },
});

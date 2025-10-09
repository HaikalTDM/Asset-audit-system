import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExampleModal() {
  const scheme = useColorScheme() ?? 'light';
  return (
    <View style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      <ThemedText type="title">Modal</ThemedText>
      <ThemedText>This is a sample modal screen.</ThemedText>
    </View>
  );
}
const styles = StyleSheet.create({ container:{ flex:1, padding:16 }});

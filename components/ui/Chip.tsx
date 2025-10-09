import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.base, selected && styles.selected, style]}>
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selected: {
    backgroundColor: '#dff3fb',
    borderColor: '#0a7ea4',
  },
  text: {
    color: '#11181C',
  },
  textSelected: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
});


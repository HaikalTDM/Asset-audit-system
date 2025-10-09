import React from 'react';
import { Modal, Pressable, StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ZoomImageModal({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(4, e.scale));
    })
    .onEnd(() => {
      if (scale.value < 1) scale.value = withTiming(1);
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        tx.value = e.translationX;
        ty.value = e.translationY;
      }
    })
    .onEnd(() => {
      tx.value = withTiming(0);
      ty.value = withTiming(0);
    });

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    scale.value = withTiming(scale.value > 1 ? 1 : 2);
  });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="fade" presentationStyle="fullScreen">
      <GestureHandlerRootView style={styles.container}>
        {/* Background tap to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Close button */}
        <View style={[styles.closeButtonContainer, { top: insets.top + 16 }]}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close image viewer"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
        </View>

        {/* Image with gestures */}
        <GestureDetector gesture={composed}>
          <Animated.Image source={{ uri }} style={[styles.image, style]} resizeMode="contain" />
        </GestureDetector>

        {/* Instructions text */}
        <View style={[styles.instructionsContainer, { bottom: insets.bottom + 20 }]}>
          <View style={styles.instructionsBackground}>
            <Ionicons name="information-circle-outline" size={16} color="#ffffff" style={styles.instructionsIcon} />
            <View style={styles.instructionsText}>
              <View style={styles.instructionTextRow}>
                <Text style={styles.instructionLabel}>Pinch to zoom • Double tap to zoom • Tap to close</Text>
              </View>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  closeButtonContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  instructionsContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    alignItems: 'center',
  },
  instructionsBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: 320,
  },
  instructionsIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  instructionsText: {
    flex: 1,
  },
  instructionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionLabel: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
  },
});

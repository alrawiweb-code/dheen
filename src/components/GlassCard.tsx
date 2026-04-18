import React from 'react';
import { ViewStyle, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  fallbackColor?: string;
}

export const GlassCard = ({
  children,
  style,
  intensity = 30, // Corresponds to the 20px blur in web, roughly 30-50 intensity in Expo BlurView
  tint = 'light',
  fallbackColor = Colors.glassBg,
}: GlassCardProps) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFillObject}
        experimentalBlurMethod="dimezisBlurView" // Better performance and visual on Android
      />
      {/* Background fallback for older Androids or if blur fails */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: fallbackColor }]} />
      
      {/* The actual content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
  },
  content: {
    padding: 20,
    zIndex: 1, // Ensure content is above the blur layer
  },
});

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows, BorderRadius, Spacing } from '../theme';

interface GradientCTAProps {
  onPress: () => void;
  title?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  colors?: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export const GradientCTA = ({
  onPress,
  title,
  children,
  style,
  textStyle,
  colors = [Colors.primary, Colors.primaryDark], // Default gradient to Primary container
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}: GradientCTAProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.buttonContainer, Shadows.md, style]}
    >
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        style={styles.gradient}
      >
        {title ? (
          <Text style={[styles.buttonText, textStyle]}>{title}</Text>
        ) : (
          children
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans', // Display font for primary buttons
  },
});

import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';
import { HijriDate } from '../services/prayerTimes';

interface HijriDateBadgeProps {
  hijri?: HijriDate | null;
  style?: ViewStyle;
}

export const HijriDateBadge: React.FC<HijriDateBadgeProps> = ({ hijri, style }) => {
  const label = hijri
    ? `${hijri.day} ${hijri.month.en} ${hijri.year}`
    : '14 Shawwal 1446';

  return (
    <Text style={[styles.text, style]}>
      {label}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: Typography.sizes.sm,
    color: Colors.accent,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.3,
  },
});

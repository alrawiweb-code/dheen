import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';
import { HijriDate } from '../services/prayerTimes';

interface HijriDateBadgeProps {
  hijri?: HijriDate | null;
  style?: ViewStyle;
}

const convertToArabicNumerals = (numStr: string) => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return numStr.replace(/[0-9]/g, (w) => arabicNumbers[parseInt(w, 10)]);
};

export const HijriDateBadge: React.FC<HijriDateBadgeProps> = ({ hijri, style }) => {
  const label = hijri
    ? `${convertToArabicNumerals(hijri.day)} ${hijri.month.ar} ${convertToArabicNumerals(hijri.year)} هـ`
    : '١٤ شوال ١٤٤٦ هـ';

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

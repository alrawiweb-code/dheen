import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, NativeSpacing as Spacing } from '../theme';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    label: 'Reflection',
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
    translation: '"So remember Me; I will remember you."',
    ref: 'Surah Al-Baqarah 2:152',
  },
  {
    label: 'Dhikr',
    arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    translation: '"Glory be to Allah and all praise is due to Him."',
    ref: 'Sahih Muslim',
  },
  {
    label: 'Dua',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً',
    translation: '"Our Lord, give us in this world that which is good..."',
    ref: 'Surah Al-Baqarah 2:201',
  },
];

export const OneMinuteModal = ({ navigation }: any) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [seconds, setSeconds] = useState(20);
  const timerProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Countdown timer
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(interval);
          if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
            setSeconds(20);
          } else {
            navigation.goBack();
          }
          return 20;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep]);

  // SVG-like progress ring using rotation
  const strokeDasharray = 276;
  const strokeDashoffset = strokeDasharray * (1 - seconds / 20);

  return (
    <View style={styles.container}>
      {/* Ambient light rays */}
      <View style={styles.ray1} />
      <View style={styles.ray2} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={22} color={Colors.textDark} />
        </TouchableOpacity>
        <View style={styles.titleBadge}>
          <MaterialIcons name="auto-awesome" size={16} color={Colors.secondary} />
          <Text style={styles.titleBadgeText}>✦ 1 Minute for Allah</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar segments */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressSegment, i <= currentStep && styles.progressSegmentActive]}>
            {i === currentStep && <View style={styles.progressShimmer} />}
          </View>
        ))}
      </View>

      {/* Main canvas */}
      <View style={styles.mainCanvas}>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepLabel}>{STEPS[currentStep].label}</Text>
          <View style={styles.stepDot} />
        </View>

        {/* Arabic verse */}
        <View style={styles.verseBlock}>
          <Text style={styles.arabicText}>{STEPS[currentStep].arabic}</Text>

          <View style={styles.translationBlock}>
            <Text style={styles.translationText}>{STEPS[currentStep].translation}</Text>
            <Text style={styles.refText}>{STEPS[currentStep].ref}</Text>
          </View>
        </View>

        {/* Countdown ring */}
        <View style={styles.countdownRing}>
          <View style={styles.countdownCenter}>
            <Text style={styles.countdownNumber}>{String(seconds).padStart(2, '0')}</Text>
            <Text style={styles.countdownSub}>SECONDS</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => {
            if (currentStep < STEPS.length - 1) {
              setCurrentStep(prev => prev + 1);
              setSeconds(20);
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcons name="arrow-forward" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Footer instruction */}
      <View style={styles.footerInstruction}>
        <Text style={styles.footerText}>
          Take a deep breath and let the words settle in your heart.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center' },
  ray1: {
    position: 'absolute', top: -96, left: -96, width: 384, height: 384,
    borderRadius: 192, backgroundColor: 'rgba(161,242,219,0.1)',
  },
  ray2: {
    position: 'absolute', bottom: -96, right: -96, width: 384, height: 384,
    borderRadius: 192, backgroundColor: 'rgba(254,214,91,0.1)',
  },

  header: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.md,
    backgroundColor: 'rgba(251,249,244,0.8)',
  },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f3ee' },
  titleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(254,214,91,0.3)', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(115,92,0,0.1)',
  },
  titleBadgeText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: Colors.secondary, letterSpacing: 1 },

  progressBar: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl, paddingVertical: 8, width: '100%' },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(111,121,117,0.3)', overflow: 'hidden' },
  progressSegmentActive: { backgroundColor: Colors.primary },
  progressShimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.3)' },

  mainCanvas: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: 48 },

  stepIndicator: { alignItems: 'center', gap: 8 },
  stepLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.secondary, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.6 },
  stepDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.secondary },

  verseBlock: { alignItems: 'center', gap: 32 },
  arabicText: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 42, color: Colors.primary, textAlign: 'center', lineHeight: 72 },
  translationBlock: { alignItems: 'center', gap: 8 },
  translationText: { fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: '700', color: Colors.textDark, textAlign: 'center', lineHeight: 32 },
  refText: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, fontWeight: '500' },

  countdownRing: {
    width: 96, height: 96,
    borderRadius: 48, borderWidth: 3, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  countdownCenter: { alignItems: 'center' },
  countdownNumber: { fontFamily: 'Plus Jakarta Sans', fontSize: 28, fontWeight: '800', color: Colors.primary },
  countdownSub: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },

  nextBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#f5f3ee', alignItems: 'center', justifyContent: 'center',
  },

  footerInstruction: { paddingBottom: 48, paddingHorizontal: Spacing['3xl'] },
  footerText: { fontFamily: 'Manrope', fontSize: 14, color: 'rgba(27,28,25,0.6)', fontStyle: 'italic', textAlign: 'center' },
});

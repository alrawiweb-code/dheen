import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DhikrOptions } from '../theme';
import { DAILY_AYAHS } from '../services/quranApi';
import { useAppStore } from '../store/useAppStore';
import { HapticButton } from '../components/HapticButton';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenWrapper } from '../components/ScreenWrapper';

const { width } = Dimensions.get('window');

interface OneMinuteAllahProps {
  navigation: any;
}

type Phase = 'ayah' | 'dhikr' | 'dua' | 'complete';

const DHIKR = 'SubhanAllah · Alhamdulillah · Allahu Akbar';
const DUA = 'اللَّهُمَّ اجْعَلْنَا مِنَ الَّذِينَ يَسْتَمِعُونَ الْقَوْلَ وَيَتَّبِعُونَ أَحْسَنَهُ';
const DUA_TRANS = 'O Allah, make us of those who hear the word and follow the best of it.';

export const OneMinuteAllahScreen: React.FC<OneMinuteAllahProps> = ({ navigation }) => {
  const { incrementMilestone } = useAppStore();
  const [phase, setPhase] = useState<Phase>('ayah');
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const ayah = DAILY_AYAHS[new Date().getDay() % DAILY_AYAHS.length];

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setSeconds((s) => {
        const next = s - 1;
        if (next <= 0) {
          clearInterval(interval);
          setPhase('complete');
          incrementMilestone('sukoonCount');
          setRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        // Phase transitions
        if (next === 50) {
          setPhase('dhikr');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]).start();
        }
        if (next === 20) {
          setPhase('dua');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]).start();
        }
        return next;
      });
    }, 1000);

    Animated.timing(progressAnim, { toValue: 1, duration: 60000, useNativeDriver: false }).start();

    return () => clearInterval(interval);
  }, [running]);

  const handleStart = () => {
    setRunning(true);
    setPhase('ayah');
    setSeconds(60);
    progressAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const phaseConfig = {
    ayah: { icon: 'menu-book', label: 'Ayah (10s)', color: Colors.primary },
    dhikr: { icon: 'self-improvement', label: 'Dhikr (30s)', color: Colors.accent },
    dua: { icon: 'volunteer-activism', label: "Du'a (20s)", color: '#E57373' },
    complete: { icon: 'auto-awesome', label: 'Complete', color: Colors.primary },
  };

  const config = phaseConfig[phase];

  if (phase === 'complete') {
    return (
      <ScreenWrapper>
        <LinearGradient colors={['#0A3D2B', '#0F6D5B']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.completeContent}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 72, height: 72, borderRadius: 16, marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text style={styles.completeTitle}>SubhanAllah.</Text>
          <Text style={styles.completeSub}>You gave 1 minute entirely to Allah.</Text>
          <Text style={styles.completeSub2}>May Allah accept it from you. Ameen.</Text>
          <HapticButton onPress={handleStart} style={styles.startBtn} hapticType="medium">
            <LinearGradient colors={['#D4AF37', '#B8950A']} style={styles.startBtnGradient}>
              <Text style={styles.startBtnText}>Again</Text>
            </LinearGradient>
          </HapticButton>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A3D2B', '#0F6D5B', '#1A8A6A']} style={StyleSheet.absoluteFill} />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.header}><MaterialIcons name="auto-awesome" size={20} color={Colors.accent} />  1 Minute for Allah</Text>

        {/* Phase pills */}
        <View style={styles.phasePills}>
          {(['ayah', 'dhikr', 'dua'] as Phase[]).map((p) => (
            <View key={p} style={[styles.phasePill, phase === p && styles.phasePillActive]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name={phaseConfig[p].icon as any} size={14} color={phase === p ? '#fff' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.phasePillText, phase === p && styles.phasePillTextActive]}>
                  {phaseConfig[p].label}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Timer */}
        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>{seconds}</Text>
          <Text style={styles.timerSec}>seconds</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: config.color },
              { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>

        {/* Content */}
        {running ? (
          <Animated.View style={[styles.phaseContent, { opacity: fadeAnim }]}>
            {phase === 'ayah' && (
              <>
                <MaterialIcons name="menu-book" size={40} color="rgba(255,255,255,0.8)" />
                <Text style={styles.phaseArabic}>{ayah.arabic}</Text>
                <Text style={styles.phaseTranslation}>{ayah.translation}</Text>
                <Text style={styles.phaseRef}>{ayah.reference}</Text>
              </>
            )}
            {phase === 'dhikr' && (
              <>
                <MaterialIcons name="self-improvement" size={40} color={Colors.accent} />
                <Text style={styles.dhikrText}>SubhanAllah</Text>
                <Text style={styles.dhikrText}>Alhamdulillah</Text>
                <Text style={styles.dhikrText}>Allahu Akbar</Text>
                <Text style={styles.phaseRef}>Repeat with presence</Text>
              </>
            )}
            {phase === 'dua' && (
              <>
                <MaterialIcons name="volunteer-activism" size={40} color="#E57373" />
                <Text style={styles.phaseArabic}>{DUA}</Text>
                <Text style={styles.phaseTranslation}>{DUA_TRANS}</Text>
              </>
            )}
          </Animated.View>
        ) : (
          <View style={styles.startContent}>
            <Text style={styles.startDesc}>
              60 seconds of pure presence.{'\n'}
              Ayah · Dhikr · Du'a.{'\n'}
              All for Allah.
            </Text>
          </View>
        )}

        {!running && (
          <HapticButton onPress={handleStart} style={styles.startBtn} hapticType="heavy">
            <LinearGradient colors={['#D4AF37', '#B8950A']} style={styles.startBtnGradient}>
              <Text style={styles.startBtnText}>Begin</Text>
            </LinearGradient>
          </HapticButton>
        )}
      </View>
    </View>
);
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: 'absolute', top: 60, left: Spacing.base, zIndex: 10, padding: 8 },
  backText: { fontSize: 28, color: 'rgba(255,255,255,0.7)', fontWeight: Typography.weights.bold },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  header: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.accent, marginBottom: Spacing.xl },
  phasePills: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  phasePill: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  phasePillActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: '#fff' },
  phasePillText: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.5)' },
  phasePillTextActive: { color: '#fff', fontWeight: Typography.weights.semibold },
  timerCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  timerText: { fontSize: 44, fontWeight: Typography.weights.bold, color: '#fff' },
  timerSec: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.5)' },
  progressBg: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.xl },
  progressFill: { height: '100%', borderRadius: 2 },
  phaseContent: { alignItems: 'center', gap: Spacing.md, width: '100%' },
  phaseEmoji: { fontSize: 40 },
  phaseArabic: { fontSize: 20, color: '#fff', textAlign: 'center', lineHeight: 38 },
  phaseTranslation: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
  phaseRef: { fontSize: Typography.sizes.sm, color: Colors.accent },
  dhikrText: { fontSize: 24, color: Colors.accent, fontWeight: Typography.weights.semibold, textAlign: 'center' },
  startContent: { alignItems: 'center', marginBottom: Spacing.xl },
  startDesc: { fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 28 },
  startBtn: { width: '100%', borderRadius: BorderRadius.full, overflow: 'hidden', marginTop: Spacing.md },
  startBtnGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: BorderRadius.full },
  startBtnText: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: '#fff' },
  completeContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md },
  completeEmoji: { fontSize: 56 },
  completeTitle: { fontSize: 32, fontWeight: Typography.weights.bold, color: '#fff' },
  completeSub: { fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  completeSub2: { fontSize: Typography.sizes.md, color: Colors.accent, textAlign: 'center', fontStyle: 'italic', marginBottom: Spacing.lg },
  doneText: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.4)', paddingVertical: 8 },
});

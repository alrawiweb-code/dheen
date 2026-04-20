import React, { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, DhikrOptions } from '../theme';
import { HapticButton } from '../components/HapticButton';

const { width, height } = Dimensions.get('window');

interface BreathingDhikrProps {
  navigation: any;
}

const COUNT_OPTIONS = [33, 99, 0] as const; // 0 = continuous
const SOUND_OPTIONS = ['Rain 🌧', 'Wind 🌬', 'Silence 🔇'];

export const BreathingDhikrScreen: React.FC<BreathingDhikrProps> = ({ navigation }) => {
  const [selectedDhikr, setSelectedDhikr] = useState(0);
  const [countTarget, setCountTarget] = useState<number>(33);
  const [sound, setSound] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'inhale' | 'exhale'>('idle');
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const circleAnim = useRef(new Animated.Value(1)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const bgShift = useRef(new Animated.Value(0)).current;

  const currentDhikr = DhikrOptions[selectedDhikr];

  const soundRef = useRef<Audio.Sound | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Load/play sound when selection changes or session starts/stops
  useEffect(() => {
    const AMBIENT_SOURCES: Record<number, string | null> = {
      0: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_88447d341b.mp3', // Rain
      1: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3', // Wind
      2: null, // Silence
    };

    const loadAudio = async () => {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const uri = AMBIENT_SOURCES[sound];
      if (!started || uri === null) return; // silence or session not started

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound: audioSound } = await Audio.Sound.createAsync(
          { uri },
          { isLooping: true, shouldPlay: true }
        );
        soundRef.current = audioSound;
      } catch (e) {
        console.warn('[BreathingDhikr] Audio error:', e);
      }
    };

    loadAudio();
  }, [sound, started]);

  useEffect(() => {
    if (!started) return;

    // Animate background slowly
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgShift, { toValue: 1, duration: 6000, useNativeDriver: false }),
        Animated.timing(bgShift, { toValue: 0, duration: 6000, useNativeDriver: false }),
      ])
    ).start();

    let running = true;

    const doBreathe = async () => {
      while (running) {
        // INHALE - 3s
        setPhase('inhale');
        Animated.timing(textFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        await new Promise<void>((res) => {
          Animated.timing(circleAnim, { toValue: 1.4, duration: 3000, useNativeDriver: true }).start(() => res());
        });
        if (!running) break;

        // EXHALE - 3s
        setPhase('exhale');
        await new Promise<void>((res) => {
          Animated.timing(circleAnim, { toValue: 1, duration: 3000, useNativeDriver: true }).start(() => res());
        });
        Animated.timing(textFade, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        if (!running) break;

        setCount((c) => {
          const next = c + 1;
          if ((next % 33 === 0 || next % 99 === 0)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          if (countTarget > 0 && next >= countTarget) {
            running = false;
            setCompleted(true);
            setStarted(false);
          }
          return next;
        });
      }
    };

    doBreathe();

    return () => { running = false; };
  }, [started]);

  const handleStart = () => {
    setCount(0);
    setCompleted(false);
    setStarted(true);
  };

  const handleStop = () => {
    setStarted(false);
    setPhase('idle');
    Animated.timing(circleAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    bgShift.stopAnimation();
  };

  if (completed) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0D1F1A', '#0F6D5B']} style={StyleSheet.absoluteFill} />
        <View style={styles.completionContent}>
          <Text style={styles.completionEmoji}>📿</Text>
          <Text style={styles.completionCount}>{count}</Text>
          <Text style={styles.completionDhikr}>{currentDhikr.transliteration}</Text>
          <Text style={styles.completionArabic}>{currentDhikr.arabic}</Text>
          <Text style={styles.completionMsg}>
            May every remembrance bring you closer to Allah.
          </Text>
          <LinearGradient colors={['#D4AF37', '#B8950A']} style={styles.completionDua}>
            <Text style={styles.completionDuaText}>سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ</Text>
            <Text style={styles.completionDuaTrans}>Glory be to You, O Allah, and all praise.</Text>
          </LinearGradient>
          <HapticButton onPress={() => { setCompleted(false); setCount(0); }} style={styles.restartBtn} hapticType="medium">
            <Text style={styles.restartBtnText}>Begin Again</Text>
          </HapticButton>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#0D1F1A', '#0F3D2B', '#0D6B50']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Dhikr Selector */}
        {!started && (
          <View style={styles.selectorSection}>
            <Text style={styles.sectionLabel}>Choose Dhikr</Text>
            {DhikrOptions.map((d, i) => (
              <TouchableOpacity
                key={d.transliteration}
                onPress={() => setSelectedDhikr(i)}
                style={[styles.dhikrOption, selectedDhikr === i && styles.dhikrOptionSelected]}
              >
                <Text style={[styles.dhikrOptionArabic, selectedDhikr === i && { color: Colors.primary }]}>
                  {d.arabic}
                </Text>
                <Text style={[styles.dhikrOptionTranslit, selectedDhikr === i && { color: Colors.primary }]}>
                  {d.transliteration}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>Count</Text>
            <View style={styles.countRow}>
              {COUNT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setCountTarget(opt)}
                  style={[styles.countChip, countTarget === opt && styles.countChipSelected]}
                >
                  <Text style={[styles.countChipText, countTarget === opt && { color: Colors.primary }]}>
                    {opt === 0 ? '∞' : opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>Ambient Sound</Text>
            <View style={styles.countRow}>
              {SOUND_OPTIONS.map((s, i) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSound(i)}
                  style={[styles.countChip, sound === i && styles.countChipSelected]}
                >
                  <Text style={[styles.countChipText, sound === i && { color: Colors.primary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Breathing circle */}
        {started && (
          <View style={styles.breathingSection}>
            <Text style={styles.breathPhase}>
              {phase === 'inhale' ? 'Breathe in...' : phase === 'exhale' ? 'Breathe out...' : ''}
            </Text>

            <View style={styles.circleContainer}>
              {/* Outer rings */}
              {[1.8, 1.6, 1.4].map((scale, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.ringOuter,
                    {
                      opacity: 0.08 + i * 0.04,
                      transform: [{ scale: circleAnim.interpolate({ inputRange: [1, 1.4], outputRange: [scale - 0.2, scale] }) }],
                    },
                  ]}
                />
              ))}

              <Animated.View style={[styles.mainCircle, { transform: [{ scale: circleAnim }] }]}>
                <Animated.Text style={[styles.dhikrArabic, { opacity: textFade }]}>
                  {currentDhikr.arabic}
                </Animated.Text>
                <Text style={styles.dhikrTranslit}>{currentDhikr.transliteration}</Text>
              </Animated.View>
            </View>

            <Text style={styles.countDisplay}>{count}</Text>
            <Text style={styles.countLabel}>
              {countTarget > 0 ? `of ${countTarget}` : 'continuous'}
            </Text>
          </View>
        )}

        {/* Start / Stop */}
        {!started ? (
          <HapticButton onPress={handleStart} style={styles.startBtn} hapticType="heavy">
            <LinearGradient colors={['#0F6D5B', '#0A4A3A']} style={styles.startBtnGradient}>
              <Text style={styles.startBtnText}>Begin Dhikr</Text>
            </LinearGradient>
          </HapticButton>
        ) : (
          <TouchableOpacity onPress={handleStop} style={styles.stopBtn}>
            <Text style={styles.stopBtnText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F1A' },
  backBtn: { position: 'absolute', top: 60, left: Spacing.base, zIndex: 10, padding: 8 },
  backText: { fontSize: 28, color: 'rgba(255,255,255,0.7)', fontWeight: Typography.weights.bold },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingTop: 60 },

  selectorSection: { width: '100%', gap: 6 },
  sectionLabel: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 4 },
  dhikrOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 4,
  },
  dhikrOptionSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(15,109,91,0.15)' },
  dhikrOptionArabic: { fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  dhikrOptionTranslit: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  countRow: { flexDirection: 'row', gap: Spacing.sm },
  countChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  countChipSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(15,109,91,0.2)' },
  countChipText: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.6)' },

  breathingSection: { alignItems: 'center', width: '100%' },
  breathPhase: { fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginBottom: Spacing.xl },
  circleContainer: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  ringOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  mainCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(15,109,91,0.3)',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dhikrArabic: { fontSize: 18, color: '#fff', textAlign: 'center' },
  dhikrTranslit: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  countDisplay: { fontSize: 56, fontWeight: Typography.weights.bold, color: '#fff' },
  countLabel: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.4)', marginBottom: Spacing.xl },

  startBtn: { width: '100%', marginTop: Spacing.xl, borderRadius: BorderRadius.full, overflow: 'hidden' },
  startBtnGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: BorderRadius.full },
  startBtnText: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: '#fff' },
  stopBtn: { marginTop: Spacing.xl, paddingVertical: 14, paddingHorizontal: Spacing['3xl'] },
  stopBtnText: { fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },

  completionContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  completionEmoji: { fontSize: 56, marginBottom: Spacing.md },
  completionCount: { fontSize: 64, fontWeight: Typography.weights.bold, color: '#fff' },
  completionDhikr: { fontSize: Typography.sizes.xl, color: Colors.accent, fontWeight: Typography.weights.semibold, marginBottom: 4 },
  completionArabic: { fontSize: 22, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.xl },
  completionMsg: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontStyle: 'italic', marginBottom: Spacing.xl },
  completionDua: { borderRadius: BorderRadius.xl, padding: Spacing.base, alignItems: 'center', marginBottom: Spacing.xl, width: '100%' },
  completionDuaText: { fontSize: 18, color: '#fff', textAlign: 'center', marginBottom: 6 },
  completionDuaTrans: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  restartBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing['3xl'], paddingVertical: 14, marginBottom: Spacing.md },
  restartBtnText: { fontSize: Typography.sizes.lg, color: Colors.primary, fontWeight: Typography.weights.semibold },
  doneText: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 8 },
});

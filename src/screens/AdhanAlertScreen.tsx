import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { HapticButton } from '../components/HapticButton';
import { playAdhan, stopAdhan } from '../services/adhanManager';

const { width, height } = Dimensions.get('window');

type PrayerKey = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

interface AdhanAlertProps {
  prayer: PrayerKey;
  time: string;
  onPrayed: () => void;
  onDismiss: () => void;
}

const PRAYER_GRADIENTS: Record<PrayerKey, readonly [string, string, string]> = {
  Fajr: ['#0A0E2A', '#1A2744', '#3A5A8A'],
  Dhuhr: ['#1A3A2A', '#2A6A4A', '#4A9A6A'],
  Asr: ['#2A1A0A', '#6A4A1A', '#AA7A3A'],
  Maghrib: ['#2A0A0A', '#7A3A2A', '#BA6A4A'],
  Isha: ['#0A1F14', '#0D2B1F', '#0F3D29'],
};

const PRAYER_DESCRIPTIONS: Record<PrayerKey, { icon: string; arabic: string; illustration: string }> = {
  Fajr: { icon: 'nightlight-round', arabic: 'الفجر', illustration: 'wb-twilight' },
  Dhuhr: { icon: 'wb-sunny', arabic: 'الظهر', illustration: 'wb-sunny' },
  Asr: { icon: 'wb-cloudy', arabic: 'العصر', illustration: 'wb-cloudy' },
  Maghrib: { icon: 'wb-twilight', arabic: 'المغرب', illustration: 'nights-stay' },
  Isha: { icon: 'nightlight-round', arabic: 'العشاء', illustration: 'dark-mode' },
};

export const AdhanAlertScreen = ({ route, navigation }: any) => {
  const { prayer, time } = route.params || { prayer: 'Fajr', time: '05:00 AM' };
  const fadeIn = useRef(new Animated.Value(0)).current;
  const crescentScale = useRef(new Animated.Value(0.5)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const wave1 = useRef(new Animated.Value(0.3)).current;
  const wave2 = useRef(new Animated.Value(0.7)).current;
  const wave3 = useRef(new Animated.Value(0.5)).current;
  const wave4 = useRef(new Animated.Value(0.9)).current;
  const wave5 = useRef(new Animated.Value(0.4)).current;

  const { adhanSettings, setPrayerStatus } = useAppStore();
  const fajrPhrase = prayer === 'Fajr' && adhanSettings.prayers.Fajr.fajrPhrase;

  const currentPrayer = (prayer as PrayerKey) || 'Fajr';
  const gradColors = PRAYER_GRADIENTS[currentPrayer];
  const prayerInfo = PRAYER_DESCRIPTIONS[currentPrayer];

  useEffect(() => {
    // Play Adhan
    playAdhan(adhanSettings.prayers[prayer as PrayerKey]?.voice || 'makkah');

    // Fire haptics
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 700);

    // Fade in the entire screen
    Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.spring(crescentScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true, delay: 400 }).start();

    // Concentric rings
    const pulseRing = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    };
    pulseRing(ring1, 0);
    pulseRing(ring2, 700);
    pulseRing(ring3, 1400);

    // Waveform animation
    const animateWave = (anim: Animated.Value, min: number, max: number, speed: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: max, duration: speed, useNativeDriver: true }),
          Animated.timing(anim, { toValue: min, duration: speed, useNativeDriver: true }),
        ])
      ).start();
    };
    animateWave(wave1, 0.3, 1, 400);
    animateWave(wave2, 0.4, 0.9, 350);
    animateWave(wave3, 0.5, 1, 300);
    animateWave(wave4, 0.2, 0.8, 450);
    animateWave(wave5, 0.4, 1, 380);
  }, []);

  const handlePrayed = async () => {
    setPrayerStatus(prayer as PrayerKey, 'done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await stopAdhan();
    navigation.goBack();
  };

  const handleDismiss = async () => {
    await stopAdhan();
    navigation.goBack();
  };

  const handleSnooze = async () => {
    await stopAdhan();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${prayer} Prayer Reminder`,
        body: `Your snoozed ${prayer} prayer reminder`,
        data: { intent: 'play_adhan', prayer, voiceKey: adhanSettings.prayers[prayer as PrayerKey]?.voice || 'makkah', alertType: 'beep' },
      },
      trigger: { seconds: 300 } as any, // 5 minutes
    });
    navigation.goBack();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[...gradColors]} style={StyleSheet.absoluteFill} />

      {/* Illustration */}
      <View style={styles.illustration}>
        <MaterialIcons name={prayerInfo.illustration as any} size={48} color="rgba(255,255,255,0.5)" />
      </View>

      {/* Concentric rings */}
      <View style={styles.ringsContainer}>
        {[ring1, ring2, ring3].map((ring, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                width: 80 + i * 70,
                height: 80 + i * 70,
                borderRadius: (80 + i * 70) / 2,
                opacity: ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.3, 0] }),
                transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5 + i * 0.3] }) }],
              },
            ]}
          />
        ))}
        {/* Logo center */}
        <Animated.View style={{ transform: [{ scale: crescentScale }] }}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 64, height: 64, borderRadius: 12 }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Text Content */}
      <View style={styles.textContent}>
        <MaterialIcons name={prayerInfo.icon as any} size={32} color="rgba(255,255,255,0.8)" style={{ marginBottom: Spacing.sm }} />
        <Text style={styles.prayerName}>{prayer}</Text>
        <Text style={styles.prayerArabic}>{prayerInfo.arabic}</Text>

        {fajrPhrase && (
          <View style={styles.fajrPhraseBox}>
            <Text style={styles.fajrPhrase}>As-salatu khayrun mina-n-nawm</Text>
            <Text style={styles.fajrPhraseTranslation}>Prayer is better than sleep</Text>
          </View>
        )}

        <Text style={styles.itsTime}>It is time for Salah</Text>
        <Text style={styles.prayerTime}>{time}</Text>
      </View>

      {/* Waveform */}
      <View style={styles.waveform}>
        {[wave1, wave2, wave3, wave4, wave5].map((w, i) => (
          <Animated.View
            key={i}
            style={[styles.waveBar, { transform: [{ scaleY: w }] }]}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleSnooze}>
          <Text style={styles.snoozeText}>Remind me in 5 min</Text>
        </TouchableOpacity>

        <HapticButton onPress={handlePrayed} style={styles.prayedBtn} hapticType="heavy">
          <LinearGradient colors={['#0F6D5B', '#0A4A3A']} style={styles.prayedBtnGradient}>
            <Text style={styles.prayedBtnText}>Mark as Prayed</Text>
          </LinearGradient>
        </HapticButton>

        <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Stop & Dismiss</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  illustration: { position: 'absolute', top: 100, alignItems: 'center', justifyContent: 'center' },
  ringsContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['4xl'],
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  crescent: {},
  textContent: { alignItems: 'center', marginTop: Spacing.xl },
  prayerEmoji: { fontSize: 32, marginBottom: Spacing.sm },
  prayerName: { fontSize: 32, fontWeight: Typography.weights.bold, color: '#fff', letterSpacing: 1 },
  prayerArabic: { fontSize: 24, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: Typography.weights.medium },
  fajrPhraseBox: { marginTop: Spacing.md, alignItems: 'center' },
  fajrPhrase: { fontStyle: 'italic', color: Colors.accent, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  fajrPhraseTranslation: { fontSize: Typography.sizes.sm, color: 'rgba(212,175,55,0.7)', marginTop: 2 },
  itsTime: { fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', marginTop: Spacing.md },
  prayerTime: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
  },
  waveBar: { width: 5, height: 30, backgroundColor: Colors.primary, borderRadius: 3 },
  actions: { width: '100%', paddingHorizontal: Spacing.xl, paddingBottom: 50, gap: Spacing.sm },
  snoozeText: { textAlign: 'center', fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.5)', textDecorationLine: 'underline', marginBottom: Spacing.sm },
  prayedBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  prayedBtnGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: BorderRadius.lg },
  prayedBtnText: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: '#fff' },
  dismissBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  dismissText: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.5)' },
});

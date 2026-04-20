import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows, PrayerGradients, PrayerIcons, NiyyahPresets } from '../theme';
import { DAILY_AYAHS } from '../services/quranApi';
import { HijriDateBadge } from '../components/HijriDateBadge';
import { HapticButton } from '../components/HapticButton';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { formatTime, getNextPrayer, getCurrentPrayerGradient, FALLBACK_TIMES, FALLBACK_HIJRI, fetchPrayerTimes, getTimeUntil } from '../services/prayerTimes';
import { refreshDeviceCoordinates } from '../services/locationManager';

const { width } = Dimensions.get('window');

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { profile, prayerStatuses, setPrayerStatus, todayNiyyah, adhanSettings, lastPrayerResetDate, resetDailyPrayers, incrementMilestone, resetNiyyahIfNewDay } = useAppStore();
  const [prayerTimes, setPrayerTimes] = useState(FALLBACK_TIMES);
  const [hijri, setHijri] = useState(FALLBACK_HIJRI);
  const [showNiyyah, setShowNiyyah] = useState(false);
  const [niyyahText, setNiyyahText] = useState('');
  const [moodPromptPrayer, setMoodPromptPrayer] = useState<string | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);
  const [dailyAyah] = useState(() => DAILY_AYAHS[new Date().getDay() % DAILY_AYAHS.length]);
  const [countdownStr, setCountdownStr] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12
      ? `Assalamu alaikum, ${profile.name} 🌤️`
      : hour < 18
      ? `Wa alaykum as-salam, ${profile.name} ☀️`
      : `Assalamu alaikum, ${profile.name} 🌙`;

  const gradientName = getCurrentPrayerGradient(prayerTimes);
  const gradientColors = PrayerGradients[gradientName as keyof typeof PrayerGradients] ?? PrayerGradients.default;
  const nextPrayer = getNextPrayer(prayerTimes);

  // Effect 1: Animations + live prayer times fetch (runs only on location change)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();

    const initLivePrayers = async () => {
      if (profile.autoLocation) {
        await refreshDeviceCoordinates();
      }
      const lat = useAppStore.getState().profile.latitude || 25.2048;
      const lng = useAppStore.getState().profile.longitude || 55.2708;
      const data = await fetchPrayerTimes(lat, lng);
      setPrayerTimes(data.times);
      setHijri(data.hijri);
      setIsOfflineMode(!!data.isOfflineFallback);
    };

    initLivePrayers();
  }, [profile.autoLocation]);

  // Effect 2: Daily reset check — runs once on mount only
  useEffect(() => {
    if (lastPrayerResetDate !== new Date().toDateString()) {
      resetDailyPrayers();
    }
    // Reset niyyah if it's from a previous day
    resetNiyyahIfNewDay();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Ticker for next prayer
    const updateTick = () => {
      if (nextPrayer) {
        setCountdownStr(`${getTimeUntil(nextPrayer.nextTime)} away`);
      }
    };
    updateTick();
    const interval = setInterval(updateTick, 60000);
    return () => clearInterval(interval);
  }, [nextPrayer]);

  const handlePrayerDone = (prayer: typeof PRAYERS[number]) => {
    setPrayerStatus(prayer, 'done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMoodPromptPrayer(prayer);

    // Increment milestone counters
    if (prayer === 'Fajr') {
      incrementMilestone('fajrCount');
    }

    // Check if all done
    const updated = { ...prayerStatuses, [prayer]: 'done' };
    if (Object.values(updated).every((s) => s === 'done')) {
      incrementMilestone('streakDays');
      setTimeout(() => {
        setShowAllDone(true);
        setTimeout(() => setShowAllDone(false), 3000);
      }, 500);
    }
  };

  // Status to color
  const statusColor = (s: string) =>
    s === 'done' ? Colors.prayerDone : s === 'missed' ? Colors.prayerMissed : Colors.prayerPending;

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const donePrayers = Object.values(prayerStatuses).filter((s) => s === 'done').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={gradientColors as any} style={StyleSheet.absoluteFill} />

      {/* All Done Banner */}
      {showAllDone && (
        <Animated.View style={styles.allDoneBanner}>
          <LinearGradient colors={['#0F6D5B', '#1A8A6A']} style={styles.allDoneGradient}>
            <Text style={styles.allDoneText}>🕌 All prayers complete. Alhamdulillah.</Text>
          </LinearGradient>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Offline Warning Banner */}
        {isOfflineMode && (
          <View style={{ backgroundColor: 'rgba(255, 100, 100, 0.2)', padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="wifi-off" size={20} color="#ffcccc" style={{ marginRight: 8 }} />
            <Text style={{ color: '#ffcccc', fontSize: 13, fontFamily: 'Plus Jakarta Sans', flex: 1 }}>
              Network offline. Showing estimated local prayer times.
            </Text>
          </View>
        )}

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View style={styles.profileRow}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.name?.[0]?.toUpperCase() ?? 'A'}
                </Text>
              </View>
            </View>
            <View style={styles.nameBlock}>
              <Text style={styles.greetingText} numberOfLines={1}>{greeting}</Text>
              <Text style={styles.timeText}>{timeStr}</Text>
            </View>
          </View>
          <HijriDateBadge hijri={hijri} />
        </Animated.View>

        {/* Niyyah Strip */}
        <HapticButton onPress={() => navigation.navigate('SetNiyyah')} style={styles.niyyahStrip}>
          <View style={styles.niyyahContainer}>
            <View style={styles.niyyahIconBg}>
              <Text style={styles.niyyahIcon}>📝</Text>
            </View>
            <Text style={styles.niyyahText}>
              {todayNiyyah || 'Set your intention for today'}
            </Text>
            <Text style={styles.niyyahArrow}>❯</Text>
          </View>
        </HapticButton>

        {/* Next Prayer Card */}
        <Animated.View style={[styles.nextPrayerCard, { transform: [{ translateY: cardSlide }], opacity: headerFade }]}>
          <LinearGradient
            colors={['#0F6D5B', '#114a3e']}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['transparent', 'rgba(15,109,91,0.2)', 'rgba(15,109,91,0.8)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.nextPrayerContentRow}>
            <BlurView intensity={20} tint="light" style={styles.nextPrayerGlass}>
              <View>
                <Text style={styles.nextPrayerLabel}>NEXT PRAYER</Text>
                <Text style={styles.nextPrayerName}>{nextPrayer.next}</Text>
                <Text style={styles.nextPrayerTime}>
                  {formatTime(nextPrayer.nextTime)} · {countdownStr}
                </Text>
              </View>
              <HapticButton
                onPress={() => navigation.navigate('AdhanSettings')}
                style={styles.setReminderBtn}
              >
                <Text style={styles.setReminderText}>Set Reminder</Text>
              </HapticButton>
            </BlurView>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: '📖', label: 'Quran', screen: 'Root', params: { screen: 'QuranTab' } },
            { icon: '🤲', label: 'Duas', screen: 'Root', params: { screen: 'DuasTab' } },
            { icon: '🧭', label: 'Qibla', screen: 'Qibla' },
            { icon: '📿', label: 'Dhikr', screen: 'Dhikr' },
          ].map((a) => (
            <HapticButton
              key={a.label}
              onPress={() => {
                if (a.params) {
                  navigation.navigate(a.screen as any, a.params);
                } else {
                  navigation.navigate(a.screen as any);
                }
              }}
              style={styles.quickActionItem}
            >
              <BlurView intensity={25} tint="light" style={styles.quickActionInner}>
                <Text style={styles.quickActionIcon}>{a.icon}</Text>
                <Text style={styles.quickActionLabel}>{a.label}</Text>
              </BlurView>
            </HapticButton>
          ))}
        </View>

        {/* Habit Tracker */}
        <BlurView intensity={30} tint="light" style={styles.habitCard}>
          <Text style={styles.sectionTitle}>Today's Salah</Text>
          <View style={styles.habitRow}>
            {PRAYERS.map((p) => {
              const status = prayerStatuses[p];
              return (
                <HapticButton
                  key={p}
                  onPress={() => handlePrayerDone(p)}
                  style={styles.habitItem}
                  hapticType="medium"
                >
                  <View
                    style={[
                      styles.habitCircle,
                      { borderColor: statusColor(status), backgroundColor: status === 'done' ? Colors.prayerDone : 'transparent' },
                    ]}
                  >
                    {status === 'done' ? (
                      <Text style={styles.habitCheck}>✓</Text>
                    ) : (
                      <Text style={styles.habitIcon}>{PrayerIcons[p.toLowerCase() as keyof typeof PrayerIcons]}</Text>
                    )}
                  </View>
                  <Text style={styles.habitLabel}>{p.substring(0, 3)}</Text>
                </HapticButton>
              );
            })}
          </View>
          <Text style={styles.motivationText}>
            {donePrayers === 0
              ? 'Begin your day with Fajr. 🌙'
              : donePrayers < 3
              ? `${donePrayers} of 5 done. Keep going! 💪`
              : donePrayers < 5
              ? `More than halfway there today. ✨`
              : 'All prayers complete. Alhamdulillah. 🤲'}
          </Text>
        </BlurView>

        {/* 1 Minute for Allah */}
        <HapticButton
          onPress={() => navigation.navigate('OneMinute')}
          style={styles.oneMinuteBtn}
          hapticType="medium"
        >
          <LinearGradient colors={['#D4AF37', '#B8950A']} style={styles.oneMinuteGradient}>
            <Text style={styles.oneMinuteText}>✦  1 Minute for Allah</Text>
          </LinearGradient>
        </HapticButton>

        {/* Daily Ayah */}
        <BlurView intensity={30} tint="light" style={styles.ayahCard}>
          <Text style={styles.ayahArabic}>{dailyAyah.arabic}</Text>
          <Text style={styles.ayahTranslation}>{dailyAyah.translation}</Text>
          <Text style={styles.ayahReference}>{dailyAyah.reference}</Text>
        </BlurView>

        {/* Prayer Times List */}
        <BlurView intensity={25} tint="light" style={styles.prayerListCard}>
          <Text style={styles.sectionTitle}>Prayer Times</Text>
          {PRAYERS.map((p) => {
            const timeKey = p as keyof typeof prayerTimes;
            const time = prayerTimes[timeKey] as string;
            const isNext = nextPrayer.next === p;
            const bellOn = adhanSettings.prayers[p]?.enabled && adhanSettings.masterEnabled;
            return (
              <View
                key={p}
                style={[
                  styles.prayerRow,
                  isNext && styles.prayerRowActive,
                ]}
              >
                <Text style={styles.prayerRowIcon}>{PrayerIcons[p.toLowerCase() as keyof typeof PrayerIcons]}</Text>
                <Text style={[styles.prayerRowName, isNext && { color: Colors.primary, fontWeight: Typography.weights.bold }]}>{p}</Text>
                <Text style={[styles.prayerRowTime, isNext && { color: Colors.primary }]}>{formatTime(time)}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AdhanSettings')}
                  style={styles.bellBtn}
                >
                  <Text style={{ fontSize: 18, opacity: bellOn ? 1 : 0.4 }}>
                    {bellOn ? '🔔' : '🔕'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </BlurView>

        <View style={{ height: 100 }} />
      </ScrollView>
      {/* Mood Prompt Modal */}
      <Modal visible={!!moodPromptPrayer} transparent animationType="slide" onRequestClose={() => setMoodPromptPrayer(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMoodPromptPrayer(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { width: '100%', paddingBottom: 40, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <Text style={styles.modalTitle}>How did {moodPromptPrayer} feel?</Text>
            <Text style={styles.modalSub}>Reflecting on your salah brings you closer to the present.</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginVertical: 20 }}>
              {[
                { key: 'connected', label: 'Connected', icon: '✨' },
                { key: 'present', label: 'Present', icon: '🍃' },
                { key: 'distracted', label: 'Distracted', icon: '🌪️' },
                { key: 'rushed', label: 'Rushed', icon: '⏱️' },
                { key: 'emotional', label: 'Emotional', icon: '💧' },
              ].map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={styles.moodBtn}
                  onPress={() => {
                    if (moodPromptPrayer) {
                      useAppStore.getState().setPrayerMood(moodPromptPrayer as any, m.key as any);
                    }
                    setMoodPromptPrayer(null);
                  }}
                >
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>{m.icon}</Text>
                  <Text style={{ fontSize: 12, color: Colors.textDark, fontWeight: '600' }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => setMoodPromptPrayer(null)}>
              <Text style={{ color: Colors.textLight, fontSize: 14 }}>Skip</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  moodBtn: {
    padding: 15,
    backgroundColor: 'rgba(15,109,91,0.05)',
    borderRadius: 16,
    alignItems: 'center',
    width: '30%',
    borderWidth: 1,
    borderColor: 'rgba(15,109,91,0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  modalSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingTop: 60, paddingHorizontal: Spacing.base },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
    paddingTop: 10,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, color: '#fff', fontWeight: Typography.weights.bold },
  nameBlock: { flex: 1 },
  greetingText: { fontSize: Typography.sizes.md, color: '#fff', fontWeight: Typography.weights.semibold },
  timeText: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  niyyahStrip: { marginBottom: Spacing.base },
  niyyahContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(15,109,91,0.05)',
  },
  niyyahIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15,109,91,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  niyyahIcon: { fontSize: 16 },
  niyyahText: { flex: 1, fontSize: Typography.sizes.md, color: Colors.primary, fontWeight: Typography.weights.semibold },
  niyyahArrow: { fontSize: 16, color: Colors.primary },

  nextPrayerCard: { height: 256, borderRadius: 24, overflow: 'hidden', marginBottom: Spacing.base, ...Shadows.lg, justifyContent: 'flex-end', padding: Spacing.base },
  nextPrayerContentRow: { zIndex: 10 },
  nextPrayerGlass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  nextPrayerLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 2, fontWeight: '700' },
  nextPrayerName: { fontFamily: 'Plus Jakarta Sans', fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 2 },
  nextPrayerTime: { fontFamily: 'Plus Jakarta Sans', fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.8)' },
  setReminderBtn: {
    backgroundColor: '#735C00', // secondary
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    ...Shadows.gold,
  },
  setReminderText: { fontSize: 12, color: '#fff', fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },

  quickActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  quickActionItem: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  quickActionInner: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  quickActionIcon: { fontSize: 24, marginBottom: 4 },
  quickActionLabel: { fontSize: Typography.sizes.xs, color: Colors.textDark, fontWeight: Typography.weights.semibold },

  habitCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textDark, marginBottom: Spacing.md },
  habitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  habitItem: { alignItems: 'center', gap: 6 },
  habitCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitCheck: { fontSize: 20, color: '#fff', fontWeight: Typography.weights.bold },
  habitIcon: { fontSize: 20 },
  habitLabel: { fontSize: 10, color: Colors.textLight, fontWeight: Typography.weights.medium },
  motivationText: { fontSize: Typography.sizes.sm, color: Colors.textLight, textAlign: 'center', marginTop: 4 },

  oneMinuteBtn: { marginBottom: Spacing.base, borderRadius: BorderRadius.full, overflow: 'hidden' },
  oneMinuteGradient: { paddingVertical: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.full },
  oneMinuteText: { fontSize: Typography.sizes.lg, color: '#fff', fontWeight: Typography.weights.bold, letterSpacing: 0.5 },

  ayahCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'flex-end',
  },
  ayahArabic: {
    fontSize: 20,
    color: Colors.primary,
    textAlign: 'right',
    lineHeight: 36,
    marginBottom: Spacing.sm,
    fontWeight: Typography.weights.semibold,
  },
  ayahTranslation: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'left',
    alignSelf: 'stretch',
    lineHeight: 22,
    marginBottom: 6,
  },
  ayahReference: { fontSize: Typography.sizes.xs, color: Colors.accent, alignSelf: 'flex-start' },

  prayerListCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
  },
  prayerRowActive: {
    backgroundColor: 'rgba(15,109,91,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  prayerRowIcon: { fontSize: 16 },
  prayerRowName: { flex: 1, fontSize: Typography.sizes.md, color: Colors.textDark, fontWeight: Typography.weights.medium },
  prayerRowTime: { fontSize: Typography.sizes.md, color: Colors.textLight },
  bellBtn: { padding: 4 },

  allDoneBanner: {
    position: 'absolute',
    top: 100,
    left: Spacing.base,
    right: Spacing.base,
    zIndex: 100,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.green,
  },
  allDoneGradient: { padding: Spacing.base },
  allDoneText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, textAlign: 'center' },
});

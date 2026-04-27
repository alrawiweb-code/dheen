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
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ScreenWrapper } from '../components/ScreenWrapper';
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
  const profile = useAppStore(state => state.profile);
  const prayerStatuses = useAppStore(state => state.prayerStatuses);
  const setPrayerStatus = useAppStore(state => state.setPrayerStatus);
  const todayNiyyah = useAppStore(state => state.todayNiyyah);
  const adhanSettings = useAppStore(state => state.adhanSettings);
  const lastPrayerResetDate = useAppStore(state => state.lastPrayerResetDate);
  const resetDailyPrayers = useAppStore(state => state.resetDailyPrayers);
  const resetNiyyahIfNewDay = useAppStore(state => state.resetNiyyahIfNewDay);
  const [prayerTimes, setPrayerTimes] = useState(FALLBACK_TIMES);
  const [hijri, setHijri] = useState(FALLBACK_HIJRI);
  const [moodPromptPrayer, setMoodPromptPrayer] = useState<string | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);
  const [dailyAyah] = useState(() => DAILY_AYAHS[new Date().getDay() % DAILY_AYAHS.length]);
  const [countdownStr, setCountdownStr] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

  const now = new Date();
  const hour = now.getHours();
  const greetingIcon = hour < 12 ? 'wb-twilight' : hour < 18 ? 'wb-sunny' : 'nightlight-round';
  const greeting = profile?.name ? `السلام عليكم، ${profile.name}` : 'السلام عليكم';

  const gradientName = getCurrentPrayerGradient(prayerTimes);
  const gradientColors = PrayerGradients[gradientName as keyof typeof PrayerGradients] ?? PrayerGradients.default;
  const nextPrayer = getNextPrayer(prayerTimes);

  // Effect 1: Animations + live prayer times fetch (runs only on location change)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();

    let isMounted = true;
    const initLivePrayers = async () => {
      try {
        if (profile.autoLocation) {
          await refreshDeviceCoordinates();
        }
        const lat = useAppStore.getState().profile.latitude || 25.2048;
        const lng = useAppStore.getState().profile.longitude || 55.2708;
        const data = await fetchPrayerTimes(lat, lng);
        if (isMounted) {
          setPrayerTimes(data.times);
          setHijri(data.hijri);
          setIsOfflineMode(!!data.isOfflineFallback);
        }
      } catch (e) {
        console.log('Failed to init live prayers:', e);
      }
    };

    initLivePrayers();
    return () => { isMounted = false; };
  }, [profile.autoLocation]);

  // Effect 2: Daily reset check — runs once on mount only
  useEffect(() => {
    if (lastPrayerResetDate !== new Date().toDateString()) {
      resetDailyPrayers();
    }
    // Reset niyyah if it's from a previous day
    resetNiyyahIfNewDay();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nextTimeStr = nextPrayer?.nextTime;
  
  useEffect(() => {
    // Ticker for next prayer
    const updateTick = () => {
      if (nextTimeStr) {
        setCountdownStr(`${getTimeUntil(nextTimeStr)} away`);
      }
    };
    updateTick();
    const interval = setInterval(updateTick, 60000);
    return () => clearInterval(interval);
  }, [nextTimeStr]);

  const handlePrayerDone = (prayer: typeof PRAYERS[number]) => {
    // If already done — undo it
    if (prayerStatuses[prayer] === 'done') {
      setPrayerStatus(prayer, 'pending');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    // Mark as done
    setPrayerStatus(prayer, 'done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMoodPromptPrayer(prayer);

    const updated = { ...prayerStatuses, [prayer]: 'done' };
    if (Object.values(updated).every((s) => s === 'done')) {
      setTimeout(() => {
        setShowAllDone(true);
        setTimeout(() => setShowAllDone(false), 3000);
      }, 500);
    }
  };

  // Status to color
  const getStatusColor = (s: string, p: string) =>
    s === 'done' ? '#0F5132' : p === nextPrayer.next ? '#E6C068' : '#E5E7EB';

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const donePrayers = Object.values(prayerStatuses).filter((s) => s === 'done').length;

  const isPrayerUnlocked = (prayer: typeof PRAYERS[number]): boolean => {
    const timeStr = prayerTimes[prayer as keyof typeof prayerTimes] as string;
    if (!timeStr) return prayer === 'Fajr';

    const now = new Date();
    const prayerDate = new Date();

    const match12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    const match24 = timeStr.match(/^(\d+):(\d+)$/);

    if (match12) {
      let hours = parseInt(match12[1]);
      const minutes = parseInt(match12[2]);
      const meridiem = match12[3].toUpperCase();
      if (meridiem === 'AM' && hours === 12) hours = 0;
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      prayerDate.setHours(hours, minutes, 0, 0);
    } else if (match24) {
      prayerDate.setHours(parseInt(match24[1]), parseInt(match24[2]), 0, 0);
    } else {
      return prayer === 'Fajr';
    }

    return now >= prayerDate;
  };

  return (
    <ScreenWrapper
      scrollable
      noHorizontalPadding
      contentContainerStyle={styles.content}
      fixedContent={
        <>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          {/* All Done Banner */}
          {showAllDone && (
            <Animated.View style={styles.allDoneBanner}>
              <LinearGradient colors={['#0F6D5B', '#1A8A6A']} style={styles.allDoneGradient}>
                <Text style={styles.allDoneText}><MaterialIcons name="mosque" size={18} color="#fff" />  All prayers complete. Alhamdulillah.</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Mood Prompt Modal — outside scroll view */}
          <Modal visible={!!moodPromptPrayer} transparent animationType="slide" onRequestClose={() => setMoodPromptPrayer(null)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMoodPromptPrayer(null)}>
              <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { width: '100%', paddingBottom: 40, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
                <Text style={styles.modalTitle}>How did {moodPromptPrayer} feel?</Text>
                <Text style={styles.modalSub}>Reflecting on your salah brings you closer to the present.</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginVertical: 20 }}>
                  {[
                    { key: 'connected', label: 'Connected', icon: 'auto-awesome' },
                    { key: 'present', label: 'Present', icon: 'spa' },
                    { key: 'distracted', label: 'Distracted', icon: 'cloud' },
                    { key: 'rushed', label: 'Rushed', icon: 'bolt' },
                    { key: 'emotional', label: 'Emotional', icon: 'water-drop' },
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
                      <MaterialIcons name={m.icon as any} size={24} color={Colors.primary} style={{ marginBottom: 4 }} />
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
        </>
      }
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
            <View style={styles.nameBlock}>
              <Text style={styles.greetingText} numberOfLines={1}>{greeting} <MaterialIcons name={greetingIcon as any} size={16} color="#1F3D2B" /></Text>
              <Text style={styles.timeText}>{timeStr}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <HijriDateBadge hijri={hijri} />
          </View>
        </Animated.View>

        {/* Intention Card */}
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={() => navigation.navigate('SetNiyyah')} 
          style={styles.intentionCard}
        >
          <View style={styles.intentionIconBox}>
            <MaterialIcons name="auto-awesome" size={20} color="#C9A23F" />
          </View>
          <View style={styles.intentionTextContainer}>
            {todayNiyyah ? (
              <>
                <Text style={styles.intentionTitle}>Your intention today:</Text>
                <Text style={styles.intentionSubtitle} numberOfLines={1}>"{todayNiyyah}"</Text>
              </>
            ) : (
              <>
                <Text style={styles.intentionTitle}>Set your intention for today</Text>
                <Text style={styles.intentionSubtitle}>Align your actions with purpose</Text>
              </>
            )}
          </View>
          <MaterialIcons name={todayNiyyah ? "edit" : "chevron-right"} size={22} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Next Prayer Card */}
        <Animated.View style={[styles.nextPrayerCard, { transform: [{ translateY: cardSlide }], opacity: headerFade }]}>
          <LinearGradient
            colors={['#0F4D3A', '#0A3528']}
            style={StyleSheet.absoluteFillObject}
          />
          <MaterialIcons name="mosque" size={120} color="rgba(255,255,255,0.06)" style={{ position: 'absolute', right: -10, top: 0 }} />
          <View style={styles.nextPrayerContentRow}>
            <View style={styles.nextPrayerGlass}>
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
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'menu-book', label: 'Quran', screen: 'Root', params: { screen: 'QuranTab' } },
            { icon: 'volunteer-activism', label: 'Duas', screen: 'Root', params: { screen: 'DuasTab' } },
            { icon: 'explore', label: 'Qibla', screen: 'Qibla' },
            { icon: 'self-improvement', label: 'Dhikr', screen: 'Dhikr' },
            { icon: 'spa', label: 'Sukoon', screen: 'Sukoon' },
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
              <View style={styles.quickActionInner}>
                <MaterialIcons name={a.icon as any} size={26} color="#fff" style={{ marginBottom: 2 }} />
                <Text style={styles.quickActionLabel} numberOfLines={1} adjustsFontSizeToFit>{a.label}</Text>
              </View>
            </HapticButton>
          ))}
        </View>

        {/* Habit Tracker */}
        <View style={styles.habitCard}>
          <Text style={styles.sectionTitle}>Today's Salah</Text>
          <View style={styles.habitRow}>
            {PRAYERS.map((p) => {
              const status = prayerStatuses[p];
              const isLocked = !isPrayerUnlocked(p);
              const isDone = status === 'done';

              return (
                <HapticButton
                  key={p}
                  onPress={() => {
                    if (isLocked) return; // silently block future prayers
                    handlePrayerDone(p);
                  }}
                  style={[styles.habitItem, isLocked && { opacity: 0.35 }]}
                  hapticType="medium"
                >
                  <View
                    style={[
                      styles.habitCircle,
                      {
                        borderColor: isDone
                          ? '#0F5132'
                          : isLocked
                          ? '#E5E7EB'
                          : p === nextPrayer?.next
                          ? Colors.primary
                          : '#E5E7EB',
                        backgroundColor: isDone ? '#0F5132' : 'transparent',
                      },
                    ]}
                  >
                    {isDone ? (
                      <MaterialIcons name="check" size={20} color="#fff" />
                    ) : isLocked ? (
                      <MaterialIcons name="lock" size={16} color="#C0C0C0" />
                    ) : (
                      <MaterialIcons
                        name={PrayerIcons[p.toLowerCase() as keyof typeof PrayerIcons] as any}
                        size={20}
                        color={p === nextPrayer?.next ? Colors.primary : '#E5E7EB'}
                      />
                    )}
                  </View>
                  <Text style={[styles.habitLabel, isLocked && { color: '#C0C0C0' }]}>
                    {p.substring(0, 3)}
                  </Text>
                </HapticButton>
              );
            })}
          </View>
          <Text style={styles.motivationText}>
            {donePrayers === 0
              ? 'Begin your day with Fajr.'
              : donePrayers < 3
              ? `${donePrayers} of 5 done. Keep going!`
              : donePrayers < 5
              ? 'More than halfway there today.'
              : 'All prayers complete. Alhamdulillah.'}
          </Text>
        </View>

        {/* 1 Minute for Allah */}
        <HapticButton
          onPress={() => navigation.navigate('OneMinute')}
          style={styles.oneMinuteBtn}
          hapticType="medium"
        >
          <LinearGradient colors={['#E6C068', '#C9A23F']} style={styles.oneMinuteGradient}>
            <Text style={styles.oneMinuteText}><MaterialIcons name="auto-awesome" size={18} color="#fff" />  1 Minute for Allah</Text>
          </LinearGradient>
        </HapticButton>

        {/* Daily Ayah */}
        <View style={styles.ayahCard}>
          <Text style={styles.ayahArabic}>{dailyAyah.arabic}</Text>
          <Text style={styles.ayahTranslation}>{dailyAyah.translation}</Text>
          <Text style={styles.ayahReference}>{dailyAyah.reference}</Text>
        </View>

        {/* Prayer Times List */}
        <View style={styles.prayerListCard}>
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
                <MaterialIcons name={PrayerIcons[p.toLowerCase() as keyof typeof PrayerIcons] as any} size={16} color={isNext ? '#0F5132' : '#6B7280'} />
                <Text style={[styles.prayerRowName, isNext && { color: '#0F5132', fontWeight: Typography.weights.bold }]}>{p}</Text>
                <Text style={[styles.prayerRowTime, isNext && { color: '#C9A23F' }]}>{formatTime(time)}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AdhanSettings')}
                  style={styles.bellBtn}
                >
                  <MaterialIcons name={bellOn ? 'notifications-active' : 'notifications-off'} size={18} color={bellOn ? Colors.primary : '#9CA3AF'} />
                </TouchableOpacity>
              </View>
          );
        })}
      </View>
    </ScreenWrapper>
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
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, color: '#1F3D2B', fontWeight: Typography.weights.bold },
  nameBlock: { flex: 1 },
  greetingText: { fontSize: Typography.sizes.md, color: '#1F3D2B', fontWeight: Typography.weights.semibold },
  timeText: { fontSize: Typography.sizes.sm, color: '#6B7280', marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  headerLogo: { width: 28, height: 28, borderRadius: 7 },

  intentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF8F2',
    padding: 16,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  intentionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(230, 192, 104, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  intentionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  intentionTitle: {
    fontSize: 14,
    color: '#1F3D2B',
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 4,
  },
  intentionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'Manrope',
  },

  nextPrayerCard: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  nextPrayerContentRow: { zIndex: 10, flex: 1 },
  nextPrayerGlass: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  nextPrayerLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: 2, marginBottom: 2, fontWeight: '700' },
  nextPrayerName: { fontFamily: 'Plus Jakarta Sans', fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 2 },
  nextPrayerTime: { fontFamily: 'Plus Jakarta Sans', fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.9)' },
  setReminderBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    ...Shadows.gold,
  },
  setReminderText: { fontSize: 12, color: Colors.primary, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  quickActionItem: { 
    flex: 1, 
    borderRadius: BorderRadius.lg, 
    overflow: 'hidden' 
  },
  quickActionInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  quickActionIcon: { fontSize: 26, marginBottom: 2 },
  quickActionLabel: { fontSize: 10, color: '#fff', fontWeight: Typography.weights.bold },

  habitCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, color: Colors.primary, fontWeight: '800', marginBottom: Spacing.md },
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
  habitLabel: { fontSize: 10, color: '#6B7280', fontWeight: Typography.weights.medium },
  motivationText: { fontSize: Typography.sizes.sm, color: '#6B7280', textAlign: 'center', marginTop: 4 },

  oneMinuteBtn: { marginBottom: Spacing.sm, borderRadius: BorderRadius.full, overflow: 'hidden' },
  oneMinuteGradient: { paddingVertical: 12, alignItems: 'center', borderRadius: BorderRadius.full },
  oneMinuteText: { fontSize: Typography.sizes.md, color: '#fff', fontWeight: Typography.weights.bold, letterSpacing: 0.5 },

  ayahCard: {
    backgroundColor: 'rgba(15,109,91,0.05)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,109,91,0.1)',
    alignItems: 'flex-end',
  },
  ayahArabic: {
    fontSize: 20,
    color: '#0F5132',
    textAlign: 'right',
    lineHeight: 36,
    marginBottom: Spacing.sm,
    fontWeight: Typography.weights.semibold,
  },
  ayahTranslation: {
    fontSize: Typography.sizes.md,
    color: '#374151',
    textAlign: 'left',
    alignSelf: 'stretch',
    lineHeight: 22,
    marginBottom: 6,
  },
  ayahReference: { fontSize: Typography.sizes.xs, color: '#E6C068', alignSelf: 'flex-start' },

  prayerListCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
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
    backgroundColor: 'rgba(15,109,91,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#0F5132',
  },
  prayerRowIcon: { fontSize: 16 },
  prayerRowName: { flex: 1, fontSize: Typography.sizes.md, color: '#1F3D2B', fontWeight: Typography.weights.medium },
  prayerRowTime: { fontSize: Typography.sizes.md, color: '#6B7280' },
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

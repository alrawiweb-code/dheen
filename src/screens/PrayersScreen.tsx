import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { HijriDateBadge } from '../components/HijriDateBadge';
import { Colors, Typography, NativeSpacing as Spacing, BorderRadius, Shadows, PrayerIcons } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { getNextPrayer, formatTime, fetchPrayerTimes, FALLBACK_TIMES, FALLBACK_HIJRI } from '../services/prayerTimes';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper, useScreenBottomInset } from '../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const PRAYERS_META = [
  { id: 'Fajr', icon: 'wb-twilight' },
  { id: 'Dhuhr', icon: 'wb-sunny' },
  { id: 'Asr', icon: 'wb-cloudy' },
  { id: 'Maghrib', icon: 'bedtime' },
  { id: 'Isha', icon: 'nights-stay' },
] as const;

export const PrayersScreen = () => {
  const navigation = useNavigation<any>();
  const profile = useAppStore(state => state.profile);
  const prayerStatuses = useAppStore(state => state.prayerStatuses);
  const setPrayerStatus = useAppStore(state => state.setPrayerStatus);
  const [prayerTimes, setPrayerTimes] = useState(FALLBACK_TIMES);
  const [hijri, setHijri] = useState(FALLBACK_HIJRI);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimes = async () => {
      const lat = profile.latitude || 25.2048;
      const lng = profile.longitude || 55.2708;
      const data = await fetchPrayerTimes(lat, lng);
      setPrayerTimes(data.times);
      setHijri(data.hijri);
      setLoading(false);
    };
    fetchTimes();
  }, [profile.latitude, profile.longitude]);

  const nextPrayer = getNextPrayer(prayerTimes);

  const bottomInset = useScreenBottomInset();

  const isPrayerUnlocked = (prayer: string): boolean => {
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
    <ScreenWrapper>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.dateText}>{profile?.name || 'Friend'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <HijriDateBadge hijri={hijri} />
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[Colors.primary, '#0f6d5b']}
            style={StyleSheet.absoluteFillObject}
          />
          <MaterialIcons 
            name="mosque" 
            size={120} 
            color="rgba(255,255,255,0.1)" 
            style={styles.heroBgIcon} 
          />
          
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroLabel}>NEXT PRAYER</Text>
                <Text style={styles.heroTitle}>{nextPrayer.next}</Text>
              </View>
              <View style={styles.heroTimeBlock}>
                <Text style={styles.heroTimeText}>{formatTime(nextPrayer.nextTime)}</Text>
                <Text style={styles.heroTimeSub}>{nextPrayer.isNext ? 'Upcoming' : ''}</Text>
              </View>
            </View>
            
            <View style={styles.heroBottomRow}>
              <View style={styles.pulseIconContainer}>
                <View style={styles.pulseBorder} />
                <MaterialIcons name="nights-stay" size={32} color={Colors.accent} />
              </View>
              <View style={styles.heroInfoBlock}>
                <Text style={styles.heroInfoTitle}>Adhan Reminders</Text>
                <Text style={styles.heroInfoDesc}>Notifications are active for all daily fardh prayers.</Text>
              </View>
              <TouchableOpacity style={styles.bellButton} onPress={() => navigation.navigate('AdhanSettings')}>
                <MaterialIcons name="notifications-active" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Today's Prayers List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Prayers</Text>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.sectionDateLabel}>{prayerTimes.date}</Text>
          )}
        </View>

        <View style={styles.listContainer}>
          {PRAYERS_META.map((prayer) => {
            const timeStr = prayerTimes[prayer.id as keyof typeof prayerTimes] as string;
            const status = prayerStatuses[prayer.id];
            const isLocked = !isPrayerUnlocked(prayer.id);
            const isDone = status === 'done';
            const isNext = nextPrayer.next === prayer.id;

            return (
              <TouchableOpacity
                key={prayer.id}
                style={[
                  styles.prayerItem,
                  isNext && !isDone && styles.prayerItemUpcoming,
                  isLocked && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (isLocked) return; // block future prayers
                  if (isDone) {
                    setPrayerStatus(prayer.id as any, 'pending');
                  } else {
                    setPrayerStatus(prayer.id as any, 'done');
                  }
                }}
                activeOpacity={isLocked ? 1 : 0.7}
              >
                <View style={styles.prayerItemLeft}>
                  <View style={[styles.prayerIconBox, isNext && !isDone && styles.prayerIconBoxActive]}>
                    <MaterialIcons
                      name={isLocked ? 'lock' : prayer.icon as any}
                      size={24}
                      color={isDone ? Colors.primary : isNext ? Colors.primary : Colors.textMuted}
                    />
                  </View>
                  <View>
                    <Text style={styles.prayerName}>{prayer.id}</Text>
                    <Text style={styles.prayerTime}>{formatTime(timeStr)}</Text>
                  </View>
                </View>

                <View style={styles.prayerItemRight}>
                  {isDone ? (
                    <View style={styles.doneBadge}>
                      <MaterialIcons name="check-circle" size={16} color="#fff" />
                      <Text style={styles.doneBadgeText}>Done</Text>
                    </View>
                  ) : isLocked ? (
                    <MaterialIcons name="hourglass-top" size={20} color={Colors.textMuted} />
                  ) : (
                    <MaterialIcons name="radio-button-unchecked" size={24} color={Colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Qibla Direction */}
        <View style={styles.qiblaCard}>
          <View style={styles.qiblaWidgetBg1} />
          <View style={styles.qiblaWidgetBg2} />

          {/* Top row — text + compass */}
          <View style={styles.qiblaTopRow}>
            <View style={{ flex: 1, zIndex: 10 }}>
              <Text style={styles.bentoTitle}>Qibla Direction</Text>
              <Text style={styles.bentoDesc}>
                Find the direction of the Holy Kaaba from your current location.
              </Text>
            </View>
            <View style={styles.compassRing}>
              <View style={styles.compassInner}>
                <MaterialIcons
                  name="navigation"
                  size={32}
                  color={Colors.primary}
                  style={{ transform: [{ rotate: '292deg' }] }}
                />
                <View style={styles.compassDot} />
              </View>
            </View>
          </View>

          {/* Degrees */}
          <Text style={styles.qiblaDegrees}>292° NW</Text>
          <Text style={styles.qiblaLocation}>Mecca, SA</Text>

          {/* Button */}
          <TouchableOpacity
            style={styles.fullCompassBtn}
            onPress={() => navigation.navigate('Qibla')}
          >
            <MaterialIcons name="explore" size={20} color={Colors.primary} />
            <Text style={styles.fullCompassBtnText}>Open Full Compass</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ScreenWrapper>
);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  premiumText: { color: Colors.accent, fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: Spacing.sm,
  },
  heroBgIcon: {
    position: 'absolute',
    top: 0,
    right: -20,
  },
  heroContent: {
    padding: Spacing.xl,
    zIndex: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  heroLabel: { fontFamily: 'Manrope', fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: 2, marginBottom: 4 },
  heroTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 36, fontWeight: '800', color: '#fff' },
  heroTimeBlock: { alignItems: 'flex-end' },
  heroTimeText: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: '#fff' },
  heroTimeSub: { fontFamily: 'Manrope', fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pulseIconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
    borderTopColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  heroInfoBlock: { flex: 1 },
  heroInfoTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  heroInfoDesc: { fontFamily: 'Manrope', fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
  bellButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  sectionTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.primary },
  sectionDateLabel: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted },
  
  listContainer: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f3ee', // surface-container-low
    padding: 16,
    borderRadius: 20,
  },
  prayerItemUpcoming: {
    backgroundColor: '#e4e2dd', // surface-container-highest
    borderWidth: 2,
    borderColor: 'rgba(0,83,68,0.2)',
  },
  prayerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  prayerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0,83,68,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerIconBoxActive: { backgroundColor: 'rgba(0,83,68,0.1)' },
  prayerName: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  prayerTime: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted },
  prayerItemRight: { flexDirection: 'row', alignItems: 'center' },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  doneBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionTokens: { flexDirection: 'row', gap: 12 },

  qiblaCard: {
    backgroundColor: '#f5f3ee',
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.md,
  },
  qiblaTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  qiblaWidgetBg1: {
    position: 'absolute', right: -48, bottom: -48,
    width: 192, height: 192, borderRadius: 96,
    borderWidth: 1, borderColor: 'rgba(0,83,68,0.05)',
  },
  qiblaWidgetBg2: {
    position: 'absolute', right: -32, bottom: -32,
    width: 128, height: 128, borderRadius: 64,
    borderWidth: 1, borderColor: 'rgba(0,83,68,0.1)',
  },
  bentoTitle: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 20,
    fontWeight: '700', color: Colors.primary, marginBottom: 8,
  },
  bentoDesc: {
    fontFamily: 'Manrope', fontSize: 14,
    color: Colors.textMuted, lineHeight: 20,
  },
  qiblaDegrees: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 24,
    fontWeight: '700', color: Colors.accent, marginBottom: 2,
  },
  qiblaLocation: {
    fontFamily: 'Manrope', fontSize: 12,
    fontWeight: '500', color: Colors.textMuted, marginBottom: 16,
  },
  compassRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2,
    borderColor: 'rgba(0,83,68,0.05)',
  },
  compassInner: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(0,83,68,0.2)',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  compassDot: {
    position: 'absolute', top: -2,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#ba1a1a',
  },
  fullCompassBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14,
    borderRadius: 12, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 2,
  },
  fullCompassBtnText: {
    color: Colors.primary, fontSize: 15,
    fontWeight: '700', fontFamily: 'Plus Jakarta Sans',
  },

  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
});

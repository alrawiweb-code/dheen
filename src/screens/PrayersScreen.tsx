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
  const { profile, prayerStatuses, setPrayerStatus, incrementMilestone } = useAppStore();
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.name?.[0]?.toUpperCase() || 'A'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
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
            
            let displayStatus = status === 'done' ? 'done' : 'locked';
            if (status !== 'done') {
               if (nextPrayer.next === prayer.id) {
                 displayStatus = 'upcoming';
               } else {
                 displayStatus = 'pending';
               }
            }

            const isUpcoming = displayStatus === 'upcoming';
            const isDone = displayStatus === 'done';
            
            return (
              <View 
                key={prayer.id} 
                style={[
                  styles.prayerItem,
                  isUpcoming && styles.prayerItemUpcoming,
                  displayStatus === 'locked' && { opacity: 0.6 }
                ]}
              >
                <View style={styles.prayerItemLeft}>
                  <View style={[styles.prayerIconBox, isUpcoming && styles.prayerIconBoxActive]}>
                    <MaterialIcons name={prayer.icon as any} size={24} color={isUpcoming ? Colors.primary : Colors.textMuted} />
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
                  ) : isUpcoming ? (
                    <View style={styles.actionTokens}>
                      <TouchableOpacity onPress={() => {
                        setPrayerStatus(prayer.id as any, 'done');
                        if (prayer.id === 'Fajr') {
                          incrementMilestone('fajrCount');
                        }
                        const updated = { ...prayerStatuses, [prayer.id]: 'done' };
                        if (Object.values(updated).every(s => s === 'done')) {
                          incrementMilestone('streakDays');
                        }
                      }}>
                        <MaterialIcons name="radio-button-unchecked" size={24} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <MaterialIcons name="hourglass-top" size={20} color={Colors.textMuted} />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Qibla Direction & Map */}
        <View style={styles.bentoGrid}>
          {/* Qibla Mini Widget */}
          <View style={styles.qiblaWidget}>
            <View style={styles.qiblaWidgetBg1} />
            <View style={styles.qiblaWidgetBg2} />
            <View style={{ zIndex: 10 }}>
              <Text style={styles.bentoTitle}>Qibla Direction</Text>
              <Text style={styles.bentoDesc}>Find the direction of the Holy Kaaba from your current location.</Text>
            </View>
            
            <View style={styles.qiblaBottomRow}>
              <View>
                <Text style={styles.qiblaDegrees}>292° NW</Text>
                <Text style={styles.qiblaLocation}>Mecca, SA</Text>
              </View>
              <View style={styles.compassRing}>
                <View style={styles.compassInner}>
                  <MaterialIcons name="navigation" size={32} color={Colors.primary} style={{ transform: [{ rotate: '292deg' }] }} />
                  <View style={styles.compassDot} />
                </View>
              </View>
            </View>
          </View>
          
          {/* Compass Map Card */}
          <View style={styles.mapWidget}>
            <LinearGradient
              colors={['#005344', '#0F6D5B']}
              style={StyleSheet.absoluteFillObject}
            />
            
            <TouchableOpacity style={styles.fullCompassBtn} onPress={() => navigation.navigate('Qibla')}>
              <MaterialIcons name="explore" size={20} color={Colors.primary} />
              <Text style={styles.fullCompassBtnText}>Open Full Compass</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>


    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingTop: 60, paddingHorizontal: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eae8e3',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    marginBottom: Spacing.xl,
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
    marginBottom: 40,
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
  sectionTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: '700', color: Colors.primary },
  sectionDateLabel: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted },
  
  listContainer: {
    gap: 12,
    marginBottom: Spacing.xl,
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

  bentoGrid: {
    flexDirection: width > 500 ? 'row' : 'column',
    gap: 16,
  },
  qiblaWidget: {
    backgroundColor: '#f5f3ee',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    height: 200,
  },
  qiblaWidgetBg1: { position: 'absolute', right: -48, bottom: -48, width: 192, height: 192, borderRadius: 96, borderWidth: 1, borderColor: 'rgba(0,83,68,0.05)' },
  qiblaWidgetBg2: { position: 'absolute', right: -32, bottom: -32, width: 128, height: 128, borderRadius: 64, borderWidth: 1, borderColor: 'rgba(0,83,68,0.1)' },
  bentoTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  bentoDesc: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, maxWidth: 160 },
  qiblaBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32 },
  qiblaDegrees: { fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: '700', color: Colors.accent },
  qiblaLocation: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  compassRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,83,68,0.05)',
  },
  compassInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,83,68,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassDot: {
    position: 'absolute',
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ba1a1a',
  },

  mapWidget: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 200,
    justifyContent: 'flex-end',
    padding: 24,
  },
  fullCompassBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  fullCompassBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },

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

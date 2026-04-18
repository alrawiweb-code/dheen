import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, NativeSpacing as Spacing, BorderRadius, Shadows, PrayerIcons } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { getNextPrayer, formatTime, FALLBACK_TIMES } from '../services/prayerTimes';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const PRAYERS = [
  { id: 'Fajr', icon: 'wb-twilight', time: '04:32 AM', status: 'done' },
  { id: 'Dhuhr', icon: 'wb-sunny', time: '12:45 PM', status: 'upcoming' },
  { id: 'Asr', icon: 'wb-cloudy', time: '04:12 PM', status: 'pending' },
  { id: 'Maghrib', icon: 'bedtime', time: '06:58 PM', status: 'locked' },
  { id: 'Isha', icon: 'nights-stay', time: '08:30 PM', status: 'locked' },
];

export const PrayersScreen = () => {
  const navigation = useNavigation<any>();
  const { profile } = useAppStore();
  const nextPrayer = getNextPrayer(FALLBACK_TIMES);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.name?.[0]?.toUpperCase() || 'A'}</Text>
            </View>
            <Text style={styles.dateText}>14 Shawwal 1446</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.premiumText}>PREMIUM</Text>
            <MaterialIcons name="brightness-5" size={24} color={Colors.primary} />
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
                <Text style={styles.heroTitle}>Dhuhr</Text>
              </View>
              <View style={styles.heroTimeBlock}>
                <Text style={styles.heroTimeText}>12:45 PM</Text>
                <Text style={styles.heroTimeSub}>in 2h 15m</Text>
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
          <Text style={styles.sectionDateLabel}>April 14, 2024</Text>
        </View>

        <View style={styles.listContainer}>
          {PRAYERS.map((prayer) => {
            const isUpcoming = prayer.status === 'upcoming';
            const isDone = prayer.status === 'done';
            
            return (
              <View 
                key={prayer.id} 
                style={[
                  styles.prayerItem,
                  isUpcoming && styles.prayerItemUpcoming,
                  prayer.status === 'locked' && { opacity: 0.6 }
                ]}
              >
                <View style={styles.prayerItemLeft}>
                  <View style={[styles.prayerIconBox, isUpcoming && styles.prayerIconBoxActive]}>
                    <MaterialIcons name={prayer.icon as any} size={24} color={isUpcoming ? Colors.primary : Colors.textMuted} />
                  </View>
                  <View>
                    <Text style={styles.prayerName}>{prayer.id}</Text>
                    <Text style={styles.prayerTime}>{prayer.time}</Text>
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
                      <TouchableOpacity>
                        <MaterialIcons name="radio-button-unchecked" size={24} color={Colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity>
                        <MaterialIcons name="cancel" size={24} color={Colors.prayerMissed} />
                      </TouchableOpacity>
                    </View>
                  ) : prayer.status === 'locked' ? (
                    <MaterialIcons name="lock" size={20} color={Colors.textMuted} />
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
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-RX-OCvGUX8hWpWC1XSpfyXZuYvuhKz6YVspHTHgo5s3trPXyAYxyoCySL7sOolgq9bQNBOrBKso-wUbWtPcNG3fn8eMdlMrK5n36Bw7oXQHCULbiX0OabttskcPkKu5VX0ARrylH2n3wRKNDPqEeuoToU6d2ZW7PsHnCfSR1-0plmN0zzqzUZJPanMTpeGeQLzw_MxnttDHvcrvFJ-WKsnntl4lmg3UAsbiI1teujzZBi2u5tCbU30FWwyWTzxWk7HA-xIxiVfAx' }} 
              style={StyleSheet.absoluteFillObject} 
            />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15,109,91,0.4)' }]} />
            
            <TouchableOpacity style={styles.fullCompassBtn} onPress={() => navigation.navigate('Qibla')}>
              <MaterialIcons name="explore" size={20} color={Colors.primary} />
              <Text style={styles.fullCompassBtnText}>Open Full Compass</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Ruhani FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('Ruhani')}
      >
        <LinearGradient 
          colors={['#745c00', '#ffe088']} 
          style={StyleSheet.absoluteFillObject} 
        />
        <MaterialIcons name="auto-awesome" size={28} color={Colors.textDark} />
      </TouchableOpacity>
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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, NativeSpacing as Spacing, BorderRadius } from '../theme';

const PRAYERS = [
  { id: 'Fajr', icon: 'brightness-3', label: 'Dawn Prayer', color: Colors.secondary, special: true },
  { id: 'Dhuhr', icon: 'wb-sunny', label: 'Noon Prayer', color: Colors.primary, special: false },
  { id: 'Asr', icon: 'wb-twilight', label: 'Afternoon Prayer', color: Colors.primary, special: false },
  { id: 'Maghrib', icon: 'bedtime', label: 'Sunset Prayer', color: Colors.primary, special: false },
  { id: 'Isha', icon: 'nights-stay', label: 'Night Prayer', color: Colors.primary, special: false },
];

const ALERT_MODES = [
  { id: 'full', icon: 'volume-up', label: 'Full Adhan' },
  { id: 'short', icon: 'notifications-active', label: 'Short Notification' },
  { id: 'vibrate', icon: 'vibration', label: 'Vibrate Only' },
];

export const AdhanSettingsScreen = ({ navigation }: any) => {
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [prayerToggles, setPrayerToggles] = useState<Record<string, boolean>>({
    Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true,
  });
  const [fajrSpecial, setFajrSpecial] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<'makkah' | 'madinah'>('makkah');
  const [alertMode, setAlertMode] = useState('full');

  const togglePrayer = (id: string) =>
    setPrayerToggles(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back-ios" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Adhan Settings</Text>
          </View>
          <View style={styles.avatar} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={styles.masterCard}>
          <View style={styles.masterLeft}>
            <View style={styles.masterIconBg}>
              <MaterialIcons name="notifications-active" size={24} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.masterTitle}>Enable Adhan Notifications</Text>
              <Text style={styles.masterSub}>Receive alerts for all prayer times</Text>
            </View>
          </View>
          <Switch
            value={masterEnabled}
            onValueChange={setMasterEnabled}
            trackColor={{ false: '#eae8e3', true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Prayer Cycle Section */}
        <Text style={styles.sectionLabel}>DAILY PRAYER CYCLE</Text>
        <View style={styles.prayerList}>
          {PRAYERS.map((prayer) => (
            <View key={prayer.id} style={styles.prayerCard}>
              <View style={styles.prayerCardGlow} />
              <View style={styles.prayerRow}>
                <View style={styles.prayerLeft}>
                  <View style={[styles.prayerIconBox, { backgroundColor: prayer.color === Colors.secondary ? 'rgba(115,92,0,0.08)' : 'rgba(15,109,91,0.08)' }]}>
                    <MaterialIcons name={prayer.icon as any} size={22} color={prayer.color} />
                  </View>
                  <View>
                    <Text style={styles.prayerName}>{prayer.id}</Text>
                    <Text style={[styles.prayerLabel, { color: prayer.color }]}>{prayer.label}</Text>
                  </View>
                </View>
                <Switch
                  value={prayerToggles[prayer.id]}
                  onValueChange={() => togglePrayer(prayer.id)}
                  trackColor={{ false: '#eae8e3', true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              {prayer.special && (
                <View style={styles.fajrExtra}>
                  <View style={styles.fajrExtraLeft}>
                    <Text style={styles.fajrExtraTitle}>As-salatu khayrun mina-n-nawm</Text>
                    <Text style={styles.fajrExtraSub}>Include "Prayer is better than sleep"</Text>
                  </View>
                  <Switch
                    value={fajrSpecial}
                    onValueChange={setFajrSpecial}
                    trackColor={{ false: 'rgba(115,92,0,0.2)', true: Colors.secondary }}
                    thumbColor="#fff"
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Recitation Voice */}
        <Text style={styles.sectionLabel}>RECITATION VOICE</Text>
        <View style={styles.voiceGrid}>
          {[
            { id: 'makkah', label: 'Makkah', sub: 'Grand Mosque', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUzXANOKXp9HLKYl6McQFEtFziiCj6ajGLLSRkq6as58z44k67zumGP_oq2ijn4a-QXaphWcUpmz7DZMJpGOSEivzT9eswo_suyLQnouDRO356Ha7ZWy_Yr36dUleSYOMIJwyZcTuejC2BOMqknouQHL5Q31-l0PdnZ6yzEn6wvZ4HFH3pofr8HwmlJJsJ2ORYgyIZ9YnnEpgrf-ALk3Xip7Ko72Wbz-vRNHsw4UMYX39poeAYHGEAPOwxrlP65uCp3ROIHybngl0v' },
            { id: 'madinah', label: 'Madinah', sub: "Prophet's Mosque", img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWWtKriwEaOuEyd3peePR2kT0qZBxTD2X3nimPKh2AtuMqXlSMZ0pyeKTIYfQdgav02yHj-j8ZXqxrSVrxl3KL2OV5jsWwM9nTqYOVhulpgSQwcMKLlUfUrTOX5XqQqDwis_4bo9iTThGG3y3eKA_IkSHeGUjF_i8hkUIp2AbCi1Pfb_s9u1f1BENacJFD2z9NcxK-dfYGsuLbh7CprmE6XUnT0YOVqUCG8BjbZlI6cKo9Ubpd_nsYwdQgLe_W2pxWeCDaXZYOxPBq' },
          ].map(voice => {
            const isSelected = selectedVoice === voice.id;
            return (
              <TouchableOpacity
                key={voice.id}
                style={[styles.voiceCard, isSelected && styles.voiceCardSelected]}
                onPress={() => setSelectedVoice(voice.id as any)}
                activeOpacity={0.8}
              >
                {isSelected && (
                  <MaterialIcons name="check-circle" size={20} color={Colors.primary} style={styles.voiceCheck} />
                )}
                <View style={styles.voiceAvatar}>
                  <Image source={{ uri: voice.img }} style={StyleSheet.absoluteFillObject} />
                </View>
                <Text style={styles.voiceName}>{voice.label}</Text>
                <Text style={styles.voiceSub}>{voice.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Alert Mode */}
        <Text style={styles.sectionLabel}>ALERT MODE</Text>
        <View style={styles.alertList}>
          {ALERT_MODES.map(mode => (
            <TouchableOpacity
              key={mode.id}
              style={styles.alertRow}
              onPress={() => setAlertMode(mode.id)}
            >
              <View style={[styles.radio, alertMode === mode.id && styles.radioSelected]}>
                {alertMode === mode.id && <View style={styles.radioInner} />}
              </View>
              <MaterialIcons name={mode.icon as any} size={22} color={Colors.textMuted} style={{ marginLeft: 16 }} />
              <Text style={styles.alertLabel}>{mode.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
          <LinearGradient colors={[Colors.primary, '#0f6d5b']} style={StyleSheet.absoluteFillObject} />
          <Text style={styles.saveBtnText}>Save Adhan Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    backgroundColor: 'rgba(251,249,244,0.8)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.primary },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3', borderWidth: 2, borderColor: 'rgba(0,83,68,0.1)' },

  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },

  masterCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.xl, borderRadius: 20, backgroundColor: '#f5f3ee',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginBottom: Spacing['3xl'],
  },
  masterLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  masterIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,83,68,0.1)', alignItems: 'center', justifyContent: 'center' },
  masterTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  masterSub: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted, fontWeight: '500' },

  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '800', color: Colors.secondary, letterSpacing: 3, textTransform: 'uppercase', marginBottom: Spacing.lg, opacity: 0.7 },

  prayerList: { gap: 16, marginBottom: Spacing['3xl'] },
  prayerCard: { backgroundColor: '#fff', borderRadius: 20, padding: Spacing.xl, position: 'relative', overflow: 'hidden' },
  prayerCardGlow: { position: 'absolute', top: -64, right: -64, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(115,92,0,0.05)' },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  prayerIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  prayerName: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  prayerLabel: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  fajrExtra: {
    marginTop: 16, padding: 16, borderRadius: 12,
    backgroundColor: 'rgba(115,92,0,0.05)', borderWidth: 1, borderColor: 'rgba(115,92,0,0.1)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  fajrExtraLeft: { flex: 1, marginRight: 16 },
  fajrExtraTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.secondary, marginBottom: 2 },
  fajrExtraSub: { fontFamily: 'Manrope', fontSize: 12, color: 'rgba(115,92,0,0.6)' },

  voiceGrid: { flexDirection: 'row', gap: 16, marginBottom: Spacing['3xl'] },
  voiceCard: {
    flex: 1, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent',
    backgroundColor: '#f0eee9', alignItems: 'center', gap: 12, position: 'relative',
  },
  voiceCardSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(0,83,68,0.05)' },
  voiceCheck: { position: 'absolute', top: 8, right: 8 },
  voiceAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eae8e3', overflow: 'hidden' },
  voiceName: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.textDark },
  voiceSub: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  alertList: { gap: 4, marginBottom: Spacing['3xl'] },
  alertRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, backgroundColor: '#f0eee9',
  },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#bec9c4',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  alertLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.textDark, marginLeft: 12 },

  saveContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.xl, paddingBottom: 40, paddingTop: 20,
    backgroundColor: 'transparent',
  },
  saveBtn: {
    height: 60, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  saveBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: '#fff' },
});

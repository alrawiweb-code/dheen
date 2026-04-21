import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, NativeSpacing as Spacing, BorderRadius, Typography } from '../theme';
import { useAppStore } from '../store/useAppStore';
import {
  stopAdhan,
  playAdhanPreview,
  playFullAdhan,
  playShortAdhan,
  vibrateAdhan,
} from '../services/adhanManager';
import { syncPrayerNotifications, requestNotificationPermissions } from '../services/notificationManager';
import { refreshDeviceCoordinates } from '../services/locationManager';
import { isCached } from '../services/audioCache';

const PRAYERS = [
  { id: 'Fajr',    icon: 'brightness-3',  label: 'Dawn Prayer',      color: Colors.secondary, special: true  },
  { id: 'Dhuhr',   icon: 'wb-sunny',       label: 'Noon Prayer',      color: Colors.primary,   special: false },
  { id: 'Asr',     icon: 'wb-twilight',    label: 'Afternoon Prayer', color: Colors.primary,   special: false },
  { id: 'Maghrib', icon: 'bedtime',         label: 'Sunset Prayer',    color: Colors.primary,   special: false },
  { id: 'Isha',    icon: 'nights-stay',    label: 'Night Prayer',     color: Colors.primary,   special: false },
] as const;

export const AdhanSettingsScreen = ({ navigation }: any) => {
  const {
    profile, setProfile,
    adhanSettings, updateAdhanSettings, updatePrayerAdhanSettings,
    isAdhanPlaying,
  } = useAppStore();

  const [previewLoading, setPreviewLoading] = useState(false);
  const [alertPreviewMode, setAlertPreviewMode] = useState<string | null>(null);
  const [downloadedVoices, setDownloadedVoices] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkCache = async () => {
      const statuses = await Promise.all(
        ['makkah', 'madinah', 'alaqsa'].map(async (v) => ({ v, isC: await isCached(v) }))
      );
      const dict: Record<string, boolean> = {};
      statuses.forEach((s) => (dict[s.v] = s.isC));
      setDownloadedVoices((prev) => ({ ...prev, ...dict }));
    };
    checkCache();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────
  const selectedVoice = adhanSettings.prayers.Fajr.voice;
  const selectedAlertType = adhanSettings.prayers.Fajr.alertType;

  const updateAllPrayers = (patch: Partial<typeof adhanSettings.prayers.Fajr>) => {
    (['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).forEach((p) =>
      updatePrayerAdhanSettings(p, patch)
    );
  };

  const resync = () => syncPrayerNotifications().catch(() => {});

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => { stopAdhan(); navigation.goBack(); }}>
              <MaterialIcons name="arrow-back-ios" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Adhan Settings</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: 'bold' }}>
              {profile.name?.[0]?.toUpperCase() || 'A'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Download Progress ── */}
        {['makkah', 'madinah', 'alaqsa'].some(v => !downloadedVoices[v]) && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Downloading Adhan audio for offline use…
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.round(
                      (Object.values(downloadedVoices).filter(Boolean).length / 3) * 100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* ── Master Toggle ── */}
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
            value={adhanSettings.masterEnabled}
            onValueChange={(val) => {
              // 1. Optimistic update to keep UI responsive
              updateAdhanSettings({ masterEnabled: val });
              
              // 2. Perform async OS interaction cleanly
              setTimeout(async () => {
                if (val) {
                  try {
                    const granted = await requestNotificationPermissions();
                    if (!granted) {
                      Alert.alert('Permissions Required', 'Please enable notifications in your device settings.');
                      updateAdhanSettings({ masterEnabled: false });
                      return;
                    }
                  } catch (e) {
                    updateAdhanSettings({ masterEnabled: false });
                    return;
                  }
                }
                await resync();
              }, 50);
            }}
            trackColor={{ false: '#eae8e3', true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* ── Auto-Location ── */}
        <Text style={styles.sectionLabel}>PRAYER TIME LOCATION</Text>
        <View style={styles.locationCard}>
          <View style={styles.locationRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterTitle}>Auto-Location</Text>
              <Text style={styles.masterSub}>Use GPS for highly accurate prayer timing</Text>
            </View>
            <Switch
              value={profile.autoLocation}
              onValueChange={(val) => {
                setProfile({ autoLocation: val });
                
                setTimeout(async () => {
                  if (val) {
                    try {
                      const success = await refreshDeviceCoordinates();
                      if (!success) {
                        Alert.alert('GPS Required', 'Please enable Location services or enter your city manually.');
                        setProfile({ autoLocation: false });
                        return;
                      }
                    } catch (e) {
                      setProfile({ autoLocation: false });
                      return;
                    }
                  }
                  await resync();
                }, 50);
              }}
              trackColor={{ false: '#eae8e3', true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {!profile.autoLocation && (
            <View style={styles.manualLocationBlock}>
              <TextInput
                style={styles.locationInput}
                placeholder="City (e.g. Dubai)"
                placeholderTextColor={Colors.textMuted}
                value={profile.city}
                onChangeText={(city) => setProfile({ city })}
                onBlur={resync}
              />
              <TextInput
                style={styles.locationInput}
                placeholder="Country (e.g. UAE)"
                placeholderTextColor={Colors.textMuted}
                value={profile.country}
                onChangeText={(country) => setProfile({ country })}
                onBlur={resync}
              />
            </View>
          )}
        </View>

        {/* ── Per-Prayer Toggles ── */}
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
                  value={adhanSettings.prayers[prayer.id]?.enabled ?? true}
                  onValueChange={async (val) => {
                    updatePrayerAdhanSettings(prayer.id, { enabled: val });
                    await resync();
                  }}
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
                    value={adhanSettings.prayers.Fajr.fajrPhrase ?? true}
                    onValueChange={(val) => updatePrayerAdhanSettings('Fajr', { fajrPhrase: val })}
                    trackColor={{ false: 'rgba(115,92,0,0.2)', true: Colors.secondary }}
                    thumbColor="#fff"
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── Recitation Voice ── */}
        <Text style={styles.sectionLabel}>RECITATION VOICE</Text>
        <View style={styles.voiceGrid}>
          {[
            { id: 'makkah',  label: 'Makkah',  sub: 'Grand Mosque',     c1: '#0F6D5B', c2: '#005344' },
            { id: 'madinah', label: 'Madinah', sub: "Prophet's Mosque", c1: '#B58C00', c2: '#745C00' },
            { id: 'alaqsa',  label: 'Al-Aqsa', sub: 'Jerusalem',        c1: '#003B31', c2: '#002019' },
          ].map((voice) => {
            const isSelected = selectedVoice === voice.id;
            return (
              <TouchableOpacity
                key={voice.id}
                style={[styles.voiceCard, isSelected && styles.voiceCardSelected]}
                onPress={async () => {
                  updateAllPrayers({ voice: voice.id });
                  await stopAdhan();
                  playAdhanPreview(voice.id, setPreviewLoading);
                }}
                activeOpacity={0.8}
              >
                {isSelected && (
                  previewLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={styles.voiceCheck} />
                  ) : (
                    <MaterialIcons name="check-circle" size={20} color={Colors.primary} style={styles.voiceCheck} />
                  )
                )}
                <View style={styles.voiceAvatar}>
                  <LinearGradient colors={[voice.c1, voice.c2]} style={StyleSheet.absoluteFillObject} />
                </View>
                <Text style={styles.voiceName}>{voice.label}</Text>
                <Text style={styles.voiceSub}>{voice.sub}</Text>
                {downloadedVoices[voice.id] && (
                  <View style={{ marginTop: 6, backgroundColor: 'rgba(15, 109, 91, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, color: Colors.primary, fontWeight: '700' }}>DOWNLOADED</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Alert Mode ── */}
        <Text style={styles.sectionLabel}>ALERT MODE</Text>
        <View style={styles.alertList}>
          {([
            { id: 'adhan',          icon: 'volume-up',              label: 'Full Adhan',         desc: 'Complete Adhan audio' },
            { id: 'beep',           icon: 'notifications-active',   label: 'Short Notification', desc: '8-second clip' },
            { id: 'silent_vibrate', icon: 'vibration',              label: 'Vibrate Only',       desc: 'No audio, device vibrates' },
          ] as { id: 'adhan' | 'beep' | 'silent_vibrate'; icon: any; label: string; desc: string }[]).map((mode) => {
            const isSelected = selectedAlertType === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[styles.alertRow, isSelected && styles.alertRowSelected]}
                onPress={() => {
                  updateAllPrayers({ alertType: mode.id });
                  setAlertPreviewMode(mode.id);
                  
                  // Async IIFE to prevent overlapping sounds and unhandled promises
                  (async () => {
                    await stopAdhan(); // await completion before starting new audio
                    try {
                      if (mode.id === 'adhan') {
                        await playFullAdhan(selectedVoice);
                      } else if (mode.id === 'beep') {
                        await playShortAdhan(selectedVoice);
                      } else if (mode.id === 'silent_vibrate') {
                        vibrateAdhan();
                      }
                    } catch (error) {
                      console.error('[AdhanSettings] Alert Mode preview failed', error);
                    } finally {
                      setAlertPreviewMode(null);
                    }
                  })();
                }}
              >
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <MaterialIcons name={mode.icon} size={22} color={isSelected ? Colors.primary : Colors.textMuted} style={{ marginLeft: 16 }} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.alertLabel, isSelected && { color: Colors.primary }]}>{mode.label}</Text>
                  <Text style={styles.alertDesc}>{mode.desc}</Text>
                </View>
                {isSelected && alertPreviewMode === mode.id && isAdhanPlaying && (
                  <ActivityIndicator size="small" color={Colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Pre-Alert ── */}
        <Text style={styles.sectionLabel}>PRE-ALERT REMINDER</Text>
        <View style={[styles.masterCard, { marginBottom: Spacing['3xl'] }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.masterTitle}>Remind me before prayer</Text>
            <Text style={styles.masterSub}>Get a heads-up before the adhan plays</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {([0, 5, 10, 15] as const).map((mins) => {
              const isSelected = adhanSettings.prayers.Fajr.preAlert === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: isSelected ? Colors.primary : '#eae8e3',
                  }}
                  onPress={async () => {
                    updateAllPrayers({ preAlert: mins });
                    await resync();
                  }}
                >
                  <Text style={{
                    fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700',
                    color: isSelected ? '#fff' : Colors.textMuted,
                  }}>
                    {mins === 0 ? 'Off' : `${mins}m`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Save / Apply Button */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.85}
          onPress={async () => {
            await resync();
            navigation.goBack();
          }}
        >
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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3', borderWidth: 2, borderColor: 'rgba(0,83,68,0.1)', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl  },
  progressContainer: {
    padding: Spacing.md,
    backgroundColor: 'rgba(15,109,91,0.05)',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(15,109,91,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  masterCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.xl, borderRadius: 20, backgroundColor: '#f5f3ee',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginBottom: Spacing['3xl'],
  },
  masterLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  masterIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,83,68,0.1)', alignItems: 'center', justifyContent: 'center' },
  masterTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  masterSub: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted, fontWeight: '500' },

  sectionLabel: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '800',
    color: Colors.secondary, letterSpacing: 3, textTransform: 'uppercase',
    marginBottom: Spacing.lg, opacity: 0.7,
  },

  // Location
  locationCard: {
    backgroundColor: '#f5f3ee', borderRadius: 20, padding: Spacing.xl,
    marginBottom: Spacing['3xl'],
  },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  manualLocationBlock: { marginTop: 16, gap: 8 },
  locationInput: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eae8e3',
    paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: Colors.textDark,
  },

  // Prayer list
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

  // Voice
  voiceGrid: { flexDirection: 'row', gap: 12, marginBottom: Spacing['3xl'], flexWrap: 'wrap' },
  voiceCard: {
    flex: 1, minWidth: 90, padding: 14, borderRadius: 16, borderWidth: 2, borderColor: 'transparent',
    backgroundColor: '#f0eee9', alignItems: 'center', gap: 10, position: 'relative',
  },
  voiceCardSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(0,83,68,0.05)' },
  voiceCheck: { position: 'absolute', top: 8, right: 8 },
  voiceAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eae8e3', overflow: 'hidden' },
  voiceName: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.textDark },
  voiceSub: { fontFamily: 'Manrope', fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  // Alert mode
  alertList: { gap: 8, marginBottom: Spacing['3xl'] },
  alertRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, backgroundColor: '#f0eee9',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  alertRowSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(0,83,68,0.04)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#bec9c4', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  alertLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: Colors.textDark },
  alertDesc: { fontFamily: 'Manrope', fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Save
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

/**
 * QuranDownloadScreen.tsx
 *
 * Shown once, immediately after onboarding completes.
 * Downloads the full Quran (Arabic + English translation) in a single pass,
 * inserts into SQLite, and navigates to Root when done.
 *
 * Non-dismissable — user must wait or retry on failure.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Easing,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { initDatabase, insertFullQuran, isQuranDownloaded } from '../services/quranDatabase';
import { Colors } from '../theme';
import { ScreenWrapper } from '../components/ScreenWrapper';

export const QURAN_DOWNLOADED_KEY = '@quran_downloaded';

const ARABIC_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
const ENGLISH_URL = 'https://api.alquran.cloud/v1/quran/en.asad';

type Phase = 'idle' | 'downloading' | 'inserting' | 'done' | 'error';

export const QuranDownloadScreen = ({ navigation }: any) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);      // 0–114
  const [currentSurah, setCurrentSurah] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Animated progress bar ─────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase === 'inserting' || phase === 'downloading') {
      // Gentle pulse on the icon while working
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 114,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // ── Download logic ────────────────────────────────────────────
  const startDownload = useCallback(async () => {
    setPhase('downloading');
    setProgress(0);
    setErrorMsg('');

    try {
      // Initialise DB schema
      await initDatabase();

      // If already fully downloaded, just proceed
      const alreadyDone = await isQuranDownloaded();
      if (alreadyDone) {
        await AsyncStorage.setItem(QURAN_DOWNLOADED_KEY, 'true');
        setPhase('done');
        setTimeout(() => navigation.replace('Root'), 800);
        return;
      }

      // Fetch both full-quran payloads in parallel
      setCurrentSurah('Fetching Arabic text…');
      const [arabicRes, engRes] = await Promise.all([
        fetch(ARABIC_URL),
        fetch(ENGLISH_URL),
      ]);

      if (!arabicRes.ok || !engRes.ok) {
        throw new Error(`HTTP error: ${arabicRes.status} / ${engRes.status}`);
      }

      setCurrentSurah('Fetching translation…');
      const [arabicJson, engJson] = await Promise.all([
        arabicRes.json(),
        engRes.json(),
      ]);

      const arabicSurahs: any[] = arabicJson.data.surahs;
      const engSurahs: any[] = engJson.data.surahs;

      // Insert into SQLite
      setPhase('inserting');
      await insertFullQuran(arabicSurahs, engSurahs, (idx, name) => {
        setProgress(idx);
        setCurrentSurah(name);
      });

      // Mark as done
      await AsyncStorage.setItem(QURAN_DOWNLOADED_KEY, 'true');
      setPhase('done');
      setTimeout(() => navigation.replace('Root'), 1000);

    } catch (e: any) {
      console.error('[QuranDownload] Error:', e);
      setErrorMsg(e?.message ?? 'Network error. Please check your connection.');
      setPhase('error');
    }
  }, [navigation]);

  // Auto-start on mount
  useEffect(() => {
    startDownload();
  }, []);

  // ── Percent display ───────────────────────────────────────────
  const percent = Math.round((progress / 114) * 100);

  // ── UI ────────────────────────────────────────────────────────
  return (
    <ScreenWrapper>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#005344', '#002019']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <View style={styles.card}>

        {/* Icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
          {phase === 'done' ? (
            <MaterialIcons name="check-circle" size={64} color="#4ade80" />
          ) : phase === 'error' ? (
            <MaterialIcons name="wifi-off" size={64} color="#f87171" />
          ) : (
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 80, height: 80, borderRadius: 16 }}
              resizeMode="contain"
            />
          )}
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>
          {phase === 'done'
            ? 'Quran Downloaded'
            : phase === 'error'
            ? 'Download Failed'
            : 'Downloading Quran'}
        </Text>

        <Text style={styles.subtitle}>
          {phase === 'done'
            ? 'All 114 Surahs are saved on your device.'
            : phase === 'error'
            ? errorMsg
            : 'This happens once. You can read offline forever after.'}
        </Text>

        {/* Progress area */}
        {(phase === 'downloading' || phase === 'inserting') && (
          <View style={styles.progressSection}>
            {/* Bar track */}
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Labels */}
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {phase === 'downloading'
                  ? currentSurah
                  : `${currentSurah} — ${progress}/114 Surahs`}
              </Text>
              <Text style={styles.progressPercent}>{percent}%</Text>
            </View>
          </View>
        )}

        {/* Retry button (error state) */}
        {phase === 'error' && (
          <TouchableOpacity style={styles.retryBtn} onPress={startDownload} activeOpacity={0.8}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {/* Done check animation */}
        {phase === 'done' && (
          <View style={styles.doneRow}>
            <MaterialIcons name="offline-bolt" size={16} color="#4ade80" />
            <Text style={styles.doneText}>Works offline — no internet needed</Text>
          </View>
        )}
      </View>

      {/* Footer note */}
      {(phase === 'downloading' || phase === 'inserting') && (
        <Text style={styles.footer}>
          Please keep the app open until the download completes.
        </Text>
      )}
    </ScreenWrapper>
);
};

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  iconWrap: { marginBottom: 20 },

  title: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  progressSection: { width: '100%' },
  barTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
    marginRight: 8,
  },
  progressPercent: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  retryText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  doneText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#4ade80',
    fontWeight: '600',
  },

  footer: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});

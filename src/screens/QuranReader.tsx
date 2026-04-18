import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { fetchSurah, Ayah } from '../services/quranApi';
import { useAppStore } from '../store/useAppStore';
import { HapticButton } from '../components/HapticButton';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface QuranReaderProps {
  route: { params: { surahNumber: number; surahName?: string } };
  navigation: any;
}

interface QueueItem {
  url: string;
  /** null = Bismillah pre-track; otherwise global ayah number (for highlight) */
  ayahNumber: number | null;
  /** numberInSurah for display; null when bismillah */
  numberInSurah: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS / HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const ayahUrl = (globalNum: number) =>
  `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`;

const BISMILLAH_URL = ayahUrl(1);
const NO_BISMILLAH_SURAHS = new Set([9]);

function buildQueue(
  surahNumber: number,
  ayahs: Ayah[],
  startIndex: number,
): QueueItem[] {
  const queue: QueueItem[] = [];

  if (
    startIndex === 0 &&
    !NO_BISMILLAH_SURAHS.has(surahNumber) &&
    surahNumber !== 1
  ) {
    queue.push({ url: BISMILLAH_URL, ayahNumber: null, numberInSurah: null });
  }

  for (let i = startIndex; i < ayahs.length; i++) {
    const a = ayahs[i];
    queue.push({ url: ayahUrl(a.number), ayahNumber: a.number, numberInSurah: a.numberInSurah });
  }

  return queue;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const QuranReader: React.FC<QuranReaderProps> = ({ route, navigation }) => {
  const { surahNumber, surahName } = route.params;

  // ── Data state ────────────────────────────────────────────────
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahInfo, setSurahInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ── Session persistence ───────────────────────────────────────
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const savedStartIndexRef = useRef<number>(0);

  useEffect(() => {
    AsyncStorage.getItem(`@quran_session_${surahNumber}`).then((val) => {
      if (val) {
        const savedIndex = parseInt(val, 10);
        if (!isNaN(savedIndex)) {
          savedStartIndexRef.current = savedIndex;
          setHasSavedSession(true);
        }
      }
    });

    return () => { clearQueue(); };
  }, [surahNumber]);

  const saveSession = useCallback(async (indexInAyahsArray: number) => {
    try {
      await AsyncStorage.setItem(`@quran_session_${surahNumber}`, indexInAyahsArray.toString());
      savedStartIndexRef.current = indexInAyahsArray;
      setHasSavedSession(true);
    } catch (_) {}
  }, [surahNumber]);

  // ── Audio engine refs ─────────────────────────────────────────
  const soundRef = useRef<Audio.Sound | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const playIndexRef = useRef<number>(0);
  const isQueueActiveRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const playAyahRef = useRef<((index: number) => Promise<void>) | null>(null);

  // ── Audio UI state ───────────────────────────────────────────
  const [activeAyahNum, setActiveAyahNum] = useState<number | null>(null);
  const [isBismillahPlaying, setIsBismillahPlaying] = useState(false);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0); 
  const [isPaused, setIsPaused] = useState(false);

  // ── Ayah of My Life state ─────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const { setAyahOfMyLife, setLastReading } = useAppStore();

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchSurah(surahNumber)
      .then(({ surah, ayahs: a }) => { 
        setSurahInfo(surah); 
        setAyahs(a); 
        // Update last reading immediately to Ayah 1 upon loading
        setLastReading({
          surahNumber: surah.number,
          surahName: surah.englishName,
          ayahNumber: 1,
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [surahNumber, setLastReading]);

  useEffect(() => {
    try {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true, // Crucial for a real audio player experience
      }).catch((e) => console.log('Audio init error:', e));
    } catch (e) {
      console.log('Audio sync init error:', e);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // AUDIO ENGINE
  // ─────────────────────────────────────────────────────────────

  const clearQueue = useCallback(async () => {
    isQueueActiveRef.current = false;
    queueRef.current = [];
    
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log('Error clearing audio:', e);
      }
      soundRef.current = null;
    }
    
    // Stop any ongoing Text-To-Speech translation playback safely
    try {
      Speech.stop();
    } catch (e) {
      console.log('Error stopping speech:', e);
    }

    setActiveAyahNum(null);
    setIsBismillahPlaying(false);
    setIsQueueLoading(false);
    setCurrentProgress(0);
    setIsPaused(false);
    isPausedRef.current = false;
  }, []);

  const playAyah = useCallback(async (index: number) => {
    const queue = queueRef.current;

    if (!isQueueActiveRef.current || isPausedRef.current) return;

    if (index >= queue.length || index < 0) {
      isQueueActiveRef.current = false;
      setActiveAyahNum(null);
      setIsBismillahPlaying(false);
      setCurrentProgress(0);
      setIsQueueLoading(false);
      setIsPaused(false);
      isPausedRef.current = false;
      return;
    }

    const item = queue[index];
    playIndexRef.current = index;

    // Track for resume logic (find actual array index, not queue index)
    const ayahIndexToSave = item.ayahNumber === null 
      ? 0 
      : ayahs.findIndex(a => a.number === item.ayahNumber);
    if (ayahIndexToSave !== -1) {
      saveSession(ayahIndexToSave);
    }
    
    // Also update global store for "Last Reading" widget
    setLastReading({
      surahNumber,
      surahName: surahName || surahInfo?.englishName || 'Unknown Surah',
      ayahNumber: item.numberInSurah ?? 1,
    });

    if (item.ayahNumber === null) {
      setIsBismillahPlaying(true);
      setActiveAyahNum(null);
    } else {
      setIsBismillahPlaying(false);
      setActiveAyahNum(item.ayahNumber);
    }
    
    setCurrentProgress(0);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsQueueLoading(true);

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log('Error unloading previous audio:', e);
      }
      soundRef.current = null;
    }

    try {
      console.log(`[QuranReader] Playing Arabic ayah ${item.ayahNumber || 'Bismillah'}`);
      const { sound } = await Audio.Sound.createAsync(
        { uri: item.url },
        { shouldPlay: true, progressUpdateIntervalMillis: 250 },
        (status) => {
          if (!status.isLoaded) return;

          if (status.durationMillis && status.positionMillis != null) {
            setCurrentProgress(status.positionMillis / status.durationMillis);
          }

          if (status.didJustFinish) {
            // Prevent multiple triggers from native bridge
            if (soundRef.current) {
              soundRef.current.setOnPlaybackStatusUpdate(null);
            }
            setCurrentProgress(1);
            console.log(`[QuranReader] Arabic finished for ayah ${item.ayahNumber || 'Bismillah'}`);
            
            // TTS Injection layer
            const storeState = useAppStore.getState();
            const shouldSpeak = storeState.playTranslationAudio;
            const ttsLang = storeState.translationLang;
            
            // Find the translation string for this specific ayah
            const currentAyah = item.ayahNumber !== null 
              ? ayahs.find(a => a.number === item.ayahNumber) 
              : null;
            
            const triggerNextAyah = () => {
              if (isPausedRef.current || !isQueueActiveRef.current) return;
              console.log(`[QuranReader] Moving to ayah ${index + 1}`);
              setTimeout(() => { 
                if (playAyahRef.current) playAyahRef.current(index + 1); 
              }, 250);
            };

            if (shouldSpeak && currentAyah?.translation && !isPausedRef.current) {
              const playTTS = async () => {
                try {
                  let langTag = 'en-US';
                  let ttsLangCode = 'en';
                  
                  if (ttsLang === 'ml') { langTag = 'ml-IN'; ttsLangCode = 'ml'; }
                  else if (ttsLang === 'hi') { langTag = 'hi-IN'; ttsLangCode = 'hi'; }
                  
                  // Verification Phase
                  const voices = await Speech.getAvailableVoicesAsync();
                  const isSupported = ttsLangCode === 'en' || voices.some(v => {
                    const low = v.language.toLowerCase();
                    return low.startsWith(ttsLangCode) || low.includes(ttsLangCode);
                  });
                  
                  console.log(`[QuranReader] ${ttsLang === 'ml' ? 'Malayalam' : ttsLang === 'hi' ? 'Hindi' : 'English'} supported: ${isSupported}`);
                  
                  if (!isSupported) {
                    console.log(`[QuranReader] Skipping ${ttsLang} TTS (Unsupported)`);
                    triggerNextAyah();
                    return; // Skip immediately
                  }
                  
                  let translationFinished = false;

                  const failsafeTimeout = setTimeout(() => {
                    if (!translationFinished && !isPausedRef.current) {
                      translationFinished = true;
                      console.log('[QuranReader] TTS Timeout! Forcing next.');
                      try { Speech.stop(); } catch(e) {}
                      triggerNextAyah();
                    }
                  }, Math.max(currentAyah.translation.length * 100 + 4000, 8000));

                  console.log(`[QuranReader] Playing translation for ayah ${currentAyah.number} in ${langTag}`);
                  Speech.speak(currentAyah.translation, {
                    language: langTag,
                    onDone: () => {
                      if (!translationFinished && !isPausedRef.current) {
                        translationFinished = true;
                        clearTimeout(failsafeTimeout);
                        console.log('[QuranReader] TTS finished');
                        triggerNextAyah();
                      }
                    },
                    onError: (err) => {
                      if (!translationFinished && !isPausedRef.current) {
                        translationFinished = true;
                        clearTimeout(failsafeTimeout);
                        console.log('[QuranReader] TTS Error:', err);
                        triggerNextAyah();
                      }
                    }
                  });
                } catch (e) {
                  console.log('[QuranReader] TTS Sync Error:', e);
                  triggerNextAyah();
                }
              };
              playTTS();
            } else {
              triggerNextAyah();
            }
          }
        },
      );
      soundRef.current = sound;
      setIsQueueLoading(false);
    } catch (_) {
      setTimeout(() => { if (playAyahRef.current) playAyahRef.current(index + 1) }, 500);
    }
  }, [ayahs, saveSession, surahNumber, surahName, surahInfo]);

  useEffect(() => {
    playAyahRef.current = playAyah;
  }, [playAyah]);

  const playSurahFromStart = useCallback(
    async (startAyahIndex: number = 0) => {
      await clearQueue();

      if (ayahs.length === 0) return;

      const queue = buildQueue(surahNumber, ayahs, startAyahIndex);
      queueRef.current = queue;
      isQueueActiveRef.current = true;
      playIndexRef.current = 0;

      setIsQueueLoading(true);
      await playAyah(0);
    },
    [ayahs, surahNumber, clearQueue, playAyah],
  );

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) {
      const startIndex = hasSavedSession ? savedStartIndexRef.current : 0;
      await playSurahFromStart(startIndex);
      return;
    }
    
    if (isPaused) {
      await soundRef.current.playAsync();
      setIsPaused(false);
      isPausedRef.current = false;
      isQueueActiveRef.current = true;
    } else {
      await soundRef.current.pauseAsync();
      setIsPaused(true);
      isPausedRef.current = true;
      try { Speech.stop(); } catch (e) { console.log('TTS Stop Error:', e); }
    }
  }, [isPaused, playSurahFromStart, hasSavedSession]);

  const handleNext = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    try { Speech.stop(); } catch (e) {}
    const nextIdx = playIndexRef.current + 1;
    if (nextIdx < queueRef.current.length) {
      await playAyah(nextIdx);
    } else {
      clearQueue();
    }
  }, [playAyah, clearQueue]);

  const handlePrev = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    try { Speech.stop(); } catch (e) {}
    const prevIdx = playIndexRef.current - 1;
    if (prevIdx >= 0) {
      await playAyah(prevIdx);
    } else {
      await playAyah(0);
    }
  }, [playAyah]);

  const handleAyahPress = useCallback(
    async (ayah: Ayah) => {
      if (activeAyahNum === ayah.number) {
        await togglePlayPause();
        return;
      }

      const startIndex = ayahs.findIndex((a) => a.number === ayah.number);
      if (startIndex === -1) return;

      await playSurahFromStart(startIndex);
    },
    [activeAyahNum, ayahs, playSurahFromStart, togglePlayPause],
  );

  // ─────────────────────────────────────────────────────────────
  // AYAH OF MY LIFE
  // ─────────────────────────────────────────────────────────────

  const handleLongPress = (ayah: Ayah) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedAyah(ayah);
    setShowModal(true);
  };

  const handleSetAyahOfLife = () => {
    if (!selectedAyah) return;
    setAyahOfMyLife({
      arabic: selectedAyah.text,
      translation: selectedAyah.translation ?? '',
      reference: `Surah ${surahInfo?.englishName ?? ''} ${surahNumber}:${selectedAyah.numberInSurah}`,
    });
    setShowModal(false);
    Animated.sequence([
      Animated.timing(shimmerAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(shimmerAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // DERIVED UI VALUES
  // ─────────────────────────────────────────────────────────────

  const isAnythingPlaying = isQueueActiveRef.current || isBismillahPlaying || activeAyahNum !== null;
  const displayAyahInSurah = isBismillahPlaying
    ? 'Bismillah…'
    : ayahs.find((a) => a.number === activeAyahNum)?.numberInSurah
      ? `Ayah ${ayahs.find((a) => a.number === activeAyahNum)!.numberInSurah}`
      : null;

  // Determine what the top play button should say
  let topBtnText = 'Play Full Surah';
  if (isAnythingPlaying) {
    topBtnText = isPaused ? 'Resume Recitation' : 'Stop Recitation';
  } else if (hasSavedSession && savedStartIndexRef.current > 0) {
    topBtnText = `Resume from Ayah ${ayahs[savedStartIndexRef.current]?.numberInSurah || 1}`;
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER SINGLE AYAH
  // ─────────────────────────────────────────────────────────────

  const renderAyah = ({ item }: { item: Ayah }) => {
    const isActive = activeAyahNum === item.number;
    const isThisPlaying = isActive && !isPaused;
    const isLoadingThis = isQueueLoading && isActive;

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.88}
        style={[styles.ayahBlock, isActive && styles.ayahBlockActive]}
      >
        <View style={styles.ayahHeaderRow}>
          <View style={styles.ayahNumCircle}>
            <Text style={styles.ayahNum}>{item.numberInSurah}</Text>
          </View>

          <TouchableOpacity
            id={`audio-btn-${item.numberInSurah}`}
            style={[styles.audioBtn, isActive && styles.audioBtnActive]}
            onPress={() => handleAyahPress(item)}
            activeOpacity={0.75}
          >
            {isLoadingThis ? (
              <ActivityIndicator size="small" color={isActive ? '#fff' : Colors.primary} />
            ) : (
              <MaterialIcons
                name={isThisPlaying ? 'pause' : 'play-arrow'}
                size={20}
                color={isActive ? '#fff' : Colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.arabicText}>{item.text}</Text>

        {isActive && (
          <View style={styles.miniProgressBg}>
            <View style={[styles.miniProgressFill, { width: `${Math.round(currentProgress * 100)}%` as any }]} />
          </View>
        )}

        {item.translation ? <Text style={styles.translationText}>{item.translation}</Text> : null}
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // LIST HEADER
  // ─────────────────────────────────────────────────────────────

  const ListHeader = () => (
    <View style={styles.bismillahContainer}>
      {surahNumber !== 9 && (
        <View style={[styles.bismillahRow, isBismillahPlaying && styles.bismillahRowActive]}>
          <Text style={styles.bismillahText}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          {isBismillahPlaying && !isPaused && (
            <View style={styles.bismillahPlayPulse}>
              <MaterialIcons name="graphic-eq" size={16} color={Colors.primary} />
            </View>
          )}
        </View>
      )}

      <View style={styles.surahMeta}>
        <Text style={styles.surahMetaText}>
          {surahInfo?.numberOfAyahs} Ayahs • {surahInfo?.revelationType}
        </Text>
      </View>

      <TouchableOpacity
        id="play-surah-btn"
        style={styles.playSurahBtn}
        onPress={() => {
          if (isAnythingPlaying && !isPaused) {
            clearQueue();
          } else if (isAnythingPlaying && isPaused) {
            togglePlayPause();
          } else {
            playSurahFromStart(hasSavedSession ? savedStartIndexRef.current : 0);
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isAnythingPlaying && !isPaused ? ['#C0392B', '#992D22'] : [Colors.primary, '#0A4A3A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <MaterialIcons
          name={isAnythingPlaying && !isPaused ? 'stop' : 'play-circle-outline'}
          size={22}
          color="#fff"
        />
        <Text style={styles.playSurahBtnText}>{topBtnText}</Text>
        {isQueueLoading && !isBismillahPlaying && !activeAyahNum && (
          <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
        )}
      </TouchableOpacity>
    </View>
  );

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#F8F6F1', '#FFFFFF']} style={StyleSheet.absoluteFill} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { clearQueue(); navigation.goBack(); }} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.surahTitle}>{surahInfo?.englishName ?? surahName}</Text>
          <Text style={styles.surahArabic}>{surahInfo?.name}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Surah…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialIcons name="wifi-off" size={48} color={Colors.textMuted} />
          <Text style={styles.errorText}>Failed to load surah.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(false); setLoading(true);
              fetchSurah(surahNumber).then(({ surah, ayahs: a }) => { setSurahInfo(surah); setAyahs(a); }).catch(() => setError(true)).finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={ayahs}
          keyExtractor={(a) => String(a.number)}
          renderItem={renderAyah}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={15}
          windowSize={8}
          extraData={{ activeAyahNum, isBismillahPlaying, isQueueLoading, currentProgress, isPaused }}
          ListHeaderComponent={<ListHeader />}
          ListFooterComponent={
            <View style={styles.footer}>
              <View style={styles.separator} />
              <Text style={styles.footerText}>End of Surah {surahInfo?.englishName}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Sukoon')}>
                <Text style={styles.sukoonPrompt}>Touched by this? Write in Sukoon →</Text>
              </TouchableOpacity>
              <View style={{ height: 160 }} /> 
            </View>
          }
        />
      )}

      {/* ── Enhanced Bottom Audio Bar ── */}
      {(isAnythingPlaying) && (
        <View style={styles.audioBar}>
          {/* Progress bar across top of audio bar */}
          <View style={styles.audioProgressBg}>
            <View style={[styles.audioProgressFill, { flex: currentProgress }]} />
            <View style={{ flex: Math.max(0, 1 - currentProgress) }} />
          </View>
          
          <View style={styles.audioBarContent}>
            {/* Title / Info */}
            <View style={styles.audioInfoCol}>
              <Text style={styles.audioTitle} numberOfLines={1}>
                {isBismillahPlaying ? 'Bismillah' : `Ayah ${ayahs.find((a) => a.number === activeAyahNum)?.numberInSurah ?? ''}`}
              </Text>
              <Text style={styles.audioSubtitle}>{surahInfo?.englishName}</Text>
            </View>

            {/* Controls */}
            <View style={styles.audioControlsRow}>
              <TouchableOpacity style={styles.controlBtn} onPress={handlePrev} disabled={isQueueLoading}>
                <MaterialIcons name="skip-previous" size={26} color={Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.playPauseBtn} onPress={togglePlayPause}>
                {isQueueLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name={isPaused ? "play-arrow" : "pause"} size={30} color="#fff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn} onPress={handleNext} disabled={isQueueLoading}>
                <MaterialIcons name="skip-next" size={26} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Close / Stop */}
            <TouchableOpacity style={styles.closeBtn} onPress={clearQueue} activeOpacity={0.6}>
              <MaterialIcons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Shimmer and Modal basically unchanged */}
      <Animated.View style={[styles.shimmerBanner, { opacity: shimmerAnim }]} pointerEvents="none">
        <LinearGradient colors={['#D4AF37', '#B8950A']} style={styles.shimmerGradient}>
          <Text style={styles.shimmerText}>✨ This ayah is now your anchor.</Text>
          <Text style={styles.shimmerSubtext}>May it guide you always.</Text>
        </LinearGradient>
      </Animated.View>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>⭐</Text>
            <Text style={styles.modalTitle}>Set as Your Ayah of My Life?</Text>
            <Text style={styles.modalArabic}>{selectedAyah?.text}</Text>
            <Text style={styles.modalTranslation}>{selectedAyah?.translation}</Text>
            <HapticButton onPress={handleSetAyahOfLife} style={styles.modalConfirmBtn} hapticType="heavy">
              <LinearGradient colors={['#D4AF37', '#B8950A']} style={styles.modalConfirmGradient}>
                <Text style={styles.modalConfirmText}>Set as My Ayah</Text>
              </LinearGradient>
            </HapticButton>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 64, paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(248,246,241,0.97)', zIndex: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  surahTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textDark },
  surahArabic: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 16, color: Colors.primary, marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted },
  errorText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.textDark },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  retryText: { color: '#fff', fontFamily: 'Plus Jakarta Sans', fontWeight: '700' },
  listContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: 130 },
  bismillahContainer: { paddingVertical: Spacing.xl, alignItems: 'center', gap: 12 },
  bismillahRow: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 16, gap: 8 },
  bismillahRowActive: { backgroundColor: 'rgba(15,109,91,0.08)', borderWidth: 1, borderColor: 'rgba(15,109,91,0.15)' },
  bismillahText: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 26, color: Colors.primary, textAlign: 'center', lineHeight: 48 },
  bismillahPlayPulse: { backgroundColor: 'rgba(15,109,91,0.1)', borderRadius: 12, padding: 4, marginTop: 4 },
  surahMeta: { backgroundColor: 'rgba(15,109,91,0.08)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  surahMetaText: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '600', color: Colors.primary, letterSpacing: 0.5 },
  playSurahBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '90%', paddingVertical: 14, borderRadius: 18, overflow: 'hidden', marginTop: 4, ...Shadows.green },
  playSurahBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#fff' },
  ayahBlock: { marginBottom: Spacing.xl, paddingBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 4 },
  ayahBlockActive: { backgroundColor: 'rgba(15,109,91,0.05)', borderRadius: BorderRadius.lg, padding: Spacing.md, borderBottomWidth: 0 },
  ayahHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  ayahNumCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  ayahNum: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: Typography.weights.bold, color: '#fff' },
  audioBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(15,109,91,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,109,91,0.2)' },
  audioBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  arabicText: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 26, color: Colors.primary, textAlign: 'right', lineHeight: 52, fontWeight: Typography.weights.medium, marginBottom: Spacing.md },
  miniProgressBg: { height: 3, backgroundColor: 'rgba(15,109,91,0.15)', borderRadius: 2, marginBottom: Spacing.md, overflow: 'hidden' },
  miniProgressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  translationText: { fontFamily: 'Manrope', fontSize: Typography.sizes.md, color: Colors.textLight, lineHeight: 24, textAlign: 'left' },
  footer: { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.md },
  separator: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', width: '60%', marginBottom: 16 },
  footerText: { fontSize: Typography.sizes.md, color: Colors.textMuted, fontStyle: 'italic' },
  sukoonPrompt: { fontFamily: 'Manrope', fontSize: Typography.sizes.md, color: Colors.primary, fontWeight: Typography.weights.semibold, textAlign: 'center' },
  shimmerBanner: { position: 'absolute', bottom: 120, left: Spacing.base, right: Spacing.base, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.gold },
  shimmerGradient: { padding: Spacing.md, alignItems: 'center' },
  shimmerText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: '#fff' },
  shimmerSubtext: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  modalCard: { backgroundColor: '#fff', borderRadius: BorderRadius['2xl'], padding: Spacing.xl, width: '100%', alignItems: 'center', ...Shadows.lg },
  modalEmoji: { fontSize: 40, marginBottom: Spacing.md },
  modalTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textDark, textAlign: 'center', marginBottom: Spacing.base },
  modalArabic: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 20, color: Colors.primary, textAlign: 'center', lineHeight: 40, marginBottom: Spacing.md },
  modalTranslation: { fontFamily: 'Manrope', fontSize: Typography.sizes.md, color: Colors.textLight, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22 },
  modalConfirmBtn: { width: '100%', borderRadius: BorderRadius.full, overflow: 'hidden', marginBottom: Spacing.md },
  modalConfirmGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: BorderRadius.full },
  modalConfirmText: { fontFamily: 'Plus Jakarta Sans', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: '#fff' },
  modalCancelText: { fontFamily: 'Manrope', fontSize: Typography.sizes.md, color: Colors.textLight, paddingVertical: 8 },

  // ── Enhanced Bottom Audio Bar styles ──
  audioBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    ...Shadows.md,
  },
  audioProgressBg: { width: '100%', flexDirection: 'row', height: 3, backgroundColor: 'rgba(15,109,91,0.1)' },
  audioProgressFill: { height: '100%', backgroundColor: Colors.primary },
  audioBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 },
  audioInfoCol: { flex: 1, justifyContent: 'center' },
  audioTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  audioSubtitle: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted },
  audioControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1.5, justifyContent: 'center' },
  playPauseBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.md,
  },
  controlBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(15,109,91,0.06)',
  },
  closeBtn: { flex: 0.5, alignItems: 'flex-end', justifyContent: 'center', height: 40, width: 40 },
});

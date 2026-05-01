import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  PanResponder,
  Dimensions,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { fetchSurah, Ayah } from '../services/quranApi';
import { removeBismillahFromText } from '../utils/bismillah';
import { useAppStore } from '../store/useAppStore';
import { HapticButton } from '../components/HapticButton';
import { quranAudioDownloadManager } from '../services/quranAudioDownloadManager';
import { ScreenWrapper, useScreenBottomInset } from '../components/ScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


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

const CDN_AYAH_URL = (globalNum: number) =>
  `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`;

/** Returns local URI if cached, falls back to CDN URL */
const ayahUrl = async (globalNum: number): Promise<string> =>
  quranAudioDownloadManager.getBestUri(globalNum);

const BISMILLAH_URL = CDN_AYAH_URL(1);
const NO_BISMILLAH_SURAHS = new Set([9]);

async function buildQueue(
  surahNumber: number,
  ayahs: Ayah[],
  startIndex: number,
): Promise<QueueItem[]> {
  const queue: QueueItem[] = [];

  if (
    startIndex === 0 &&
    !NO_BISMILLAH_SURAHS.has(surahNumber) &&
    surahNumber !== 1
  ) {
    // Use local bismillah (ayah 1) if available, otherwise CDN
    const bismillahUri = await quranAudioDownloadManager.getBestUri(1);
    queue.push({ url: bismillahUri, ayahNumber: null, numberInSurah: null });
  }

  for (let i = startIndex; i < ayahs.length; i++) {
    const a = ayahs[i];
    const url = await ayahUrl(a.number);
    queue.push({ url, ayahNumber: a.number, numberInSurah: a.numberInSurah });
  }

  return queue;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

// ── Arabic numeral converter ──────────────────────────────────────
const toArabicNumeral = (n: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(n).split('').map(d => arabicNumerals[parseInt(d)] ?? d).join('');
};

const AyahItem = React.memo(({
  item,
  isActive,
  isThisPlaying,
  isLoadingThis,
  currentProgress,
  onLongPress,
  onPress,
  showTransliteration,
  isStarred,
}: {
  item: Ayah;
  isActive: boolean;
  isThisPlaying: boolean;
  isLoadingThis: boolean;
  currentProgress: number;
  onLongPress: (item: Ayah) => void;
  onPress: (item: Ayah) => void;
  showTransliteration: boolean;
  isStarred: boolean;
}) => {
  return (
    <TouchableOpacity
      onLongPress={() => onLongPress(item)}
      onPress={() => onPress(item)}
      activeOpacity={0.92}
      style={[
        styles.ayahBlock,
        isActive && styles.ayahBlockActive,
      ]}
    >
      {/* ── Arabic text block ── */}
      <View style={styles.arabicBlock}>
        <Text style={[styles.arabicText, isActive && styles.arabicTextActive]}>
          {item.text}
          {'  '}
          <Text style={[styles.ayahMarker, isActive && styles.ayahMarkerActive]}>
            {'﴿'}{toArabicNumeral(item.numberInSurah)}{'﴾'}
          </Text>
        </Text>

        {/* Active playback progress bar */}
        {isActive && (
          <View style={styles.miniProgressBg}>
            <View style={[styles.miniProgressFill, { width: `${Math.round(currentProgress * 100)}%` as any }]} />
          </View>
        )}
      </View>

      {/* ── Transliteration (hidden by default) ── */}
      {showTransliteration && item.transliteration ? (
        <Text style={styles.transliterationText}>{item.transliteration}</Text>
      ) : null}

      {/* ── Translation row ── */}
      <View style={styles.translationRow}>
        <View style={[styles.ayahNumBadge, isActive && styles.ayahNumBadgeActive]}>
          {isLoadingThis ? (
            <ActivityIndicator size="small" color={isActive ? '#fff' : Colors.primary} />
          ) : (
            <Text style={[styles.ayahNumBadgeText, isActive && styles.ayahNumBadgeTextActive]}>
              {item.numberInSurah}
            </Text>
          )}
        </View>

        <Text style={[styles.translationText, isActive && styles.translationTextActive]}>
          {item.translation}
        </Text>

        {isStarred && (
          <Text style={styles.starBadge}>⭐</Text>
        )}
      </View>

      {/* ── Hairline divider ── */}
      {!isActive && <View style={styles.ayahDivider} />}
    </TouchableOpacity>
  );
}, (prev, next) => {
  return prev.item.number === next.item.number &&
    prev.item.text === next.item.text &&
    prev.isActive === next.isActive &&
    prev.isThisPlaying === next.isThisPlaying &&
    prev.isLoadingThis === next.isLoadingThis &&
    prev.currentProgress === next.currentProgress &&
    prev.showTransliteration === next.showTransliteration &&
    prev.isStarred === next.isStarred;
});

export const QuranReader = ({ route, navigation }: any) => {
  const { surahNumber, surahName } = route.params;

  const [showTransliteration, setShowTransliteration] = useState(false);
  const [starredAyahs, setStarredAyahs] = useState<Set<number>>(new Set());
  const ayahOfMyLife = useAppStore(state => state.ayahOfMyLife);

  // ── Data state ────────────────────────────────────────────────
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahInfo, setSurahInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ── Session persistence ───────────────────────────────────────
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const savedStartIndexRef = useRef<number>(0);
  const hasIncrementedRef = useRef<boolean>(false);

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
    } catch (_) { }
  }, [surahNumber]);

  // ── Audio engine refs ─────────────────────────────────────────
  const soundRef = useRef<Audio.Sound | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const playIndexRef = useRef<number>(0);
  const isQueueActiveRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const flatListRef = useRef<FlashListRef<Ayah>>(null);
  const playAyahRef = useRef<((index: number) => Promise<void>) | null>(null);
  const playbackTokenRef = useRef<number>(0);

  // ── Audio UI state ───────────────────────────────────────────
  const [activeAyahNum, setActiveAyahNum] = useState<number | null>(null);
  const [isBismillahPlaying, setIsBismillahPlaying] = useState(false);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const [scrubberVisible, setScrubberVisible] = useState(false);
  const [scrubberAyah, setScrubberAyah] = useState(1);
  const ayahsRef = useRef<Ayah[]>([]);
  const ayahHeightsRef = useRef<Record<number, number>>({});
  const scrubberTrackRef = useRef<{ y: number; height: number }>({ y: 0, height: 0 });
  const totalContentHeightRef = useRef(0);
  const currentScrollOffsetRef = useRef(0);
  const scrubberTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listHeightRef = useRef(0);
  const scrubberY = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);

  const SCRUBBER_TRACK_HEIGHT = Dimensions.get('window').height * 0.55;
  const SCRUBBER_TOP_OFFSET = 120; // approx below header

  const handleScrubberMove = useCallback((pageY: number) => {
    const currentAyahs = ayahsRef.current;
    if (currentAyahs.length === 0) return;

    const { y: trackY, height: trackHeight } = scrubberTrackRef.current;
    if (trackHeight === 0) return;

    // Position of finger within the track, clamped 0..trackHeight
    const relativeY = pageY - trackY;
    const clampedY = Math.max(0, Math.min(relativeY, trackHeight));
    const fraction = clampedY / trackHeight;

    // Update handle visual
    scrubberY.setValue(clampedY);

    // Ayah label — use round and multiply by length-1 so
    // fraction=0 → ayah 1, fraction=1 → last ayah exactly
    const ayahIndex = Math.min(
      Math.round(fraction * (currentAyahs.length - 1)),
      currentAyahs.length - 1
    );
    setScrubberAyah(currentAyahs[ayahIndex].numberInSurah ?? ayahIndex + 1);

    // Scroll using total content height — no estimation needed
    const totalHeight = totalContentHeightRef.current;
    if (totalHeight === 0) return;

    const listHeight = Dimensions.get('window').height;
    const maxOffset = Math.max(0, totalHeight - listHeight);
    const targetOffset = fraction * maxOffset;

    flatListRef.current?.scrollToOffset({
      offset: targetOffset,
      animated: false,
    });
  }, [scrubberY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        if (scrubberTimeout.current) clearTimeout(scrubberTimeout.current);
        setScrubberVisible(true);
        // Handle the initial touch position immediately
        handleScrubberMove(evt.nativeEvent.pageY);
      },

      onPanResponderMove: (evt) => {
        handleScrubberMove(evt.nativeEvent.pageY);
      },

      onPanResponderRelease: () => {
        isDragging.current = false;
        scrubberTimeout.current = setTimeout(() => {
          setScrubberVisible(false);
        }, 1200);
      },

      onPanResponderTerminate: () => {
        isDragging.current = false;
        setScrubberVisible(false);
      },
    })
  ).current;

  // ── Ayah of My Life state ─────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const setAyahOfMyLife = useAppStore(state => state.setAyahOfMyLife);
  const setLastReading = useAppStore(state => state.setLastReading);
  const isAdhanPlaying = useAppStore(state => state.isAdhanPlaying);
  const incrementMilestone = useAppStore(state => state.incrementMilestone);
  const translationLang = useAppStore(state => state.translationLang);

  // Force-pause if system Adhan triggers globally
  useEffect(() => {
    if (isAdhanPlaying && !isPaused && soundRef.current) {
      console.log('[QuranReader] Adhan intercept trigger: Pausing recitation.');
      soundRef.current.pauseAsync().catch(() => { });
      setIsPaused(true);
      isPausedRef.current = true;
      try { Speech.stop(); } catch (e) { }
    }
  }, [isAdhanPlaying, isPaused]);

  useEffect(() => {
    setLoading(true);
    setError(false);

    // Stop any playing audio before reloading for a new language
    clearQueue();

    const loadSurah = async () => {
      try {
        const { surah, ayahs: a } = await fetchSurah(surahNumber);

        setSurahInfo(surah);
        setAyahs(a);
        ayahsRef.current = a;
        setLastReading({
          surahNumber: surah.number,
          surahName: surah.englishName,
          ayahNumber: 1,
        });

        if (!hasIncrementedRef.current) {
          incrementMilestone('quranDays');
          hasIncrementedRef.current = true;
        }

        if (savedStartIndexRef.current > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: savedStartIndexRef.current,
              animated: false,
              viewPosition: 0,
            });
          }, 300);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadSurah();
  }, [surahNumber, translationLang, setLastReading]);

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
    playbackTokenRef.current += 1;
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

    playbackTokenRef.current += 1;
    const currentToken = playbackTokenRef.current;

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
                      try { Speech.stop(); } catch (e) { }
                      triggerNextAyah();
                    }
                  }, Math.max((currentAyah.translation?.length || 0) * 100 + 4000, 8000));

                  console.log(`[QuranReader] Playing translation for ayah ${currentAyah.number} in ${langTag}`);
                  Speech.speak(currentAyah.translation || '', {
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

      // If the token changed during the await, it means clearQueue or another playAyah was called.
      // We MUST abort this stale sound object immediately to prevent double playback leaks.
      if (currentToken !== playbackTokenRef.current) {
        console.log(`[QuranReader] Aborting stale audio playback for ayah ${item.ayahNumber}`);
        sound.unloadAsync().catch(() => { });
        return;
      }

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

      const queue = await buildQueue(surahNumber, ayahs, startAyahIndex);
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
    try { Speech.stop(); } catch (e) { }
    const nextIdx = playIndexRef.current + 1;
    if (nextIdx < queueRef.current.length) {
      await playAyah(nextIdx);
    } else {
      clearQueue();
    }
  }, [playAyah, clearQueue]);

  const handlePrev = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    try { Speech.stop(); } catch (e) { }
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
    // Star this ayah permanently in this session
    setStarredAyahs(prev => new Set([...prev, selectedAyah.number]));
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

  const renderAyah = useCallback(({ item }: { item: Ayah }) => {
    const isActive = activeAyahNum === item.number;
    const isThisPlaying = isActive && !isPaused;
    const isLoadingThis = isQueueLoading && isActive;
    const isStarred = starredAyahs.has(item.number) ||
      (ayahOfMyLife?.arabic === item.text);

    return (
      <AyahItem
        item={item}
        isActive={isActive}
        isThisPlaying={isThisPlaying}
        isLoadingThis={isLoadingThis}
        currentProgress={isActive ? currentProgress : 0}
        onLongPress={handleLongPress}
        onPress={handleAyahPress}
        showTransliteration={showTransliteration}
        isStarred={isStarred}
      />
    );
  }, [activeAyahNum, isPaused, isQueueLoading, currentProgress,
    handleLongPress, handleAyahPress, showTransliteration,
    starredAyahs, ayahOfMyLife]);

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

      {/* ── Section label: Arabic ── */}
      <View style={styles.sectionDivider}>
        <View style={styles.sectionDividerLine} />
        <Text style={styles.sectionDividerText}>ARABIC</Text>
        <View style={styles.sectionDividerLine} />
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────

  const insets = useSafeAreaInsets();
  const bottomInset = useScreenBottomInset(false); // stack screen — no tab bar

  // New safe bottom — guarantees minimum clearance on all Android nav types
  const NAV_BAR_EXTRA = Platform.OS === 'android' ? 56 : 0;
  const safeBottom = Math.max(bottomInset, insets.bottom + NAV_BAR_EXTRA);

  return (
    <ScreenWrapper>
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
              fetchSurah(surahNumber).then(({ surah, ayahs: a }) => { const cleaned = a.map((ay, idx) => idx === 0 && surahNumber !== 9 ? { ...ay, text: removeBismillahFromText(ay.text) } : ay); setSurahInfo(surah); setAyahs(cleaned); }).catch(() => setError(true)).finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          ref={flatListRef}
          data={ayahs}
          estimatedItemSize={150}
          keyExtractor={(a) => String(a.number)}
          renderItem={renderAyah}
          onScroll={(evt) => {
            currentScrollOffsetRef.current = evt.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={(_w, h) => {
            totalContentHeightRef.current = h;
          }}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: safeBottom + (isAnythingPlaying ? 100 : 0) }
          ]}
          showsVerticalScrollIndicator={false}
          extraData={{ activeAyahNum, isBismillahPlaying, isQueueLoading, currentProgress, isPaused, showTransliteration, starredAyahs }}
          ListHeaderComponent={<ListHeader />}
          ListFooterComponent={
            <View style={styles.footer}>
              <View style={styles.separator} />
              <Text style={styles.footerText}>End of Surah {surahInfo?.englishName}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Sukoon')}>
                <Text style={styles.sukoonPrompt}>Touched by this? Write in Sukoon →</Text>
              </TouchableOpacity>
              <View style={{ height: 32 }} />
            </View>
          }
        />
      )}

      {/* ── Ayah Scrubber ── */}
      {ayahs.length > 0 && (
        <View
          style={styles.scrubberTrack}
          {...panResponder.panHandlers}
          onLayout={(evt) => {
            const { y, height } = evt.nativeEvent.layout;
            // pageY is needed, not layout y — measure against screen
          }}
          ref={(ref) => {
            if (ref) {
              ref.measure((_x, _y, _w, h, _px, py) => {
                scrubberTrackRef.current = { y: py, height: h };
              });
            }
          }}
        >
          {/* Thin visible track line */}
          <View style={styles.scrubberLine} />

          {/* Draggable handle */}
          <Animated.View
            style={[
              styles.scrubberHandle,
              { transform: [{ translateY: scrubberY }] }
            ]}
          >
            <View style={styles.scrubberDot} />
          </Animated.View>

          {/* Ayah number bubble — only visible while dragging */}
          {scrubberVisible && (
            <Animated.View
              style={[
                styles.scrubberBubble,
                { transform: [{ translateY: scrubberY }] }
              ]}
            >
              <Text style={styles.scrubberBubbleText}>{scrubberAyah}</Text>
            </Animated.View>
          )}
        </View>
      )}

      {/* ── Enhanced Bottom Audio Bar ── */}
      {(isAnythingPlaying) && (
        <View style={[styles.audioBar, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
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
          <Text style={styles.shimmerText}><MaterialIcons name="auto-awesome" size={16} color="#fff" /> This ayah is now your anchor.</Text>
          <Text style={styles.shimmerSubtext}>May it guide you always.</Text>
        </LinearGradient>
      </Animated.View>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialIcons name="star" size={48} color={Colors.accent} />
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
    </ScreenWrapper>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Top bar ──────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(248,246,241,0.97)', zIndex: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  surahTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textDark,
  },
  surahArabic: {
    fontFamily: 'ScheherazadeNew-Regular',
    fontSize: 16, color: Colors.primary, marginTop: 2,
  },


  // ── Loading / Error ───────────────────────────────────────────
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted },
  errorText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.textDark },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  retryText: { color: '#fff', fontFamily: 'Plus Jakarta Sans', fontWeight: '700' },

  // ── List ─────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 20,
    paddingTop: Spacing.md,
  },

  // ── Header (bismillah + play btn) ─────────────────────────────
  bismillahContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  bismillahRow: {
    alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 16, gap: 8,
  },
  bismillahRowActive: {
    backgroundColor: 'rgba(15,109,91,0.08)',
    borderWidth: 1, borderColor: 'rgba(15,109,91,0.15)',
  },
  bismillahText: {
    fontFamily: 'ScheherazadeNew-Regular',
    fontSize: 28, color: '#1B3A2D',
    textAlign: 'center', lineHeight: 52,
  },
  bismillahPlayPulse: {
    backgroundColor: 'rgba(15,109,91,0.1)',
    borderRadius: 12, padding: 4, marginTop: 4,
  },
  surahMeta: {
    backgroundColor: 'rgba(15,109,91,0.07)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
  },
  surahMetaText: {
    fontFamily: 'Manrope', fontSize: 12,
    fontWeight: '600', color: Colors.primary, letterSpacing: 0.5,
  },
  playSurahBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    width: '100%', paddingVertical: 14,
    borderRadius: 18, overflow: 'hidden',
    marginTop: 4, ...Shadows.green,
  },
  playSurahBtnText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 15, fontWeight: '700', color: '#fff',
  },

  // ── Section divider (ARABIC / TRANSLATION labels) ─────────────
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, width: '100%', marginTop: 8,
  },
  sectionDividerLine: {
    flex: 1, height: 1,
    backgroundColor: Colors.accent,
    opacity: 0.3,
  },
  sectionDividerText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 10, fontWeight: '800',
    color: Colors.accent, letterSpacing: 2,
  },

  // ── Ayah item (Mushaf style) ──────────────────────────────────
  ayahBlock: {
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  ayahBlockActive: {
    backgroundColor: 'rgba(15,109,91,0.05)',
    borderRadius: 16,
    paddingHorizontal: 12,
    marginHorizontal: -8,
  },

  // Arabic text — flows right to left, continuous
  arabicBlock: {
    marginBottom: 12,
  },
  arabicText: {
    fontFamily: 'ScheherazadeNew-Regular',
    fontSize: 26,
    color: '#1B3A2D',
    textAlign: 'right',
    lineHeight: 58,
    writingDirection: 'rtl',
  },
  arabicTextActive: {
    color: Colors.primary,
  },

  // Inline ayah number marker ﴿١﴾
  ayahMarker: {
    fontFamily: 'ScheherazadeNew-Regular',
    fontSize: 20,
    color: Colors.accent,
  },
  ayahMarkerActive: {
    color: Colors.primary,
  },

  // Progress bar under active Arabic text
  miniProgressBg: {
    height: 2,
    backgroundColor: 'rgba(15,109,91,0.12)',
    borderRadius: 1,
    marginTop: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },

  // Transliteration row (hidden by default)
  transliterationText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // Translation row
  translationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  ayahNumBadge: {
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  ayahNumBadgeActive: {
    backgroundColor: Colors.primary,
  },
  ayahNumBadgeText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 10, fontWeight: '800',
    color: Colors.accent,
  },
  ayahNumBadgeTextActive: {
    color: '#fff',
  },
  translationText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 24,
  },
  translationTextActive: {
    color: Colors.primary,
  },
  starBadge: {
    fontSize: 14,
    marginTop: 2,
    flexShrink: 0,
  },

  // Hairline divider between ayahs
  ayahDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginTop: 8,
    marginHorizontal: 4,
  },

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.accent,
    opacity: 0.2,
    width: '60%',
    marginBottom: 16,
  },
  footerText: {
    fontSize: Typography.sizes.md,
    color: Colors.textMuted,
    fontStyle: 'italic',
    fontFamily: 'Manrope',
  },
  sukoonPrompt: {
    fontFamily: 'Manrope',
    fontSize: Typography.sizes.md,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },

  // ── Shimmer banner ────────────────────────────────────────────
  shimmerBanner: {
    position: 'absolute',
    bottom: 120,
    left: Spacing.base, right: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden', ...Shadows.gold,
  },
  shimmerGradient: { padding: Spacing.md, alignItems: 'center' },
  shimmerText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold, color: '#fff',
  },
  shimmerSubtext: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)', marginTop: 2,
  },

  // ── Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    width: '100%', alignItems: 'center',
    ...Shadows.lg,
  },
  modalTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textDark,
    textAlign: 'center', marginBottom: Spacing.base,
    marginTop: Spacing.md,
  },
  modalArabic: {
    fontFamily: 'ScheherazadeNew-Regular',
    fontSize: 20, color: Colors.primary,
    textAlign: 'center', lineHeight: 40,
    marginBottom: Spacing.md,
  },
  modalTranslation: {
    fontFamily: 'Manrope',
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.xl, lineHeight: 22,
  },
  modalConfirmBtn: {
    width: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden', marginBottom: Spacing.md,
  },
  modalConfirmGradient: {
    paddingVertical: 16, alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  modalConfirmText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold, color: '#fff',
  },
  modalCancelText: {
    fontFamily: 'Manrope',
    fontSize: Typography.sizes.md,
    color: Colors.textLight, paddingVertical: 8,
  },

  // ── Bottom audio bar ──────────────────────────────────────────
  audioBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
    ...Shadows.md,
  },
  audioProgressBg: {
    width: '100%', flexDirection: 'row',
    height: 3, backgroundColor: 'rgba(15,109,91,0.1)',
  },
  audioProgressFill: { height: '100%', backgroundColor: Colors.primary },
  audioBarContent: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14,
  },
  audioInfoCol: { flex: 1, justifyContent: 'center' },
  audioTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14, fontWeight: '700',
    color: Colors.textDark, marginBottom: 2,
  },
  audioSubtitle: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted },
  audioControlsRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 16, flex: 1.5, justifyContent: 'center',
  },
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
  closeBtn: {
    flex: 0.5, alignItems: 'flex-end',
    justifyContent: 'center', height: 40, width: 40,
  },

  // ── Scrubber ──────────────────────────────────────────────────
  scrubberTrack: {
    position: 'absolute', right: 0, top: 100,
    width: 36,
    height: Dimensions.get('window').height * 0.65,
    alignItems: 'center', justifyContent: 'flex-start',
    zIndex: 20,
  },
  scrubberLine: {
    position: 'absolute', top: 0, bottom: 0,
    width: 2,
    backgroundColor: 'rgba(15,109,91,0.12)',
    borderRadius: 1,
  },
  scrubberHandle: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  scrubberDot: {
    width: 4, height: 36, borderRadius: 2,
    backgroundColor: 'rgba(15,109,91,0.45)',
  },
  scrubberBubble: {
    position: 'absolute', right: 30,
    width: 44, height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 4,
  },
  scrubberBubbleText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12, fontWeight: '800', color: '#fff',
  },
});

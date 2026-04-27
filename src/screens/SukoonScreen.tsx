import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, NativeSpacing as Spacing } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { ScreenWrapper, useScreenBottomInset } from '../components/ScreenWrapper';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'sukoon_reflections_v2';

const DAILY_PROMPTS = [
  'What has Allah placed in your heart today that brings quiet joy?',
  "What are you grateful for that you haven't said aloud yet?",
  'Where did you feel closest to Allah today?',
  'What lesson did today bring that you didn\'t expect?',
  'What would you like to leave behind today and begin fresh tomorrow?',
  'Which moment today felt like a gift from the unseen?',
  'What are you still holding onto that you need to surrender to Allah?',
];

const TODAY_PROMPT = DAILY_PROMPTS[new Date().getDay() % DAILY_PROMPTS.length];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BaseReflection {
  id: string;
  createdAt: string;
}

interface TextReflection extends BaseReflection {
  type: 'text';
  content: string;
}

interface AudioReflection extends BaseReflection {
  type: 'audio';
  fileUri: string;
}

type Reflection = TextReflection | AudioReflection;

// ─── Persistent Storage Helpers ───────────────────────────────────────────────

async function readReflections(): Promise<Reflection[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeReflections(list: Reflection[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('[Sukoon] Failed to write reflections:', e);
  }
}

// ─── Format Helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.getDate().toString(),
    month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function formatSeconds(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SukoonScreen = ({ navigation }: any) => {
  const { profile, incrementMilestone } = useAppStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const [reflectionText, setReflectionText] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  
  const [playingId, setPlayingId] = useState<string | null>(null);

  // ── Refs (avoid stale closures) ────────────────────────────────────────────
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackTokenRef = useRef<number>(0);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    readReflections().then((data) => {
      if (!mounted) return;
      // Newest first
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReflections(sorted);
      setIsLoadingList(false);
    });
    return () => { mounted = false; };
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (soundRef.current) soundRef.current.unloadAsync();
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync();
    };
  }, []);

  // ── Safe storage write (never called inside setState) ────────────────────
  const saveToStorage = useCallback(async (list: Reflection[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[Sukoon] Storage write failed:', e);
    }
  }, []);

  // ── Save Text ──────────────────────────────────────────────────────────────
  const handleSaveText = useCallback(async () => {
    const trimmed = reflectionText.trim();
    if (!trimmed) {
      Alert.alert('Empty', 'Please write something before saving.');
      return;
    }
    setIsSavingText(true);
    const entry: TextReflection = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'text',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    // Use functional updater to get latest state, then persist separately
    let newList: Reflection[] = [];
    setReflections((prev) => {
      newList = [entry, ...prev];
      return newList;
    });
    // Small tick to let React flush state before writing
    await new Promise<void>((r) => setTimeout(r, 0));
    await saveToStorage(newList);
    setReflectionText('');
    setIsSavingText(false);
    incrementMilestone('sukoonCount');
  }, [reflectionText, saveToStorage, incrementMilestone]);

  // ── Voice Recording ────────────────────────────────────────────────────────
  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      // ── STOP ──────────────────────────────────────────────────────────────
      setIsRecording(false);
      if (recTimerRef.current) {
        clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }
      try {
        const rec = recordingRef.current;
        if (!rec) return;
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        recordingRef.current = null;

        // Reset audio mode back to playback
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

        if (!uri) {
          Alert.alert('Error', 'Could not retrieve the recording. Please try again.');
          return;
        }

        const entry: AudioReflection = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'audio',
          fileUri: uri,
          createdAt: new Date().toISOString(),
        };
        const updated = [entry, ...reflections];
        setReflections(updated);
        await saveToStorage(updated);
        incrementMilestone('sukoonCount');
      } catch (err) {
        console.warn('[Sukoon] Stop recording error:', err);
        Alert.alert('Error', 'Failed to save voice reflection.');
        recordingRef.current = null;
      }
    } else {
      // ── START ─────────────────────────────────────────────────────────────
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert(
            'Microphone Required',
            'Please enable microphone access in your device settings to record voice reflections.'
          );
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        recordingRef.current = recording;
        setIsRecording(true);
        setRecSeconds(0);

        recTimerRef.current = setInterval(() => {
          setRecSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        console.warn('[Sukoon] Start recording error:', err);
        Alert.alert('Error', 'Could not start the recording. Please try again.');
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      }
    }
  }, [isRecording, reflections, saveToStorage, incrementMilestone]);

  const handlePlay = useCallback(async (item: AudioReflection) => {
    playbackTokenRef.current += 1;
    const currentToken = playbackTokenRef.current;

    // Stop existing playback
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { /* already unloaded */ }
      soundRef.current = null;
    }

    // Toggle off if same item was playing
    if (playingId === item.id) {
      setPlayingId(null);
      return;
    }

    setPlayingId(item.id);

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: item.fileUri },
        { shouldPlay: true }
      );
      
      // Prevent race condition: if another play was triggered while this was loading, abort.
      if (currentToken !== playbackTokenRef.current) {
        sound.unloadAsync().catch(() => {});
        return;
      }

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          setPlayingId(null);
        }
      });
    } catch (err) {
      console.warn('[Sukoon] Playback error:', err);
      Alert.alert('Playback Error', 'Could not play this voice reflection.');
      setPlayingId(null);
      soundRef.current = null;
    }
  }, [playingId]);

  // ── Delete Single ──────────────────────────────────────────────────────────
  // IMPORTANT: Not wrapped in useCallback so it always sees fresh `reflections`
  // and `playingId` from the current render — avoids stale closure bug.
  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Reflection',
      'Remove this reflection from your garden?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Stop audio if this item is currently playing
            if (playingId === id) {
              try {
                await soundRef.current?.stopAsync();
                await soundRef.current?.unloadAsync();
              } catch { /* already unloaded */ }
              soundRef.current = null;
              setPlayingId(null);
            }
            // Filter from CURRENT reflections (closure is fresh, no stale state)
            const newList = reflections.filter((r) => r.id !== id);
            setReflections(newList);
            await saveToStorage(newList);
          },
        },
      ]
    );
  };

  // ── Clear All ──────────────────────────────────────────────────────────────
  const handleClearAll = () => {
    if (reflections.length === 0) {
      Alert.alert('Garden is empty', 'There are no reflections to clear.');
      return;
    }
    Alert.alert(
      'Clear your space?',
      'Do you wish to release all your reflections and begin anew?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Begin Again',
          style: 'destructive',
          onPress: async () => {
            if (soundRef.current) {
              try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch { /* noop */ }
              soundRef.current = null;
            }
            setPlayingId(null);
            setReflections([]);
            await AsyncStorage.removeItem(STORAGE_KEY);
            setTimeout(() => Alert.alert('', 'Your space is now calm and open.'), 300);
          },
        },
      ]
    );
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const displayed = showAll ? reflections : reflections.slice(0, 4);

  // ── Render ─────────────────────────────────────────────────────────────────
  const bottomInset = useScreenBottomInset();

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity
          id="sukoon-clear-all-btn"
          onPress={handleClearAll}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="delete-sweep" size={24} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Sukoon</Text>
          <Text style={styles.pageSubtitle}>Find stillness in the presence of the Divine</Text>
        </View>

        {/* Prompt Card */}
        <View style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <MaterialIcons name="history-edu" size={16} color={Colors.secondary} />
            <Text style={styles.promptLabel}>DAILY PROMPT</Text>
          </View>
          <Text style={styles.promptQuestion}>{TODAY_PROMPT}</Text>

          {/* Text Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              multiline
              value={reflectionText}
              onChangeText={setReflectionText}
              placeholder="Begin your reflection..."
              placeholderTextColor="rgba(111,121,117,0.7)"
              textAlignVertical="top"
              editable={!isRecording}
            />
            {/* Mic Button */}
            <TouchableOpacity
              id="sukoon-mic-btn"
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPress={handleMicPress}
              activeOpacity={0.7}
            >
              {isRecording ? (
                <View style={styles.recInner}>
                  <MaterialIcons name="stop" size={18} color="#fff" />
                  <Text style={styles.recTimer}>{formatSeconds(recSeconds)}</Text>
                </View>
              ) : (
                <MaterialIcons name="mic" size={22} color={Colors.textDark} />
              )}
            </TouchableOpacity>
          </View>

          {isRecording && (
            <View style={styles.recBanner}>
              <View style={styles.recDot} />
              <Text style={styles.recBannerText}>Recording… tap stop when done</Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            id="sukoon-save-btn"
            style={[styles.saveBtn, (isSavingText || isRecording) && styles.saveBtnDisabled]}
            onPress={handleSaveText}
            disabled={isSavingText || isRecording}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, '#0a5746']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {isSavingText
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Reflection</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Spiritual Seeds */}
        <View style={styles.seedsSection}>
          <View style={styles.seedsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Spiritual Seeds</Text>
              <Text style={styles.sectionSubtitle}>Your garden of past reflections</Text>
            </View>
            {reflections.length > 4 && (
              <TouchableOpacity onPress={() => setShowAll((v) => !v)}>
                <Text style={styles.viewAllText}>{showAll ? 'SHOW LESS' : 'VIEW ALL'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoadingList ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : reflections.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="eco" size={40} color={Colors.primary} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>Your garden is empty</Text>
              <Text style={styles.emptySubtitle}>
                Save a reflection above to plant your first seed of Sukoon.
              </Text>
            </View>
          ) : (
            <View style={styles.seedsList}>
              {displayed.map((item) => {
                const { day, month, time } = formatDate(item.createdAt);
                const isAudio = item.type === 'audio';
                const isPlaying = playingId === item.id;

                return (
                  <View key={item.id} style={styles.seedItem}>
                    {/* Date badge */}
                    <View style={[styles.seedBadge, { backgroundColor: isAudio ? '#d2e8da' : '#ffe088' }]}>
                      <Text style={[styles.seedBadgeDay, { color: isAudio ? '#0d1f17' : '#241a00' }]}>
                        {day}
                      </Text>
                      {isAudio && <MaterialIcons name="mic" size={9} color="#0d1f17" />}
                    </View>

                    {/* Content */}
                    <View style={styles.seedContent}>
                      <Text style={styles.seedMeta}>{month} · {time}</Text>
                      {isAudio ? (
                        <TouchableOpacity
                          id={`play-btn-${item.id}`}
                          style={styles.playRow}
                          onPress={() => handlePlay(item as AudioReflection)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.playIcon, isPlaying && styles.playIconActive]}>
                            <MaterialIcons
                              name={isPlaying ? 'stop' : 'play-arrow'}
                              size={16}
                              color={isPlaying ? '#fff' : Colors.primary}
                            />
                          </View>
                          <Text style={styles.playLabel}>
                            {isPlaying ? 'Playing…' : 'Voice Reflection'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.seedText} numberOfLines={2}>
                          {(item as TextReflection).content}
                        </Text>
                      )}
                    </View>

                    {/* Delete */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item.id)}
                      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                      activeOpacity={0.5}
                    >
                      <MaterialIcons name="delete-outline" size={24} color="rgba(186,26,26,0.75)" />
                    </TouchableOpacity>
                  </View>
);
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </ScreenWrapper>
);
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245,240,232,0.92)',
    zIndex: 100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  avatarText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold', fontFamily: 'Plus Jakarta Sans' },

  scrollContent: { paddingHorizontal: 24 },

  titleSection: { alignItems: 'center', marginBottom: 20 },
  pageTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -1,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: '#52655b',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  promptCard: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    marginBottom: 20,
  },
  promptHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  promptLabel: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 2,
  },
  promptQuestion: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
    lineHeight: 28,
    marginBottom: 20,
  },

  inputContainer: { position: 'relative', marginBottom: 14 },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 20,
    minHeight: 150,
    padding: 20,
    paddingBottom: 64,
    fontFamily: 'Manrope',
    fontSize: 16,
    color: Colors.textDark,
  },
  micBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fed65b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: '#ba1a1a' },
  recInner: { alignItems: 'center' },
  recTimer: { fontSize: 9, fontWeight: '700', color: '#fff', fontFamily: 'Manrope' },

  recBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ba1a1a' },
  recBannerText: { fontFamily: 'Manrope', fontSize: 13, color: '#ba1a1a', fontWeight: '600' },

  saveBtn: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 17, fontWeight: '700', color: '#fff' },

  seedsSection: { marginBottom: 24 },
  seedsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  sectionTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: Colors.primary, marginBottom: 3 },
  sectionSubtitle: { fontFamily: 'Manrope', fontSize: 13, color: Colors.textMuted },
  viewAllText: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '700', color: Colors.secondary, letterSpacing: 0.5 },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  emptySubtitle: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, textAlign: 'center' },

  seedsList: { gap: 12 },
  seedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(248,246,241,0.7)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  seedBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedBadgeDay: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '800' },
  seedContent: { flex: 1 },
  seedMeta: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  seedText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    lineHeight: 20,
  },

  playRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15,109,91,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconActive: { backgroundColor: Colors.primary },
  playLabel: { fontFamily: 'Manrope', fontSize: 14, color: Colors.primary, fontWeight: '600' },

  deleteBtn: {
    padding: 8,
    zIndex: 10,
    elevation: 2,
  },
});

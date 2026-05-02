import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Image,
  StatusBar,
  Modal,
  Linking,
  AppState,
  Platform,
} from 'react-native';
// Image already imported above — logo is loaded via require below
import * as Speech from 'expo-speech';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, NativeSpacing as Spacing, Shadows, Typography } from '../theme';
import { DarkColors, LightColors } from '../theme/darkMode';
import { fetchSurahList, SurahInfo } from '../services/quranApi';
import { useAppStore, TranslationLangCode } from '../store/useAppStore';
import { downloadLanguagePack } from '../services/translationManager';
import { ScreenWrapper, useScreenBottomInset } from '../components/ScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { quranAudioDownloadManager, AudioDownloadState } from '../services/quranAudioDownloadManager';

// ─── Revelation badge colors ──────────────────────────────────────
const BADGE = {
  Meccan: { bg: 'rgba(212,175,55,0.12)', text: Colors.accent },
  Madinan: { bg: 'rgba(15,109,91,0.1)', text: Colors.primary },
} as Record<string, { bg: string; text: string }>;

export const QuranScreen = () => {
  const navigation = useNavigation<any>();
  const { 
    profile,
    lastReading,
    showQuranTranslation, setShowQuranTranslation,
    playTranslationAudio, setPlayTranslationAudio,
    translationLang, setTranslationLang,
    languagePacks,
    darkMode,
  } = useAppStore();

  const theme = darkMode ? DarkColors : LightColors;

  const bottomInset = useScreenBottomInset();
  const insets = useSafeAreaInsets();

  const [surahs, setSurahs] = useState<SurahInfo[]>([]);
  const [filtered, setFiltered] = useState<SurahInfo[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deviceSpeechSupported, setDeviceSpeechSupported] = useState<Record<string, boolean>>({});
  const [audioDLState, setAudioDLState] = useState<AudioDownloadState>({ status: 'idle' });

  useEffect(() => {
    return quranAudioDownloadManager.subscribe(setAudioDLState);
  }, []);

  const checkVoices = useCallback(async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      setDeviceSpeechSupported({
        ml: voices.some(v => {
          const low = v.language.toLowerCase();
          return low.startsWith('ml') || low.includes('ml');
        }),
        hi: voices.some(v => {
          const low = v.language.toLowerCase();
          return low.startsWith('hi') || low.includes('hi');
        }),
        en: true, 
      });
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (showSettings) {
      checkVoices();
    }
  }, [showSettings, checkVoices]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && showSettings) {
        checkVoices();
      }
    });
    return () => sub.remove();
  }, [showSettings, checkVoices]);

  // ── Fetch surah list once ──────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (surahs.length > 0) return; // already loaded
      setLoading(true);
      setError(false);
      fetchSurahList()
        .then((data) => {
          setSurahs(data);
          setFiltered(data);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, []),
  );

  // ── Search filter ──────────────────────────────────────────────
  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setFiltered(surahs);
    } else {
      setFiltered(
        surahs.filter(
          (s) =>
            s.englishName.toLowerCase().includes(q) ||
            s.englishNameTranslation.toLowerCase().includes(q) ||
            String(s.number).includes(q),
        ),
      );
    }
  }, [query, surahs]);

  // ── Navigate to reader ─────────────────────────────────────────
  const openSurah = (surah: SurahInfo) => {
    navigation.navigate('QuranReader', {
      surahNumber: surah.number,
      surahName: surah.englishName,
    });
  };

  // ── Render each surah row ──────────────────────────────────────
  const renderSurah = ({ item }: { item: SurahInfo }) => {
    const badge = BADGE[item.revelationType] ?? BADGE.Meccan;
    const isFirst = item.number === 1;
    return (
      <TouchableOpacity
        id={`surah-item-${item.number}`}
        style={[
          styles.surahItem,
          isFirst && styles.surahItemHighlighted,
          darkMode && { backgroundColor: 'rgba(255,255,255,0.03)' }
        ]}
        onPress={() => openSurah(item)}
        activeOpacity={0.7}
      >
        {/* Single row: number box + name block */}
        <View style={styles.surahItemTopRow}>
          {/* Number box */}
          <View style={[styles.surahNumberBox, isFirst && styles.surahNumberBoxHighlighted]}>
            <Text style={[styles.surahNumberText, isFirst && styles.surahNumberTextHighlighted]}>
              {item.number}
            </Text>
          </View>

          {/* Name block — takes remaining space */}
          <View style={styles.surahNameBlock}>
            {/* English + Arabic — wraps to next line if no room */}
            <View style={styles.surahNameRow}>
              <Text
                style={[styles.surahName, darkMode && { color: '#fff' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {item.englishName}
              </Text>
              <Text
                style={styles.surahArabicTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {item.name}
              </Text>
            </View>

            {/* Meta row: badge + verses + translation */}
            <View style={styles.metaRow}>
              <View style={[styles.revelationBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.revelationText, { color: badge.text }]}>
                  {item.revelationType.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.surahMeta}>{item.numberOfAyahs} VERSES</Text>
              <Text style={styles.surahEnglishTranslation}>
                {item.englishNameTranslation.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Header: hero card ─────────────────────────────────────────
  const ListHeader = useCallback(() => (
    <>
      {/* Continue reading hero */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && { color: '#9aecd5' }]}>Last Reading</Text>
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[Colors.primary, '#0f6d5b']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroCardGlow} />
          <View style={styles.heroCardContent}>
            <View>
              <Text style={styles.heroLabel}>
                {lastReading ? `SURAH ${lastReading.surahName.toUpperCase()}` : 'START YOUR JOURNEY'}
              </Text>
              <Text style={styles.heroBigTitle}>
                {lastReading ? `Ayah ${lastReading.ayahNumber}` : 'Read Quran'}
              </Text>
              {lastReading && (
                <Text style={styles.heroSubTitle}>Surah {lastReading.surahNumber}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.continueBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (lastReading) {
                  navigation.navigate('QuranReader', { 
                    surahNumber: lastReading.surahNumber, 
                    surahName: lastReading.surahName 
                  });
                } else {
                  navigation.navigate('QuranReader', { surahNumber: 1, surahName: 'Al-Fatihah' });
                }
              }}
            >
              <Text style={styles.continueBtnText}>{lastReading ? 'Continue' : 'Begin'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Section title */}
      <View style={styles.exploreTitleRow}>
        <Text style={[styles.sectionTitle, darkMode && { color: '#9aecd5' }]}>Explore Surahs</Text>
        <Text style={styles.surahCount}>{filtered.length} / 114</Text>
      </View>
    </>
  ), [lastReading, filtered.length, darkMode, navigation]);

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: darkMode ? '#001a12' : Colors.background }]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: darkMode ? 'transparent' : 'rgba(251,249,244,0.97)' }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
             <Text style={{color: Colors.primary, fontSize: 16, fontWeight: 'bold'}}>{profile?.name?.[0]?.toUpperCase() || 'A'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <MaterialIcons name="settings" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Surahs…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialIcons name="wifi-off" size={48} color={Colors.textMuted} />
          <Text style={styles.errorText}>Unable to load Surahs.</Text>
          <Text style={styles.errorSub}>Check your connection and try again.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(false);
              setLoading(true);
              fetchSurahList()
                .then((d) => { setSurahs(d); setFiltered(d); })
                .catch(() => setError(true))
                .finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Search bar — rendered outside FlatList to prevent keyboard dismiss */}
          <View style={[styles.searchContainer, { marginHorizontal: Spacing.xl, marginTop: Spacing.md }, darkMode ? {
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderColor: 'rgba(154,236,213,0.25)',
            borderWidth: 1,
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
          } : {
            backgroundColor: '#fff',
            borderColor: '#eae8e3',
            borderWidth: 1,
          }]}>
            <MaterialIcons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              id="surah-search-input"
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search surahs…"
              placeholderTextColor={Colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
              underlineColorAndroid="transparent"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <MaterialIcons name="close" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(s) => String(s.number)}
            renderItem={renderSurah}
            ListHeaderComponent={<ListHeader />}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>No surahs match "{query}"</Text>
              </View>
            }
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 80 }]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={30}
            windowSize={10}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          />
        </View>
      )}


      {/* ── Settings Modal ── */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Translation Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            {/* Show Translation toggle */}
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Show Translation</Text>
                <Text style={styles.settingDesc}>Display the meaning of each Ayah below the Arabic</Text>
              </View>
              <Switch
                value={showQuranTranslation}
                onValueChange={setShowQuranTranslation}
                trackColor={{ false: '#eae8e3', true: Colors.primary }}
              />
            </View>

            {/* Play Translation Audio toggle — greyed when translation is hidden */}
            <View style={[styles.settingRow, { opacity: showQuranTranslation ? 1 : 0.4 }]}
              pointerEvents={showQuranTranslation ? 'auto' : 'none'}
            >
              <View>
                <Text style={styles.settingTitle}>Play Translation Audio</Text>
                <Text style={styles.settingDesc}>Play descriptive text-to-speech after each Ayah</Text>
              </View>
              <Switch
                value={playTranslationAudio}
                onValueChange={setPlayTranslationAudio}
                trackColor={{ false: '#eae8e3', true: Colors.primary }}
              />
            </View>

            <Text style={[styles.settingTitle, { marginTop: 24, marginBottom: 12, opacity: (showQuranTranslation && playTranslationAudio) ? 1 : 0.4 }]}>
              Translation Language
            </Text>

            <View style={[styles.langList, { opacity: (showQuranTranslation && playTranslationAudio) ? 1 : 0.4 }]} pointerEvents={(showQuranTranslation && playTranslationAudio) ? 'auto' : 'none'}>
              {[
                { code: 'en', name: 'English (Default)' },
                { code: 'ml', name: 'Malayalam' },
                { code: 'hi', name: 'Hindi' },
              ].map((lang) => {
                const status = languagePacks[lang.code as TranslationLangCode];
                const isSelected = translationLang === lang.code;

                return (
                  <View key={lang.code}>
                    <TouchableOpacity
                      style={[styles.langRow, isSelected && styles.langRowSelected]}
                      onPress={() => {
                        if (status === 'installed') {
                          setTranslationLang(lang.code as TranslationLangCode);
                        } else if (status === 'not_installed') {
                          downloadLanguagePack(lang.code as TranslationLangCode);
                        }
                      }}
                    >
                      <Text style={[styles.langName, isSelected && styles.langNameSelected]}>{lang.name}</Text>
                      {status === 'downloading' ? (
                        <Text style={styles.langStatusDownloading}>Downloading...</Text>
                      ) : status === 'installed' ? (
                        <MaterialIcons name="check-circle" size={20} color={isSelected ? Colors.primary : Colors.textMuted} />
                      ) : (
                        <View style={styles.downloadBadge}><Text style={styles.downloadBadgeText}>Download</Text></View>
                      )}
                    </TouchableOpacity>

                    {/* Device TTS Voice Missing Warning */}
                    {isSelected && status === 'installed' && deviceSpeechSupported[lang.code] === false && (
                      <View style={styles.voiceWarningBox}>
                        <MaterialIcons name="info-outline" size={16} color="#d97706" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.voiceWarningText}>
                            {lang.name} voice is not installed on your OS.
                          </Text>
                          <TouchableOpacity 
                            style={styles.voiceInstallBtn}
                            onPress={() => {
                              if (Platform.OS === 'android') {
                                Linking.sendIntent('com.android.settings.TTS_SETTINGS').catch(() => Linking.openSettings());
                              } else {
                                Linking.openSettings();
                              }
                            }}
                          >
                            <Text style={styles.voiceInstallBtnText}>👉 Install {lang.name} Voice (Settings)</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Offline Quran Audio */}
            <Text style={[styles.settingTitle, { marginTop: 32, marginBottom: 8 }]}>
              Offline Quran Audio
            </Text>
            <Text style={[styles.settingDesc, { marginBottom: 16 }]}>
              Download the entire Quran recitation (~500MB) to listen without an internet connection. Please keep the app open during the download.
            </Text>

            <View style={styles.audioDlCard}>
              {audioDLState.status === 'idle' || audioDLState.status === 'error' ? (
                <View>
                  {audioDLState.status === 'error' && (
                    <Text style={{ fontFamily: 'Manrope', fontSize: 13, color: '#f87171', marginBottom: 12 }}>
                      {audioDLState.message}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => quranAudioDownloadManager.start()}
                  >
                    <MaterialIcons name="cloud-download" size={20} color="#fff" />
                    <Text style={styles.downloadBtnText}>
                      {audioDLState.status === 'error' ? 'Retry Download' : 'Download All Audio'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : audioDLState.status === 'downloading' ? (
                <View>
                  <View style={styles.dlProgressHeader}>
                    <Text style={styles.dlProgressText}>
                      Downloading: {Math.round((audioDLState.bytesDownloaded / 1024 / 1024))} / {Math.round((audioDLState.bytesTotal / 1024 / 1024))} MB
                    </Text>
                    <Text style={styles.dlProgressPct}>
                      {Math.round((audioDLState.progress / audioDLState.total) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.dlProgressBarBg}>
                    <View style={[styles.dlProgressBarFill, { width: `${(audioDLState.progress / audioDLState.total) * 100}%` }]} />
                  </View>
                  <TouchableOpacity
                    style={styles.dlAbortBtn}
                    onPress={() => quranAudioDownloadManager.abort()}
                  >
                    <MaterialIcons name="cancel" size={16} color="#ef4444" />
                    <Text style={styles.dlAbortText}>Cancel Download</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dlDoneRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
                    <Text style={styles.dlDoneText}>Ready for offline listening</Text>
                  </View>
                  <TouchableOpacity onPress={() => quranAudioDownloadManager.deleteAll()} style={{ padding: 8 }}>
                    <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 249, 244, 0.95)',
    zIndex: 100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },

  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },

  // ── Hero card ──
  section: { marginBottom: Spacing['3xl'] },
  sectionTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: '800', color: Colors.primary, marginBottom: Spacing.lg },
  heroCard: { borderRadius: 20, overflow: 'hidden', position: 'relative', height: 160, ...Shadows.green },
  heroCardGlow: { position: 'absolute', right: -48, top: -48, width: 192, height: 192, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 96 },
  heroCardContent: { flex: 1, padding: Spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 10 },
  heroLabel: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 2, marginBottom: 8 },
  heroBigTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroSubTitle: { fontFamily: 'Manrope', fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  continueBtn: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, ...Shadows.sm },
  continueBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.primary },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: '#eae8e3',
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 15,
    color: Colors.textDark,
    padding: 0,
    borderWidth: 0,
    outlineWidth: 0,
  },

  // ── Surah list header ──
  exploreTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  surahCount: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  // ── Surah item ──
  surahItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  surahItemHighlighted: {
    backgroundColor: '#f5f3ee',
    borderLeftWidth: 4,
    borderColor: Colors.primary,
  },
  surahItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  surahNameBlock: {
    flex: 1,
    flexShrink: 1,
  },
  surahNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  surahNumberBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#eae8e3',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  surahNumberBoxHighlighted: { backgroundColor: Colors.primary },
  surahNumberText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.primary },
  surahNumberTextHighlighted: { color: '#fff' },
  surahName: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    flexShrink: 1,
  },
  surahArabicTitle: {
    fontFamily: 'ScheherazadeNew-Regular',
    fontSize: 20,
    color: Colors.primary,
    textAlign: 'right',
    flexShrink: 1,
  },
  surahEnglishTranslation: {
    fontFamily: 'Manrope',
    fontSize: 10,
    color: Colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  revelationBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  revelationText: { fontFamily: 'Manrope', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  surahMeta: { fontFamily: 'Manrope', fontSize: 11, color: Colors.textMuted, letterSpacing: 1 },

  // ── States ──
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  loadingText: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, marginTop: 12 },
  errorText: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.textDark },
  errorSub: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted },
  retryBtn: { marginTop: 12, backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: '#fff', fontFamily: 'Plus Jakarta Sans', fontWeight: '700', fontSize: 14 },
  emptyText: { fontFamily: 'Manrope', fontSize: 15, color: Colors.textMuted, textAlign: 'center' },

  // ── FAB ──
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

  // ── Modal Styles ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '800', color: Colors.primary },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.textDark },
  settingDesc: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  langList: { backgroundColor: '#f9f8f6', borderRadius: 16, padding: 8 },
  langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12 },
  langRowSelected: { backgroundColor: '#eae8e3' },
  langName: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '600', color: Colors.textDark },
  langNameSelected: { color: Colors.primary, fontWeight: '800' },
  langStatusDownloading: { fontFamily: 'Manrope', fontSize: 12, color: '#f59e0b', fontWeight: '700' },
  downloadBadge: { backgroundColor: 'rgba(15,109,91,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  downloadBadgeText: { color: Colors.primary, fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '700' },
  voiceWarningBox: { flexDirection: 'row', backgroundColor: '#fef3c7', padding: 12, borderRadius: 12, marginTop: 8, marginHorizontal: 8 },
  voiceWarningText: { fontFamily: 'Manrope', fontSize: 12, color: '#92400e', marginBottom: 8, lineHeight: 18 },
  voiceInstallBtn: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#fcd34d' },
  voiceInstallBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: '#b45309' },
  
  // Offline Audio Download
  audioDlCard: { backgroundColor: '#f9f8f6', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12 },
  downloadBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#fff' },
  dlProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dlProgressText: { fontFamily: 'Manrope', fontSize: 13, color: Colors.textDark, fontWeight: '600' },
  dlProgressPct: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: Colors.primary, fontWeight: '800' },
  dlProgressBarBg: { height: 8, backgroundColor: 'rgba(15,109,91,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  dlProgressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  dlAbortBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  dlAbortText: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: '#ef4444' },
  dlDoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dlDoneText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.primary },
  
  locationInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eae8e3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 8,
  },
});

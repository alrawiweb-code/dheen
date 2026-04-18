import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  StatusBar,
  Modal,
  Switch,
  Linking,
  AppState,
  Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, NativeSpacing as Spacing, Shadows, Typography } from '../theme';
import { fetchSurahList, SurahInfo } from '../services/quranApi';
import { useAppStore, TranslationLangCode } from '../store/useAppStore';
import { downloadLanguagePack } from '../services/translationManager';

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
    playTranslationAudio, setPlayTranslationAudio,
    translationLang, setTranslationLang,
    languagePacks
  } = useAppStore();

  const [surahs, setSurahs] = useState<SurahInfo[]>([]);
  const [filtered, setFiltered] = useState<SurahInfo[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deviceSpeechSupported, setDeviceSpeechSupported] = useState<Record<string, boolean>>({});

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
        style={[styles.surahItem, isFirst && styles.surahItemHighlighted]}
        onPress={() => openSurah(item)}
        activeOpacity={0.7}
      >
        {/* Left: number + name */}
        <View style={styles.surahItemLeft}>
          <View style={[styles.surahNumberBox, isFirst && styles.surahNumberBoxHighlighted]}>
            <Text style={[styles.surahNumberText, isFirst && styles.surahNumberTextHighlighted]}>
              {item.number}
            </Text>
          </View>
          <View>
            <Text style={styles.surahName}>{item.englishName}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.revelationBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.revelationText, { color: badge.text }]}>
                  {item.revelationType.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.surahMeta}>{item.numberOfAyahs} VERSES</Text>
            </View>
          </View>
        </View>

        {/* Right: arabic + translation */}
        <View style={styles.surahItemRight}>
          <Text style={styles.surahArabicTitle}>{item.name}</Text>
          <Text style={styles.surahEnglishTranslation}>
            {item.englishNameTranslation.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Header: hero card + search bar ────────────────────────────
  const ListHeader = () => (
    <>
      {/* Continue reading hero */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last Reading</Text>
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

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          id="surah-search-input"
          style={styles.searchInput}
          placeholder="Search surahs…"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <MaterialIcons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Section title */}
      <View style={styles.exploreTitleRow}>
        <Text style={styles.sectionTitle}>Explore Surahs</Text>
        <Text style={styles.surahCount}>{filtered.length} / 114</Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-_i0yhx0q3H5ZevVAVICnWjiGnkxy53EGyvkkQFCDhCkVAn1iC1wBCgBFHYyzOw5P07Codpm7oBVOcZl_mD0z4ydmd-QR1IWdjq-y0lMSMgL1NiOkmacdz-F0sTb_Ev9PW4acjFlBV19hFEh2CFX46ECI7iP_70-Dd7LSfzFAIMXlxKytZCI1w-YlfrZNUjCpktn6hWx-wesAF4XZlFiydqAAWHUOKQcDfL-Cx3JUoutuwp5SFUkF9Nx7YdIaOMVh6W_VN5Z_p77l' }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <Text style={styles.dateText}>14 Shawwal 1446</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.premiumText}>NOOR</Text>
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
          ListFooterComponent={<View style={{ height: 120 }} />}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={30}
          windowSize={10}
        />
      )}

      {/* FAB: Ruhani */}
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

            <View style={styles.settingRow}>
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

            <Text style={[styles.settingTitle, { marginTop: 24, marginBottom: 12, opacity: playTranslationAudio ? 1 : 0.5 }]}>
              Translation Language
            </Text>

            <View style={[styles.langList, { opacity: playTranslationAudio ? 1 : 0.5 }]} pointerEvents={playTranslationAudio ? 'auto' : 'none'}>
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

          </View>
        </View>
      </Modal>

    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 249, 244, 0.95)',
    zIndex: 100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3', overflow: 'hidden' },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  premiumText: { color: Colors.secondary, fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '800', letterSpacing: 1 },

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
    ...Shadows.sm,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 15,
    color: Colors.textDark,
    padding: 0,
  },

  // ── Surah list header ──
  exploreTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  surahCount: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  // ── Surah item ──
  surahItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
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
  surahItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
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
  surahName: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revelationBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  revelationText: { fontFamily: 'Manrope', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  surahMeta: { fontFamily: 'Manrope', fontSize: 11, color: Colors.textMuted, letterSpacing: 1 },
  surahItemRight: { alignItems: 'flex-end', flexShrink: 0 },
  surahArabicTitle: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 22, color: Colors.primary, marginBottom: 2 },
  surahEnglishTranslation: { fontFamily: 'Manrope', fontSize: 10, color: Colors.textMuted },

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
});

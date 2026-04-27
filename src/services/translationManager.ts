import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore, TranslationLangCode } from '../store/useAppStore';

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';

export const EDITION_MAP: Record<TranslationLangCode, string> = {
  en: 'en.asad',
  ml: 'ml.abdulhameed',
  hi: 'hi.farooq'
};

const getSurahTranslationKey = (lang: TranslationLangCode, surahNum: number) => `@quran_trans_${lang}_${surahNum}`;

/**
 * Downloads a language pack. We fetch the entire edition at once to save 113 roundtrips,
 * but immediately chop it per-surah and store it piecemeal to prevent huge JSON parses during reading.
 */
export const downloadLanguagePack = async (lang: TranslationLangCode) => {
  const edition = EDITION_MAP[lang];
  const { setLanguagePackStatus } = useAppStore.getState();

  // If already installed, skip
  if (useAppStore.getState().languagePacks[lang] === 'installed') return;

  setLanguagePackStatus(lang, 'downloading');

  try {
    // Single network bulk fetch
    const res = await fetch(`${QURAN_API_BASE}/quran/${edition}`);
    if (!res.ok) throw new Error('Failed to fetch full Quran translation');
    
    const json = await res.json();
    const allSurahs = json.data.surahs;

    const kvPairs: [string, string][] = [];

    // Slice up the massive JSON into 114 separate surah arrays mapped to `{ayahNum: text}` or array
    for (const surah of allSurahs) {
        const surahTranslations = surah.ayahs.map((a: any) => a.text);
        kvPairs.push([
            getSurahTranslationKey(lang, surah.number),
            JSON.stringify(surahTranslations)
        ]);
    }

    // Execute multi-set atomically. Extremely fast.
    await AsyncStorage.multiSet(kvPairs);

    setLanguagePackStatus(lang, 'installed');
  } catch (error) {
    console.error(`[TranslationManager] Failed to download ${lang} pack`, error);
    setLanguagePackStatus(lang, 'not_installed');
  }
};

/**
 * Retrieves just the specific surah's string array of translations from the local cache.
 * Returns null if not installed or missing.
 */
export const getSurahTranslationLocally = async (lang: TranslationLangCode, surahNum: number): Promise<string[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(getSurahTranslationKey(lang, surahNum));
    if (raw) return JSON.parse(raw) as string[];
  } catch (e) {
    console.error(`[TranslationManager] Cache read failed`, e);
  }
  return null;
};

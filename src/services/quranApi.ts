// AlQuran Cloud API — no API key required
// https://alquran.cloud/api

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/useAppStore';
import { getSurahTranslationLocally, EDITION_MAP } from './translationManager';
import { getSurahListFromDb, getSurahFromDb, isQuranDownloaded } from './quranDatabase';
import { removeBismillahFromText } from '../utils/bismillah';
export { removeBismillahFromText };

const QURAN_BASE = 'https://api.alquran.cloud/v1';
const SURAH_LIST_CACHE_KEY = '@quran_surah_list_cache';
const FETCH_TIMEOUT_MS = 10_000; // 10 seconds

export interface SurahInfo {
  number: number;
  name: string;           // Arabic name
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  translation?: string;
  audio?: string;
}

/**
 * Fetch wrapper with AbortController timeout.
 * Prevents indefinite hangs when the API is unreachable.
 */
async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}



export async function fetchSurahList(): Promise<SurahInfo[]> {
  try {
    // Try local DB first
    if (await isQuranDownloaded()) {
      try {
        return await getSurahListFromDb();
      } catch (dbErr) {
        console.warn('[QuranAPI] DB read failed for surah list, falling back to API', dbErr);
      }
    }

    const res = await fetchWithTimeout(`${QURAN_BASE}/surah`);
    const json = await res.json();
    const data: SurahInfo[] = json.data;
    // Cache for offline use
    AsyncStorage.setItem(SURAH_LIST_CACHE_KEY, JSON.stringify(data)).catch(() => {});
    return data;
  } catch (e) {
    // Fallback: try cached list
    console.log('[QuranAPI] Network failed for surah list, trying cache…', e);
    const cached = await AsyncStorage.getItem(SURAH_LIST_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as SurahInfo[];
    }
    throw e; // No cache available either
  }
}

export async function fetchSurah(
  surahNumber: number,
): Promise<{ surah: SurahInfo; ayahs: Ayah[] }> {
  // Read lang at call time — guarantees we always use the latest selection
  const { translationLang } = useAppStore.getState();
  const targetEdition = EDITION_MAP[translationLang] || EDITION_MAP['en'];

  // Try local SQLite DB first — but ONLY for English, since the DB stores en.asad only
  if (translationLang === 'en') {
    try {
      if (await isQuranDownloaded()) {
        const dbData = await getSurahFromDb(surahNumber);
        if (dbData) return dbData;
      }
    } catch (dbErr) {
      console.warn('[QuranAPI] DB read failed for surah, falling back to API', dbErr);
    }
  }

  // Fetch Arabic text (Uthmanic script)
  const arabicRes = await fetchWithTimeout(`${QURAN_BASE}/surah/${surahNumber}/quran-uthmani`);
  const arabicJson = await arabicRes.json();
  const arabicAyahs: any[] = arabicJson.data.ayahs;

  // Fetch translation text
  let transTexts: string[] = [];

  // 1. Try local language pack first (fastest, works offline)
  const localTrans = await getSurahTranslationLocally(translationLang, surahNumber);

  if (localTrans && localTrans.length === arabicAyahs.length) {
    transTexts = localTrans;
  } else {
    // 2. Fallback to network fetch for the selected edition
    try {
      const engRes = await fetchWithTimeout(`${QURAN_BASE}/surah/${surahNumber}/${targetEdition}`);
      const engJson = await engRes.json();
      const engAyahs: any[] = engJson.data.ayahs;
      transTexts = engAyahs.map((a: any) => a.text);
    } catch (e) {
      console.warn(`[QuranAPI] Translation fetch failed, continuing without`, e);
      transTexts = [];
    }
  }

  const ayahs: Ayah[] = arabicAyahs.map((a: any, i: number) => ({
    number: a.number,
    numberInSurah: a.numberInSurah,
    text: a.text,
    translation: transTexts[i] ?? '',
    audio: a.audio,
  }));

  // Strip Bismillah from first ayah (all surahs except Surah 9)
  if (surahNumber !== 9 && ayahs.length > 0 && ayahs[0].numberInSurah === 1) {
    const rawText = ayahs[0].text;
    const cleaned = removeBismillahFromText(rawText);
    console.log(`[QuranAPI] Surah ${surahNumber} ayah 1 BEFORE: "${rawText.substring(0, 50)}"`);
    console.log(`[QuranAPI] Surah ${surahNumber} ayah 1 AFTER : "${cleaned.substring(0, 50)}"`);
    ayahs[0] = { ...ayahs[0], text: cleaned };
  }

  return { surah: arabicJson.data, ayahs };
}

export async function fetchRandomAyah(): Promise<Ayah> {
  const surahNum = Math.floor(Math.random() * 114) + 1;
  const { ayahs } = await fetchSurah(surahNum);
  const randIdx = Math.floor(Math.random() * ayahs.length);
  return ayahs[randIdx];
}

// Daily Ayah — a curated list for when API is unavailable
export const DAILY_AYAHS = [
  {
    arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',
    translation: 'And whoever fears Allah — He will make for him a way out.',
    reference: 'Surah At-Talaq 65:2',
  },
  {
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translation: 'For indeed, with hardship will be ease.',
    reference: 'Surah Ash-Sharh 94:5',
  },
  {
    arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ',
    translation: 'And when My servants ask you concerning Me — indeed I am near.',
    reference: 'Surah Al-Baqarah 2:186',
  },
  {
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    translation: 'Allah is sufficient for us, and He is the best disposer of affairs.',
    reference: 'Surah Al-Imran 3:173',
  },
  {
    arabic: 'وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ',
    translation: 'But perhaps you hate a thing and it is good for you.',
    reference: 'Surah Al-Baqarah 2:216',
  },
  {
    arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
    translation: 'Indeed, Allah is with the patient.',
    reference: 'Surah Al-Baqarah 2:153',
  },
  {
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    translation: 'Verily, in the remembrance of Allah do hearts find rest.',
    reference: 'Surah Ar-Rad 13:28',
  },
];

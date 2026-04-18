// AlQuran Cloud API — no API key required
// https://alquran.cloud/api

import { useAppStore } from '../store/useAppStore';
import { getSurahTranslationLocally, EDITION_MAP } from './translationManager';

const QURAN_BASE = 'https://api.alquran.cloud/v1';

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

export async function fetchSurahList(): Promise<SurahInfo[]> {
  const res = await fetch(`${QURAN_BASE}/surah`);
  const json = await res.json();
  return json.data;
}

export async function fetchSurah(
  surahNumber: number,
): Promise<{ surah: SurahInfo; ayahs: Ayah[] }> {
  const { translationLang } = useAppStore.getState();
  const targetEdition = EDITION_MAP[translationLang] || EDITION_MAP['en'];

  // quran-uthmani: Uthmanic script with proper Unicode encoding
  // Fetch arabic text
  const arabicRes = await fetch(`${QURAN_BASE}/surah/${surahNumber}/quran-uthmani`);
  const arabicJson = await arabicRes.json();
  const arabicAyahs: any[] = arabicJson.data.ayahs;
  
  // Fetch translation text
  let transTexts: string[] = [];
  
  // 1. Try local storage first (fastest, offline)
  const localTrans = await getSurahTranslationLocally(translationLang, surahNumber);
  
  if (localTrans && localTrans.length === arabicAyahs.length) {
    transTexts = localTrans;
  } else {
    // 2. Fallback to network fetch if not downloaded or corrupted
    const engRes = await fetch(`${QURAN_BASE}/surah/${surahNumber}/${targetEdition}`);
    const engJson = await engRes.json();
    const engAyahs: any[] = engJson.data.ayahs;
    transTexts = engAyahs.map(a => a.text);
  }

  const ayahs: Ayah[] = arabicAyahs.map((a: any, i: number) => ({
    number: a.number,
    numberInSurah: a.numberInSurah,
    text: a.text,
    translation: transTexts[i] ?? '',
    audio: a.audio,
  }));

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

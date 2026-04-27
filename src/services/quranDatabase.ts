/**
 * quranDatabase.ts
 *
 * Local SQLite layer for the Quran.
 * — Schema: surahs + ayahs tables
 * — Bulk insert: called once from quranDownloadManager on first Quran screen visit
 * — Per-surah reads: replaces API calls in QuranScreen & QuranReader
 */

import * as SQLite from 'expo-sqlite';
import { SurahInfo, Ayah } from './quranApi';
import { removeBismillahFromText } from '../utils/bismillah';

const DB_NAME = 'quran.db';

// ─── Connection singleton ─────────────────────────────────────────
let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return _db;
}

// ─── Schema ───────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS surahs (
      number              INTEGER PRIMARY KEY,
      name                TEXT,
      english_name        TEXT,
      english_name_translation TEXT,
      number_of_ayahs     INTEGER,
      revelation_type     TEXT
    );

    CREATE TABLE IF NOT EXISTS ayahs (
      id                      INTEGER PRIMARY KEY,
      surah_number            INTEGER,
      ayah_number_in_surah    INTEGER,
      global_number           INTEGER,
      arabic_text             TEXT,
      translation             TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ayahs_surah ON ayahs (surah_number);
  `);
}

// ─── Check if already downloaded ─────────────────────────────────

export async function isQuranDownloaded(): Promise<boolean> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM surahs',
    );
    return (row?.count ?? 0) >= 114;
  } catch {
    return false;
  }
}

// ─── Bulk insert — used during download ──────────────────────────

/**
 * Insert all 114 surahs and their ayahs from the two full-quran API responses.
 * Applies Bismillah stripping at insert time so stored data is clean at rest.
 *
 * @param arabicData  Parsed `json.data.surahs` from quran-uthmani full-quran endpoint
 * @param engData     Parsed `json.data.surahs` from en.asad  full-quran endpoint
 * @param onProgress  Called after each surah with (surahIndex, surahName)
 */
export async function insertFullQuran(
  arabicData: any[],
  engData: any[],
  onProgress: (surahIndex: number, surahName: string) => void,
): Promise<void> {
  const db = await getDb();

  // Build a map of english ayah texts for quick lookup: surahNum → ayahTexts[]
  const engMap: Map<number, string[]> = new Map();
  for (const s of engData) {
    engMap.set(s.number, (s.ayahs as any[]).map((a: any) => a.text as string));
  }

  for (let i = 0; i < arabicData.length; i++) {
    const s = arabicData[i];
    const surahNum: number = s.number;
    const engTexts = engMap.get(surahNum) ?? [];

    // ── Insert surah metadata ──
    await db.runAsync(
      `INSERT OR REPLACE INTO surahs
         (number, name, english_name, english_name_translation, number_of_ayahs, revelation_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        surahNum,
        s.name,
        s.englishName,
        s.englishNameTranslation,
        s.numberOfAyahs,
        s.revelationType,
      ],
    );

    // ── Insert ayahs in a single transaction ──
    await db.withTransactionAsync(async () => {
      const ayahs: any[] = s.ayahs;
      for (let j = 0; j < ayahs.length; j++) {
        const a = ayahs[j];
        let arabicText: string = a.text;

        // Strip Bismillah from ayah 1 of every surah except Surah 9
        if (j === 0 && surahNum !== 9) {
          arabicText = removeBismillahFromText(arabicText);
        }

        await db.runAsync(
          `INSERT OR REPLACE INTO ayahs
             (id, surah_number, ayah_number_in_surah, global_number, arabic_text, translation)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            a.number,           // global ayah number = unique id
            surahNum,
            a.numberInSurah,
            a.number,
            arabicText,
            engTexts[j] ?? '',
          ],
        );
      }
    });

    onProgress(i + 1, s.englishName);
  }
}

// ─── Read surah list ──────────────────────────────────────────────

export async function getSurahListFromDb(): Promise<SurahInfo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    number: number;
    name: string;
    english_name: string;
    english_name_translation: string;
    number_of_ayahs: number;
    revelation_type: string;
  }>('SELECT * FROM surahs ORDER BY number ASC');

  return rows.map((r) => ({
    number: r.number,
    name: r.name,
    englishName: r.english_name,
    englishNameTranslation: r.english_name_translation,
    numberOfAyahs: r.number_of_ayahs,
    revelationType: r.revelation_type,
  }));
}

// ─── Read single surah ────────────────────────────────────────────

export async function getSurahFromDb(
  surahNumber: number,
): Promise<{ surah: SurahInfo; ayahs: Ayah[] } | null> {
  const db = await getDb();

  const surahRow = await db.getFirstAsync<{
    number: number;
    name: string;
    english_name: string;
    english_name_translation: string;
    number_of_ayahs: number;
    revelation_type: string;
  }>('SELECT * FROM surahs WHERE number = ?', [surahNumber]);

  if (!surahRow) return null;

  const ayahRows = await db.getAllAsync<{
    id: number;
    surah_number: number;
    ayah_number_in_surah: number;
    global_number: number;
    arabic_text: string;
    translation: string;
  }>(
    'SELECT * FROM ayahs WHERE surah_number = ? ORDER BY ayah_number_in_surah ASC',
    [surahNumber],
  );

  const surah: SurahInfo = {
    number: surahRow.number,
    name: surahRow.name,
    englishName: surahRow.english_name,
    englishNameTranslation: surahRow.english_name_translation,
    numberOfAyahs: surahRow.number_of_ayahs,
    revelationType: surahRow.revelation_type,
  };

  const ayahs: Ayah[] = ayahRows.map((r) => ({
    number: r.global_number,
    numberInSurah: r.ayah_number_in_surah,
    text: r.arabic_text,
    translation: r.translation,
  }));

  return { surah, ayahs };
}

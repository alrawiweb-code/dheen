/**
 * quranDownloadManager.ts
 *
 * Singleton that manages the one-time silent background Quran download.
 * Multiple components can subscribe to progress updates without duplicating
 * the network/DB work — only one download runs at a time.
 *
 * Usage:
 *   import { quranDownloadManager } from './quranDownloadManager';
 *   quranDownloadManager.subscribe(listener);
 *   quranDownloadManager.startIfNeeded();
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDatabase, insertFullQuran, isQuranDownloaded } from './quranDatabase';

export const QURAN_DOWNLOADED_KEY = '@quran_downloaded';

const ARABIC_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
const ENGLISH_URL = 'https://api.alquran.cloud/v1/quran/en.asad';

export type DownloadState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'downloading'; progress: number; surahName: string } // progress 0–114
  | { status: 'done' }
  | { status: 'error'; message: string };

type Listener = (state: DownloadState) => void;

class QuranDownloadManager {
  private _state: DownloadState = { status: 'idle' };
  private _listeners: Set<Listener> = new Set();
  private _running = false;

  // ── Public API ──────────────────────────────────────────────────

  getState(): DownloadState {
    return this._state;
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    // Immediately fire current state to new subscriber
    listener(this._state);
    return () => this._listeners.delete(listener);
  }

  /**
   * Starts the download if not already done or in progress.
   * Safe to call multiple times — idempotent.
   */
  async startIfNeeded(): Promise<void> {
    if (this._running) return;

    // Quick flag check first (AsyncStorage is fast)
    const flag = await AsyncStorage.getItem(QURAN_DOWNLOADED_KEY);
    if (flag === 'true') {
      this._emit({ status: 'done' });
      return;
    }

    this._running = true;
    this._emit({ status: 'checking' });

    try {
      // Initialise DB schema (no-op if already exists)
      await initDatabase();

      // Verify DB isn't already populated (handles re-install edge case)
      const alreadyFull = await isQuranDownloaded();
      if (alreadyFull) {
        await AsyncStorage.setItem(QURAN_DOWNLOADED_KEY, 'true');
        this._emit({ status: 'done' });
        this._running = false;
        return;
      }

      // ── Fetch both editions ─────────────────────────────────────
      this._emit({ status: 'downloading', progress: 0, surahName: 'Fetching Arabic text…' });

      const [arabicRes, engRes] = await Promise.all([
        fetch(ARABIC_URL),
        fetch(ENGLISH_URL),
      ]);

      if (!arabicRes.ok || !engRes.ok) {
        throw new Error(`API error: ${arabicRes.status} / ${engRes.status}`);
      }

      this._emit({ status: 'downloading', progress: 0, surahName: 'Parsing data…' });

      const [arabicJson, engJson] = await Promise.all([
        arabicRes.json(),
        engRes.json(),
      ]);

      // ── Insert into SQLite ──────────────────────────────────────
      await insertFullQuran(
        arabicJson.data.surahs,
        engJson.data.surahs,
        (surahIndex: number, surahName: string) => {
          this._emit({ status: 'downloading', progress: surahIndex, surahName });
        },
      );

      await AsyncStorage.setItem(QURAN_DOWNLOADED_KEY, 'true');
      this._emit({ status: 'done' });

    } catch (e: any) {
      console.warn('[QuranDownloadManager] Download failed:', e?.message);
      this._emit({ status: 'error', message: e?.message ?? 'Unknown error' });
    } finally {
      this._running = false;
    }
  }

  // ── Internal ────────────────────────────────────────────────────

  private _emit(state: DownloadState) {
    this._state = state;
    this._listeners.forEach((l) => l(state));
  }
}

// Export a single app-wide singleton
export const quranDownloadManager = new QuranDownloadManager();

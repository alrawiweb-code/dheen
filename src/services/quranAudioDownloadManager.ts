/**
 * quranAudioDownloadManager.ts
 *
 * Downloads the full Quran audio (128kbps Alafasy) per-ayah using
 * FileSystem.downloadAsync — which writes bytes directly to disk,
 * never buffering the whole file in JS memory.
 *
 * Total: 6,236 ayahs (~500–900MB depending on lengths).
 *
 * Rules:
 *  - NO resume: any interruption → delete partial files → restart from 0
 *  - NO background: works only while app is in foreground
 *  - NO fetch(): all downloads use FileSystem.downloadAsync
 *  - On error: clean up everything, surface clear message
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_AYAHS = 6236;
const CDN_BASE = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';
const AUDIO_DIR = `${FileSystem.documentDirectory}quran/audio/alafasy/`;
const AUDIO_DOWNLOADED_KEY = '@quran_audio_v2_downloaded';

/** Estimated compressed size of a single ayah in bytes (~80 KB on average) */
const AVG_AYAH_BYTES = 82_000;
/** Approximate total size in bytes */
export const ESTIMATED_TOTAL_BYTES = TOTAL_AYAHS * AVG_AYAH_BYTES; // ~499 MB

// ─── State types ───────────────────────────────────────────────────────────────
export type AudioDownloadState =
  | { status: 'idle' }
  | {
      status: 'downloading';
      progress: number;   // ayahs downloaded so far
      total: number;      // always TOTAL_AYAHS
      bytesDownloaded: number;
      bytesTotal: number;
    }
  | { status: 'done' }
  | { status: 'error'; message: string };

type Listener = (state: AudioDownloadState) => void;

// ─── Manager ───────────────────────────────────────────────────────────────────
class QuranAudioDownloadManager {
  private _state: AudioDownloadState = { status: 'idle' };
  private _listeners: Set<Listener> = new Set();
  private _running = false;
  private _aborted = false;

  // ── Public API ───────────────────────────────────────────────────────────────

  getState(): AudioDownloadState {
    return this._state;
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    listener(this._state); // immediately deliver current state
    return () => this._listeners.delete(listener);
  }

  /** True only if the full pack has been successfully downloaded before. */
  async isDownloaded(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(AUDIO_DOWNLOADED_KEY)) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Returns the local file URI for a given global ayah number, or null
   * if that specific file doesn't exist on disk yet.
   */
  async getLocalUri(globalAyahNum: number): Promise<string | null> {
    try {
      const path = `${AUDIO_DIR}${globalAyahNum}.mp3`;
      const info = await FileSystem.getInfoAsync(path);
      return info.exists ? path : null;
    } catch {
      return null;
    }
  }

  /** CDN URL for a given global ayah number. */
  getCdnUrl(globalAyahNum: number): string {
    return `${CDN_BASE}/${globalAyahNum}.mp3`;
  }

  /**
   * Returns best URI: local file if cached, CDN URL otherwise.
   * Used by QuranReader so it always resolves the right source.
   */
  async getBestUri(globalAyahNum: number): Promise<string> {
    const local = await this.getLocalUri(globalAyahNum);
    return local ?? this.getCdnUrl(globalAyahNum);
  }

  /**
   * Start downloading all 6,236 ayahs from scratch.
   *
   * Rules enforced here:
   *  - If already fully downloaded → emit 'done', return immediately.
   *  - Never resumes; always starts from ayah 1.
   *  - If any ayah fails → abort entire download and delete all files.
   *  - Emits progress every 5 ayahs (≈ 1% increments) to keep UI smooth.
   */
  async start(): Promise<void> {
    if (this._running) return;

    // Already done? Skip immediately.
    if (await this.isDownloaded()) {
      this._emit({ status: 'done' });
      return;
    }

    this._running = true;
    this._aborted = false;

    try {
      // Ensure a clean slate: delete any partial files from a previous attempt.
      await this._cleanup();

      // Create the audio directory.
      await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });

      this._emit({
        status: 'downloading',
        progress: 0,
        total: TOTAL_AYAHS,
        bytesDownloaded: 0,
        bytesTotal: ESTIMATED_TOTAL_BYTES,
      });

      let bytesDownloaded = 0;
      let completedCount = 0;
      let currentIndex = 1;
      let hasError = false;
      const MAX_CONCURRENT = 5;

      const runWorker = async () => {
        while (currentIndex <= TOTAL_AYAHS && !hasError && !this._aborted) {
          const n = currentIndex++;
          const localPath = `${AUDIO_DIR}${n}.mp3`;

          // Skip if already downloaded (e.g. a previous partial run)
          try {
            const info = await FileSystem.getInfoAsync(localPath);
            if (info.exists) {
              bytesDownloaded += AVG_AYAH_BYTES;
              completedCount++;
              if (completedCount % 5 === 0 || completedCount === TOTAL_AYAHS) {
                this._emit({
                  status: 'downloading',
                  progress: completedCount,
                  total: TOTAL_AYAHS,
                  bytesDownloaded: Math.min(bytesDownloaded, ESTIMATED_TOTAL_BYTES),
                  bytesTotal: ESTIMATED_TOTAL_BYTES,
                });
              }
              continue;
            }
          } catch (_) {}

          const url = `${CDN_BASE}/${n}.mp3`;

          try {
            const result = await FileSystem.downloadAsync(url, localPath);

            if (result.status !== 200) {
              throw new Error(`HTTP ${result.status} for ayah ${n}`);
            }

            bytesDownloaded += AVG_AYAH_BYTES;
            completedCount++;
            
            if (completedCount % 5 === 0 || completedCount === TOTAL_AYAHS) {
              this._emit({
                status: 'downloading',
                progress: completedCount,
                total: TOTAL_AYAHS,
                bytesDownloaded: Math.min(bytesDownloaded, ESTIMATED_TOTAL_BYTES),
                bytesTotal: ESTIMATED_TOTAL_BYTES,
              });
            }
          } catch (e: any) {
            console.error(`[QuranAudioDL] Error on ayah ${n}:`, e?.message);
            // Delete the failed partial file if it exists
            try { await FileSystem.deleteAsync(localPath, { idempotent: true }); } catch (_) {}
            
            if (!hasError) {
              hasError = true;
              this._aborted = true; // Stop other workers
              this._emit({
                status: 'error',
                message: 'Download interrupted. Please check your connection and try again.',
              });
            }
          }
        }
      };

      const workers = [];
      for (let i = 0; i < MAX_CONCURRENT; i++) {
        workers.push(runWorker());
      }

      await Promise.all(workers);

      if (this._aborted) {
        await this._cleanup();
        this._emit({ status: 'idle' });
        return;
      }

      if (hasError) {
        await this._cleanup();
        return;
      }

      // All ayahs downloaded successfully
      await AsyncStorage.setItem(AUDIO_DOWNLOADED_KEY, 'true');
      this._emit({ status: 'done' });

    } catch (e: any) {
      console.error('[QuranAudioDL] Unexpected failure:', e?.message);
      await this._cleanup();
      this._emit({
        status: 'error',
        message: e?.message ?? 'An unexpected error occurred. Please try again.',
      });
    } finally {
      this._running = false;
    }
  }

  /**
   * Abort an in-progress download.
   * The `start()` loop will detect this flag, clean up and return to idle.
   */
  abort(): void {
    if (this._running) {
      this._aborted = true;
    }
  }

  /**
   * Delete all downloaded audio files and reset the completed flag.
   * Safe to call even if nothing is downloaded yet.
   */
  async deleteAll(): Promise<void> {
    await this._cleanup();
    this._emit({ status: 'idle' });
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  private async _cleanup(): Promise<void> {
    try {
      await FileSystem.deleteAsync(AUDIO_DIR, { idempotent: true });
    } catch (e) {
      console.warn('[QuranAudioDL] Cleanup error:', e);
    }
    try {
      await AsyncStorage.removeItem(AUDIO_DOWNLOADED_KEY);
    } catch {}
  }

  private _emit(state: AudioDownloadState): void {
    this._state = state;
    this._listeners.forEach((l) => l(state));
  }
}

// App-wide singleton — import this everywhere
export const quranAudioDownloadManager = new QuranAudioDownloadManager();

/**
 * audioCache.ts
 *
 * Downloads Adhan MP3 files once and stores them permanently in the app's
 * document directory. On subsequent accesses, plays from the local file
 * directly — no network required.
 *
 * Web guard: expo-file-system has no web implementation.
 * All functions safely no-op / return null on web.
 */

import { Platform } from 'react-native';

// Dynamically require expo-file-system only on native to avoid web crash.
// On web, FileSystem.documentDirectory is null and createDownloadResumable
// does not exist — importing it at module level crashes the JS bundle.
function getFileSystem(): typeof import('expo-file-system/legacy') | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-file-system/legacy');
  } catch {
    return null;
  }
}

function getCacheDir(): string | null {
  const fs = getFileSystem();
  if (!fs || !fs.documentDirectory) return null;
  return `${fs.documentDirectory}adhan_cache/`;
}

// Ensure the cache directory exists (idempotent)
const ensureCacheDir = async (): Promise<void> => {
  const FileSystem = getFileSystem();
  const CACHE_DIR = getCacheDir();
  if (!FileSystem || !CACHE_DIR) return;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
};

/**
 * Returns the local cache path for a given voice key.
 */
export const getCachedFilePath = (voiceKey: string): string | null => {
  const CACHE_DIR = getCacheDir();
  if (!CACHE_DIR) return null;
  return `${CACHE_DIR}${voiceKey}.mp3`;
};

/**
 * Checks if an audio file has already been downloaded and cached.
 */
export const isCached = async (voiceKey: string): Promise<boolean> => {
  const FileSystem = getFileSystem();
  if (!FileSystem) return false;
  try {
    const path = getCachedFilePath(voiceKey);
    if (!path) return false;
    const info = await FileSystem.getInfoAsync(path);
    return info.exists && (info.size ?? 0) > 10_000; // At least 10KB — not a corrupt stub
  } catch {
    return false;
  }
};

/**
 * Downloads an Adhan audio file from the given URL and saves it locally.
 * Shows optional progress via onProgress callback.
 * Returns the local file URI on success, null on failure.
 */
export const downloadAndCache = async (
  voiceKey: string,
  remoteUrl: string,
  onProgress?: (progress: number) => void,
): Promise<string | null> => {
  const FileSystem = getFileSystem();
  if (!FileSystem) return null; // Web — skip silently

  try {
    await ensureCacheDir();

    const localPath = getCachedFilePath(voiceKey);
    if (!localPath) return null;

    // If already cached and valid, return immediately
    if (await isCached(voiceKey)) {
      console.log(`[AudioCache] Cache HIT for ${voiceKey}: ${localPath}`);
      return localPath;
    }

    console.log(`[AudioCache] Downloading ${voiceKey} from: ${remoteUrl}`);

    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      localPath,
      {},
      (progress) => {
        const percent = progress.totalBytesExpectedToWrite > 0
          ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
          : 0;
        onProgress?.(Math.round(percent * 100));
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (result && result.uri) {
      console.log(`[AudioCache] Download complete: ${result.uri}`);
      return result.uri;
    }

    return null;
  } catch (err) {
    console.warn(`[AudioCache] Download failed for ${voiceKey}:`, err);
    return null;
  }
};

/**
 * Resolves the best available URI for a given voice:
 * - Returns local cached file if available
 * - Falls back to remote URL
 * - Triggers background download for future use
 */
export const resolveAudioUri = async (
  voiceKey: string,
  remoteUrl: string,
): Promise<string> => {
  // On web, always return the remote URL (no local caching)
  if (Platform.OS === 'web') return remoteUrl;

  // Fast path: already cached
  if (await isCached(voiceKey)) {
    const local = getCachedFilePath(voiceKey);
    if (local) {
      console.log(`[AudioCache] Using cached file: ${local}`);
      return local;
    }
  }

  // Not cached yet — return remote URL and trigger background download
  console.log(`[AudioCache] Cache MISS for ${voiceKey}, using remote. Downloading in background…`);
  downloadAndCache(voiceKey, remoteUrl).catch(() => { });

  return remoteUrl;
};

/**
 * Deletes all cached audio files (for use in settings / reset).
 */
export const clearAudioCache = async (): Promise<void> => {
  const FileSystem = getFileSystem();
  if (!FileSystem) return;
  try {
    const CACHE_DIR = getCacheDir();
    if (!CACHE_DIR) return;
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      console.log('[AudioCache] Cache cleared.');
    }
  } catch (err) {
    console.warn('[AudioCache] Failed to clear cache:', err);
  }
};

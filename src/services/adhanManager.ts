import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { resolveAudioUri, downloadAndCache, isCached } from './audioCache';

// Public Adhan audio streams from IslamCan
export const ADHAN_SOURCES: Record<string, string> = {
  makkah: 'https://islamcan.com/audio/adhan/azan1.mp3',
  madinah: 'https://islamcan.com/audio/adhan/azan2.mp3',
  alaqsa: 'https://islamcan.com/audio/adhan/azan3.mp3',
};

// ── Bundled Adhan assets (shipped with the app — guaranteed offline) ──
// These are used as the LAST fallback for expo-av when both cache and remote fail.
const BUNDLED_ADHAN_ASSETS: Record<string, any> = {
  makkah:  require('../../assets/adhan/azan_makkah.mp3'),
  madinah: require('../../assets/adhan/azan_madinah.mp3'),
  alaqsa:  require('../../assets/adhan/azan_alaqsa.mp3'),
};

// ── Bundled Fajr audio with "As-salatu khayrun mina-n-nawm" phrase ──
const FAJR_WITH_PHRASE_ASSET = require('../../assets/adhan/fajr_bank.mp3');

// Global audio tracking reference
let globalAdhanSound: Audio.Sound | null = null;
let shortAdhanTimeoutMap: NodeJS.Timeout | null = null;

// ── Ensure audio subsystem is enabled (required on some Android devices) ──
let audioInitialized = false;
async function ensureAudioEnabled(): Promise<void> {
  if (audioInitialized) return;
  try {
    await Audio.setIsEnabledAsync(true);
    audioInitialized = true;
    console.log('[AdhanManager] Audio subsystem enabled.');
  } catch (e) {
    console.warn('[AdhanManager] Failed to enable audio subsystem:', e);
  }
}

export const stopAdhan = async () => {
  if (globalAdhanSound) {
    try {
      const status = await globalAdhanSound.getStatusAsync();
      if (status.isLoaded) {
        await globalAdhanSound.stopAsync();
        await globalAdhanSound.unloadAsync();
      }
    } catch (e) {
      console.warn('[AdhanManager] Error stopping current audio:', e);
      // Force unload even if stop failed
      try {
        await globalAdhanSound?.unloadAsync();
      } catch (_) {}
    } finally {
      globalAdhanSound = null;
    }
  }

  if (shortAdhanTimeoutMap) {
    clearTimeout(shortAdhanTimeoutMap);
    shortAdhanTimeoutMap = null;
  }
  
  if (useAppStore.getState().isAdhanPlaying) {
    useAppStore.getState().setAdhanPlaying(false);
  }
};



/**
 * Pre-downloads all three Adhan audio files for offline use.
 * Retries failed downloads once after a 3-second delay.
 * Called at app boot from App.tsx.
 */
export const preloadAdhanAudio = async (): Promise<void> => {
  await ensureAudioEnabled();

  const entries = Object.entries(ADHAN_SOURCES);
  const failedKeys: [string, string][] = [];

  // First pass: download all
  await Promise.allSettled(
    entries.map(async ([key, url]) => {
      try {
        const cached = await isCached(key);
        if (cached) {
          console.log(`[AdhanManager] ${key} already cached, skipping download.`);
          return;
        }
        const result = await downloadAndCache(key, url);
        if (!result) {
          failedKeys.push([key, url]);
        }
      } catch {
        failedKeys.push([key, url]);
      }
    })
  );

  // Retry pass: retry failures once after a short delay
  if (failedKeys.length > 0) {
    console.log(`[AdhanManager] Retrying ${failedKeys.length} failed downloads in 3s...`);
    await new Promise(r => setTimeout(r, 3000));
    await Promise.allSettled(
      failedKeys.map(([key, url]) =>
        downloadAndCache(key, url).catch(() =>
          console.warn(`[AdhanManager] Retry failed for ${key} — will use remote fallback.`)
        )
      )
    );
  }
};

let lastTriggeredPrayer: string | null = null;
let lastTriggeredAt: number = 0;

export const handleAdhanTrigger = async (
  prayerName: string,
  voiceKey: string,
  alertType: string
): Promise<void> => {
  const now = Date.now();
  
  if (lastTriggeredPrayer === prayerName && (now - lastTriggeredAt) < 30_000) {
    console.log(`[AdhanManager] Duplicate trigger blocked for ${prayerName}`);
    return;
  }
  
  const store = useAppStore.getState();
  const { adhanSettings } = store;
  
  if (!adhanSettings.masterEnabled) {
    console.log('[AdhanManager] Master disabled — skipping trigger.');
    return;
  }
  
  const prayerKey = prayerName as keyof typeof adhanSettings.prayers;
  const prayerConfig = adhanSettings.prayers[prayerKey];
  if (!prayerConfig || !prayerConfig.enabled) {
    console.log(`[AdhanManager] Prayer ${prayerName} is disabled — skipping.`);
    return;
  }
  
  const resolvedVoice = prayerConfig.voice || voiceKey || 'makkah';
  const resolvedMode  = prayerConfig.alertType || alertType || 'adhan';
  
  lastTriggeredPrayer = prayerName;
  lastTriggeredAt = now;
  
  // ── Fajr phrase override ──
  const useFajrWithPhrase =
    prayerName === 'Fajr' &&
    resolvedMode === 'adhan' &&
    (adhanSettings.prayers.Fajr.fajrPhrase ?? true);

  console.log(
    `[AdhanManager] Triggering ${prayerName} | voice=${resolvedVoice} | mode=${resolvedMode} | fajrPhrase=${useFajrWithPhrase}`
  );
  
  if (resolvedMode === 'adhan') {
    await playFullAdhan(resolvedVoice, useFajrWithPhrase);
  } else if (resolvedMode === 'beep') {
    await playShortAdhan(resolvedVoice);
  } else if (resolvedMode === 'silent_vibrate') {
    vibrateAdhan();
  }
};

export const playAdhanPreview = async (
  voiceKey: string,
  onLoadingStatusChange?: (loading: boolean) => void
): Promise<void> => {
  console.log(`[AdhanManager] Triggering Preview for: ${voiceKey}`);
  
  await stopAdhan();
  await ensureAudioEnabled();
  useAppStore.getState().setAdhanPlaying(true);

  try {
    const remoteUrl = ADHAN_SOURCES[voiceKey] || ADHAN_SOURCES['makkah'];
    const alreadyCached = await isCached(voiceKey);
    if (!alreadyCached) onLoadingStatusChange?.(true);
    const audioUri = await resolveAudioUri(voiceKey, remoteUrl);

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded && status.didJustFinish) {
          stopAdhan();
        }
      }
    );

    globalAdhanSound = sound;
    onLoadingStatusChange?.(false);

    shortAdhanTimeoutMap = setTimeout(async () => {
      if (globalAdhanSound === sound) {
        await stopAdhan();
      }
    }, 10000);
  } catch (error) {
    console.error('[AdhanManager] Preview failed to load', error);
    useAppStore.getState().setAdhanPlaying(false);
    onLoadingStatusChange?.(false);
  }
};

/**
 * Plays the full Adhan.
 * If useFajrWithPhrase is true, plays the bundled fajr_bank.mp3
 * which includes "As-salatu khayrun mina-n-nawm" — overrides voice selection.
 * Otherwise plays the user's selected voice from remote/cache.
 * 
 * On failure, falls back to vibration pattern so the user is never silently missed.
 */
export const playFullAdhan = async (
  voiceKey: string,
  useFajrWithPhrase: boolean = false
): Promise<void> => {
  console.log(`[AdhanManager] Playing full Adhan: ${voiceKey} | fajrWithPhrase=${useFajrWithPhrase}`);
  
  await stopAdhan();
  await ensureAudioEnabled();
  useAppStore.getState().setAdhanPlaying(true);

  const onFinished = (status: any) => {
    if (status.isLoaded && status.didJustFinish) {
      console.log('[AdhanManager] Full Adhan playback finished.');
      stopAdhan();
    }
  };

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    // ── Determine audio source ──
    let audioSource: any;
    if (useFajrWithPhrase) {
      audioSource = FAJR_WITH_PHRASE_ASSET;
      console.log('[AdhanManager] Using bundled fajr_bank.mp3 (phrase enabled)');
    } else {
      const resolvedKey = ADHAN_SOURCES[voiceKey] ? voiceKey : 'makkah';
      const remoteUrl = ADHAN_SOURCES[resolvedKey];
      const audioUri = await resolveAudioUri(resolvedKey, remoteUrl);
      audioSource = { uri: audioUri };
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: true },
        onFinished
      );
      globalAdhanSound = sound;
    } catch (primaryError) {
      // Primary source failed (network/cache issue) — try bundled asset
      const bundled = BUNDLED_ADHAN_ASSETS[voiceKey] || BUNDLED_ADHAN_ASSETS.makkah;
      console.warn('[AdhanManager] Primary source failed, using bundled asset fallback.', primaryError);
      const { sound } = await Audio.Sound.createAsync(
        bundled,
        { shouldPlay: true },
        onFinished
      );
      globalAdhanSound = sound;
    }
  } catch (error) {
    console.error('[AdhanManager] All audio sources failed — falling back to vibration.', error);
    useAppStore.getState().setAdhanPlaying(false);
    vibrateAdhan();
  }
};

export const playShortAdhan = async (voiceKey: string): Promise<void> => {
  console.log(`[AdhanManager] Playing short Adhan clip: ${voiceKey}`);
  
  await stopAdhan();
  await ensureAudioEnabled();
  useAppStore.getState().setAdhanPlaying(true);

  const onFinished = (status: any) => {
    if (status.isLoaded && status.didJustFinish) {
      stopAdhan();
    }
  };

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const resolvedKey = ADHAN_SOURCES[voiceKey] ? voiceKey : 'makkah';
    const remoteUrl = ADHAN_SOURCES[resolvedKey];
    const audioUri = await resolveAudioUri(resolvedKey, remoteUrl);

    let sound: Audio.Sound;
    try {
      const result = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        onFinished
      );
      sound = result.sound;
    } catch (primaryError) {
      // Primary source failed — try bundled asset
      const bundled = BUNDLED_ADHAN_ASSETS[voiceKey] || BUNDLED_ADHAN_ASSETS.makkah;
      console.warn('[AdhanManager] Short clip primary source failed, using bundled fallback.', primaryError);
      const result = await Audio.Sound.createAsync(
        bundled,
        { shouldPlay: true },
        onFinished
      );
      sound = result.sound;
    }

    globalAdhanSound = sound;

    shortAdhanTimeoutMap = setTimeout(async () => {
      if (globalAdhanSound === sound) {
        await stopAdhan();
      }
    }, 8000);
  } catch (error) {
    console.error('[AdhanManager] All short clip sources failed — falling back to vibration.', error);
    useAppStore.getState().setAdhanPlaying(false);
    vibrateAdhan();
  }
};

export const vibrateAdhan = (): void => {
  // Set isAdhanPlaying briefly so Quran reader pauses consistently
  useAppStore.getState().setAdhanPlaying(true);
  Vibration.vibrate([0, 500, 200, 500, 200, 500]);
  // Clear the flag after vibration completes (~2.4s total pattern)
  setTimeout(() => {
    useAppStore.getState().setAdhanPlaying(false);
  }, 2500);
};

import { Audio } from 'expo-av';
import { Vibration } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { resolveAudioUri, downloadAndCache, isCached } from './audioCache';

// Public Archive.org audio streams - Highly reliable and CORS friendly
export const ADHAN_SOURCES: Record<string, string> = {
  makkah: 'https://ia801905.us.archive.org/16/items/AdhanMakkah/Adhan%20Makkah.mp3',
  madinah: 'https://ia800405.us.archive.org/16/items/AdhanMadinah/Adhan%20Madinah.mp3',
  alaqsa: 'https://ia601402.us.archive.org/16/items/AdhanAlAqsa/Adhan%20AlAqsa.mp3',
};

// Global audio tracking reference
let globalAdhanSound: Audio.Sound | null = null;
let shortAdhanTimeoutMap: NodeJS.Timeout | null = null;

/**
 * Ensures any previously playing Adhan is stopped and memory is freed.
 */
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
    } finally {
      globalAdhanSound = null;
    }
  }

  if (shortAdhanTimeoutMap) {
    clearTimeout(shortAdhanTimeoutMap);
    shortAdhanTimeoutMap = null;
  }
  
  // Safely untoggle the state
  if (useAppStore.getState().isAdhanPlaying) {
    useAppStore.getState().setAdhanPlaying(false);
  }
};

/**
 * Primary Global Adhan Execution Trigger.
 * Forces an override of any currently playing Audio across the app.
 */
export const playAdhan = async (voiceKey: string): Promise<void> => {
  console.log(`[AdhanManager] Preparing to play Adhan using voice config: ${voiceKey}`);

  try {
    const remoteUrl = ADHAN_SOURCES[voiceKey] || ADHAN_SOURCES['makkah'];
    const audioUri = await resolveAudioUri(voiceKey, remoteUrl);

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('[AdhanManager] Playback naturally finished.');
          stopAdhan();
        }
      }
    );

    globalAdhanSound = sound;
  } catch (error) {
    console.error('[AdhanManager] Failed to load/play Adhan stream', error);
    useAppStore.getState().setAdhanPlaying(false);
  }
};

/**
 * Eagerly download all Adhan voices in the background so they are
 * available instantly for preview/playback on first tap.
 */
export const preloadAdhanAudio = (): void => {
  Object.entries(ADHAN_SOURCES).forEach(([key, url]) => {
    downloadAndCache(key, url).catch(() => {});
  });
};

// Duplicate trigger guard — tracks the last prayer we triggered to prevent
// double-firing if both foreground and background listeners fire simultaneously.
let lastTriggeredPrayer: string | null = null;
let lastTriggeredAt: number = 0;

/**
 * Central Adhan Execution Engine.
 * Called when a notification fires (foreground OR background tap).
 * Reads the current store state to determine WHAT to do and HOW.
 */
export const handleAdhanTrigger = async (prayerName: string, voiceKey: string, alertType: string): Promise<void> => {
  const now = Date.now();
  
  // Prevent duplicate triggers within a 30-second window
  if (lastTriggeredPrayer === prayerName && (now - lastTriggeredAt) < 30_000) {
    console.log(`[AdhanManager] Duplicate trigger blocked for ${prayerName}`);
    return;
  }
  
  const store = useAppStore.getState();
  const { adhanSettings } = store;
  
  // Guard 1: Global master toggle
  if (!adhanSettings.masterEnabled) {
    console.log('[AdhanManager] Master disabled — skipping trigger.');
    return;
  }
  
  // Guard 2: Per-prayer enable flag
  const prayerKey = prayerName as keyof typeof adhanSettings.prayers;
  const prayerConfig = adhanSettings.prayers[prayerKey];
  if (!prayerConfig || !prayerConfig.enabled) {
    console.log(`[AdhanManager] Prayer ${prayerName} is disabled — skipping.`);
    return;
  }
  
  // Use stored settings as truth, fall back to notification payload values
  const resolvedVoice = prayerConfig.voice || voiceKey || 'makkah';
  const resolvedMode = prayerConfig.alertType || alertType || 'adhan';
  
  // Mark this as the last triggered prayer
  lastTriggeredPrayer = prayerName;
  lastTriggeredAt = now;
  
  console.log(`[AdhanManager] Triggering ${prayerName} | voice=${resolvedVoice} | mode=${resolvedMode}`);
  
  if (resolvedMode === 'adhan') {
    await playFullAdhan(resolvedVoice);
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
  useAppStore.getState().setAdhanPlaying(true);

  try {
    const remoteUrl = ADHAN_SOURCES[voiceKey] || ADHAN_SOURCES['makkah'];

    // Only show loading spinner if we need to fetch from network
    const alreadyCached = await isCached(voiceKey);
    if (!alreadyCached) onLoadingStatusChange?.(true);

    // Cache-first: play local if available, trigger background download otherwise
    const audioUri = await resolveAudioUri(voiceKey, remoteUrl);

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
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

    // Hide spinner — audio is now loaded and playing
    onLoadingStatusChange?.(false);

    // Skip 2s of Archive.org silence only when streaming remotely
    if (!alreadyCached && audioUri.startsWith('http')) {
      await sound.setPositionAsync(2000);
    }

    // Auto-stop after 10 seconds explicitly managed by our global timeout reference
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
 * Plays the full Adhan audio until it naturally finishes.
 * Used for the "Full Adhan" alert mode.
 */
export const playFullAdhan = async (voiceKey: string): Promise<void> => {
  console.log(`[AdhanManager] Playing full Adhan: ${voiceKey}`);
  
  await stopAdhan();
  useAppStore.getState().setAdhanPlaying(true);

  try {
    const remoteUrl = ADHAN_SOURCES[voiceKey] || ADHAN_SOURCES['makkah'];
    const audioUri = await resolveAudioUri(voiceKey, remoteUrl);

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('[AdhanManager] Full Adhan playback finished.');
          stopAdhan();
        }
      }
    );
    globalAdhanSound = sound;
  } catch (error) {
    console.error('[AdhanManager] Full Adhan failed to load', error);
    useAppStore.getState().setAdhanPlaying(false);
  }
};

/**
 * Plays a short clip (first ~8 seconds) of the Adhan.
 * Used for the "Short Notification" alert mode.
 */
export const playShortAdhan = async (voiceKey: string): Promise<void> => {
  console.log(`[AdhanManager] Playing short Adhan clip: ${voiceKey}`);
  
  await stopAdhan();
  useAppStore.getState().setAdhanPlaying(true);

  try {
    const remoteUrl = ADHAN_SOURCES[voiceKey] || ADHAN_SOURCES['makkah'];
    const audioUri = await resolveAudioUri(voiceKey, remoteUrl);

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
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

    // Auto-stop after 8 seconds exclusively mapping the singleton to avoid
    // previously aborted playbacks cancelling newly triggered ones.
    shortAdhanTimeoutMap = setTimeout(async () => {
      if (globalAdhanSound === sound) {
        await stopAdhan();
      }
    }, 8000);
  } catch (error) {
    console.error('[AdhanManager] Short Adhan failed to load', error);
    useAppStore.getState().setAdhanPlaying(false);
  }
};

/**
 * Triggers device vibration for the "Vibrate Only" alert mode.
 */
export const vibrateAdhan = (): void => {
  // Three-pulse vibration pattern mimicking a notification
  Vibration.vibrate([0, 500, 200, 500, 200, 500]);
};

import { Audio } from 'expo-av';
import { Vibration } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { resolveAudioUri, downloadAndCache, isCached } from './audioCache';

// Public Adhan audio streams from IslamCan
export const ADHAN_SOURCES: Record<string, string> = {
  makkah: 'https://islamcan.com/audio/adhan/azan1.mp3',
  madinah: 'https://islamcan.com/audio/adhan/azan2.mp3',
  alaqsa: 'https://islamcan.com/audio/adhan/azan3.mp3',
};

// ── Bundled Fajr audio with "As-salatu khayrun mina-n-nawm" phrase ──
const FAJR_WITH_PHRASE_ASSET = require('../../assets/adhan/fajr_bank.mp3');

// Global audio tracking reference
let globalAdhanSound: Audio.Sound | null = null;
let shortAdhanTimeoutMap: NodeJS.Timeout | null = null;

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
  
  if (useAppStore.getState().isAdhanPlaying) {
    useAppStore.getState().setAdhanPlaying(false);
  }
};



export const preloadAdhanAudio = (): void => {
  Object.entries(ADHAN_SOURCES).forEach(([key, url]) => {
    downloadAndCache(key, url).catch(() => {});
  });
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
  useAppStore.getState().setAdhanPlaying(true);

  try {
    const remoteUrl = ADHAN_SOURCES[voiceKey] || ADHAN_SOURCES['makkah'];
    const alreadyCached = await isCached(voiceKey);
    if (!alreadyCached) onLoadingStatusChange?.(true);
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
 */
export const playFullAdhan = async (
  voiceKey: string,
  useFajrWithPhrase: boolean = false
): Promise<void> => {
  console.log(`[AdhanManager] Playing full Adhan: ${voiceKey} | fajrWithPhrase=${useFajrWithPhrase}`);
  
  await stopAdhan();
  useAppStore.getState().setAdhanPlaying(true);

  try {
    // ── Swap audio source based on Fajr phrase toggle ──
    let audioSource: any;
    if (useFajrWithPhrase) {
      audioSource = FAJR_WITH_PHRASE_ASSET;
      console.log('[AdhanManager] Using bundled fajr_bank.mp3 (phrase enabled)');
    } else {
      const remoteUrl = ADHAN_SOURCES[voiceKey] || ADHAN_SOURCES['makkah'];
      const audioUri = await resolveAudioUri(voiceKey, remoteUrl);
      audioSource = { uri: audioUri };
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      audioSource,
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

export const vibrateAdhan = (): void => {
  Vibration.vibrate([0, 500, 200, 500, 200, 500]);
};

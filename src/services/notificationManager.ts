import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import { useAppStore } from '../store/useAppStore';
import { PrayerTimes, getCalendarForMonth, DailyPrayerData } from './prayerTimes';
import { handleAdhanTrigger } from './adhanManager';
import { Prayer } from '../theme';
import { navigationRef } from '../navigation/navigationRef';
import { updatePrayerStatusNotification } from './prayerStatusManager';
import { updatePrayerStatusNotification } from './prayerStatusManager';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  console.log('[NotificationManager] Background task triggered (Boot completed).');
  
  let attempts = 0;
  while (!useAppStore.persist?.hasHydrated?.() && attempts < 10) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }
  
  await syncPrayerNotifications(true);
});

const NOTIFICATION_CACHE_KEY = '@dheen_notifications_synced_month';
const NOTIFICATION_SETTINGS_HASH_KEY = '@dheen_notifications_settings_hash';

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SOUND MAPPING
// ─────────────────────────────────────────────────────────────────────────────
// These filenames must match exactly what's bundled via the expo-notifications
// plugin "sounds" config in app.json. The files are copied to Android's res/raw/
// at build time. When a notification fires on a channel with one of these sounds,
// the OS plays the FULL audio automatically — even when the app is killed.
// ─────────────────────────────────────────────────────────────────────────────

const VOICE_SOUND_MAP: Record<string, string> = {
  makkah:  'azan_makkah.mp3',
  madinah: 'azan_madinah.mp3',
  alaqsa:  'azan_alaqsa.mp3',
};
const FAJR_PHRASE_SOUND = 'fajr_bank.mp3';

// One channel per voice + one for Fajr phrase + one for beep + one for silent
// v6: bumped from v5 because Android channels are permanent — broken v5 channels
// (which referenced missing sound files before app.json was corrected) cannot be
// repaired. A new channel ID is the only way to get a fresh channel on existing installs.
const CHANNEL_IDS: Record<string, string> = {
  makkah:      'adhan_makkah_v6',
  madinah:     'adhan_madinah_v6',
  alaqsa:      'adhan_alaqsa_v6',
  fajr_phrase: 'adhan_fajr_phrase_v6',
  beep:        'adhan_beep_v6',
  silent:      'adhan_silent_v6',
  pre_alert:   'adhan_pre_alert_v6',
};

// ── Android Notification Channels ───────────────────────────────────────────
// Android 8+ REQUIRES a notification channel. The sound set on the channel
// is what the OS plays automatically at trigger time — no app code needed.
// ─────────────────────────────────────────────────────────────────────────────
export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // Full Adhan channels — one per voice
    for (const [voiceKey, channelId] of Object.entries(CHANNEL_IDS)) {
      if (voiceKey === 'beep' || voiceKey === 'silent' || voiceKey === 'pre_alert') continue;

      const soundFile = voiceKey === 'fajr_phrase'
        ? FAJR_PHRASE_SOUND
        : VOICE_SOUND_MAP[voiceKey];

      await Notifications.setNotificationChannelAsync(channelId, {
        name: `Adhan – ${voiceKey === 'fajr_phrase' ? 'Fajr (Special)' : voiceKey.charAt(0).toUpperCase() + voiceKey.slice(1)}`,
        description: 'Full Adhan recitation at prayer time',
        // MAX is required for alarm-class audio. HIGH can be silenced by DND.
        importance: Notifications.AndroidImportance.MAX,
        sound: soundFile,
        vibrationPattern: [0, 500, 200, 500],
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true, // Prayer alerts should bypass Do Not Disturb
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
        },
      });
    }

    // Short beep channel — uses default system notification sound
    await Notifications.setNotificationChannelAsync(CHANNEL_IDS.beep, {
      name: 'Adhan – Short Alert',
      description: 'Short beep alert at prayer time',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      bypassDnd: true, // Prayer alerts should bypass Do Not Disturb
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Silent vibrate channel — no sound, only vibration
    await Notifications.setNotificationChannelAsync(CHANNEL_IDS.silent, {
      name: 'Adhan – Silent Vibrate',
      description: 'Vibration-only alert at prayer time',
      importance: Notifications.AndroidImportance.MAX,
      sound: null,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      enableVibrate: true,
      bypassDnd: true, // Prayer alerts should bypass Do Not Disturb
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Pre-alert channel — standard notification
    await Notifications.setNotificationChannelAsync(CHANNEL_IDS.pre_alert, {
      name: 'Prayer Reminders',
      description: 'Advance reminders before prayer time',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    console.log('[NotificationManager] All Android channels created.');
  } catch (e) {
    console.warn('[NotificationManager] Failed to create Android channels:', e);
  }
}

/**
 * Returns the correct Android channel ID for a given prayer configuration.
 * This determines which sound the OS plays automatically at trigger time.
 */
export function getChannelForPrayer(
  prayer: string,
  alertType: string,
  voiceKey: string,
  fajrPhrase: boolean
): string {
  if (alertType === 'silent_vibrate') return CHANNEL_IDS.silent;
  if (alertType === 'beep') return CHANNEL_IDS.beep;

  // Full adhan mode
  if (prayer === 'Fajr' && fajrPhrase) return CHANNEL_IDS.fajr_phrase;
  return CHANNEL_IDS[voiceKey] || CHANNEL_IDS.makkah;
}

/**
 * Returns the correct sound filename for a given prayer configuration.
 * Used in the notification content's `sound` field.
 */
function getSoundForPrayer(
  prayer: string,
  alertType: string,
  voiceKey: string,
  fajrPhrase: boolean
): string | null {
  if (alertType === 'silent_vibrate') return null;
  if (alertType === 'beep') return 'default';

  // Full adhan
  if (prayer === 'Fajr' && fajrPhrase) return FAJR_PHRASE_SOUND;
  return VOICE_SOUND_MAP[voiceKey] || VOICE_SOUND_MAP.makkah;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND HANDLER
// ─────────────────────────────────────────────────────────────────────────────
/**
 * When the app is in the FOREGROUND:
 * - shouldPlaySound: false → we suppress the notification sound because we
 *   play audio ourselves via expo-av (richer experience, background audio, controls)
 * - shouldShowAlert: true → the banner still appears
 *
 * When the app is BACKGROUNDED or KILLED:
 * - This handler does NOT run (only runs in foreground)
 * - The OS uses the channel's sound setting → plays the full Adhan automatically
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const { data } = notification.request.content;
      const isAdhan = data?.intent === 'play_adhan';

      return {
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        // In foreground: suppress notification sound for adhan (we play via expo-av)
        // For pre-alerts: play the default system sound
        shouldPlaySound: !isAdhan,
        shouldSetBadge: false,
      };
    },
  });
}

/**
 * Requests native notification permissions from the OS.
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[NotificationManager] Notification permissions denied.');
    return false;
  }

  return true;
};

/**
 * On Android 12 (API 31-32), SCHEDULE_EXACT_ALARM requires the user to
 * manually grant "Alarms & Reminders" in system settings.
 * On Android 13+ with USE_EXACT_ALARM declared in the manifest,
 * the OS grants it automatically — no user dialog needed or possible.
 */
export async function requestExactAlarmPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // Only needed on API 31-32. On API 33+ USE_EXACT_ALARM is auto-granted.
  // Platform.Version is the API level integer on Android.
  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);
  if (apiLevel >= 33) {
    console.log('[NotificationManager] API 33+ — USE_EXACT_ALARM auto-granted, skipping dialog.');
    return;
  }
  try {
    await IntentLauncher.startActivityAsync(
      'android.settings.REQUEST_SCHEDULE_EXACT_ALARM' as any
    );
  } catch (e) {
    console.log('[NotificationManager] Could not open exact alarm settings:', e);
  }
}

/**
 * Directly prompts the user to whitelist the app from battery optimization.
 * This is the most impactful fix for OEM-specific late/missing Adhan
 * on Samsung, Xiaomi, Oppo, OnePlus etc.
 */
export async function requestBatteryOptimizationWhitelist(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // Direct prompt: shows "Allow [App] to always run in background?" dialog
    await IntentLauncher.startActivityAsync(
      'android.intent.action.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS' as any,
      { data: 'package:com.alrawi.muslimpro' }
    );
  } catch (e) {
    // Fallback: open the general battery optimization list for the user to find the app
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
      );
    } catch (_) {
      console.warn('[NotificationManager] Could not open battery optimization settings:', e);
    }
  }
}

/**
 * Generates a stable hash of adhan settings + location.
 * Includes lat/lng/city/country so a location change forces a re-sync.
 */
function getSettingsHash(settings: any, profile?: any): string {
  try {
    const relevant = {
      me: settings.masterEnabled,
      p: Object.entries(settings.prayers).map(([k, v]: [string, any]) =>
        `${k}:${v.enabled}:${v.voice}:${v.alertType}:${v.preAlert}:${v.fajrPhrase ?? ''}`
      ).join('|'),
      qh: settings.quietHoursEnabled,
      qf: settings.quietFrom,
      qt: settings.quietTo,
      afq: settings.allowFajrDuringQuiet,
      // Location fields — so moving city forces a resync
      lat: profile?.latitude?.toFixed(2) ?? '',
      lng: profile?.longitude?.toFixed(2) ?? '',
      city: profile?.city ?? '',
      country: profile?.country ?? '',
    };
    return JSON.stringify(relevant);
  } catch {
    return '';
  }
}

/**
 * Main Scheduling engine. Clears all existing notifications and schedules
 * OS-level background triggers for the next 30 days of prayer times.
 *
 * Each notification is assigned to a voice-specific Android channel.
 * When the notification fires, the OS plays the channel's sound automatically —
 * even if the app is completely killed.
 */
let isSyncing = false;

export const syncPrayerNotifications = async (forceResync = false) => {
  if (isSyncing) return;
  if (Platform.OS === 'web') return;

  const store = useAppStore.getState();
  const settings = store.adhanSettings;
  const profile = store.profile;

  // ── Smart re-sync guard ──────────────────────────────────
  try {
    const lastSync = await AsyncStorage.getItem(NOTIFICATION_CACHE_KEY);
    const lastHash = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_HASH_KEY);
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentHash = getSettingsHash(settings, profile);

    // If master is enabled, check if we actually have scheduled alarms.
    // If we have 0 scheduled alarms but master is enabled, we need to force rescheduling.
    let hasScheduled = false;
    if (settings.masterEnabled) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      hasScheduled = scheduled.length > 0;
    }

    if (
      lastSync === currentMonthKey &&
      lastHash === currentHash &&
      (!settings.masterEnabled || hasScheduled) &&
      !forceResync
    ) {
      console.log(`[NotificationManager] Already scheduled for ${currentMonthKey} with current settings, skipping.`);
      return;
    }
  } catch (_) {}

  isSyncing = true;
  
  try {

  // Ensure all Android channels exist before scheduling
  await ensureAndroidChannels();

  // profile already read above the re-sync guard

  // Clear existing to avoid duplicate overlaps
  await Notifications.cancelAllScheduledNotificationsAsync();

  // If Master disabled, stop here.
  if (!settings.masterEnabled) {
    console.log('[NotificationManager] Master disabled. Cleared schedules.');
    try {
      await AsyncStorage.removeItem(NOTIFICATION_CACHE_KEY);
      await AsyncStorage.removeItem(NOTIFICATION_SETTINGS_HASH_KEY);
    } catch (_) {}
    return;
  }

  const options = {
    latitude: profile.latitude ?? undefined,
    longitude: profile.longitude ?? undefined,
    city: profile.city || undefined,
    country: profile.country || undefined,
  };

  const now = new Date();
  let daysData: DailyPrayerData[] = [];

  try {
    const currentMonthData = await getCalendarForMonth(now, options);
    daysData = [...currentMonthData];

    const nextMonthDate = new Date(now);
    nextMonthDate.setMonth(now.getMonth() + 1);
    nextMonthDate.setDate(1);
    try {
      const nextMonthData = await getCalendarForMonth(nextMonthDate, options);
      daysData = [...daysData, ...nextMonthData];
      console.log(`[NotificationManager] Fetched ${daysData.length} days of prayer data.`);
    } catch (e) {
      console.warn('[NotificationManager] Could not prefetch next month, continuing with current month only.', e);
    }
  } catch (e) {
    console.error('[NotificationManager] Failed to get calendar for notifications', e);
    return;
  }

  const prayers: Prayer[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  let scheduledCount = 0;
  // Android supports hundreds of exact alarms. 200 covers 30 days × 5 prayers × 2 (with pre-alerts).
  const MAX_NOTIFICATIONS = 200;

  for (let offset = 0; offset < 30; offset++) {
    if (scheduledCount >= MAX_NOTIFICATIONS) break;

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + offset);

    const dayStr = `${String(targetDate.getDate()).padStart(2, '0')}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${targetDate.getFullYear()}`;
    let dayData = daysData.find(d => d.dateStr === dayStr);

    // Offline month transition fallback
    if (!dayData && daysData.length > 0) {
      dayData = daysData[daysData.length - 1];
    }

    if (!dayData) continue;

    for (const prayer of prayers) {
      if (scheduledCount >= MAX_NOTIFICATIONS) break;

      const prayerConfig = settings.prayers[prayer];
      if (!prayerConfig.enabled) continue;

      const timeStr = dayData.times[prayer as keyof typeof dayData.times] as string;
      if (!timeStr) continue;

      const [hour, minute] = timeStr.split(':').map(Number);
      const triggerDate = new Date(targetDate);
      triggerDate.setHours(hour, minute, 0, 0);

      if (triggerDate <= now) continue;

      // Quiet hours check
      if (settings.quietHoursEnabled) {
        const [quietFromH, quietFromM] = settings.quietFrom.split(':').map(Number);
        const [quietToH, quietToM] = settings.quietTo.split(':').map(Number);
        const triggerMins = hour * 60 + minute;
        const fromMins = quietFromH * 60 + quietFromM;
        const toMins = quietToH * 60 + quietToM;

        const isInQuietHours = fromMins > toMins
          ? (triggerMins >= fromMins || triggerMins < toMins)
          : (triggerMins >= fromMins && triggerMins < toMins);

        if (isInQuietHours) {
          if (!(prayer === 'Fajr' && settings.allowFajrDuringQuiet)) {
            continue;
          }
        }
      }

      // Determine the correct channel and sound for this prayer
      const fajrPhrase = prayer === 'Fajr' && (prayerConfig.fajrPhrase ?? true);
      const channelId = getChannelForPrayer(prayer, prayerConfig.alertType, prayerConfig.voice, fajrPhrase);
      const soundFile = getSoundForPrayer(prayer, prayerConfig.alertType, prayerConfig.voice, fajrPhrase);

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${prayer} Prayer Time`,
            body: `It's time for ${prayer} prayer`,
            // The sound field tells the OS WHAT to play.
            // On Android, this references a file in res/raw/ (bundled via app.json plugin).
            sound: soundFile ?? undefined,
            data: {
              intent: 'play_adhan',
              prayer,
              voiceKey: prayerConfig.voice,
              alertType: prayerConfig.alertType,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId,
          },
        });
        scheduledCount++;
      } catch (scheduleError) {
        console.warn(`[NotificationManager] Failed to schedule ${prayer} on ${dayStr}:`, scheduleError);
      }

      // Pre-alert (with quiet hours check)
      if (prayerConfig.preAlert > 0 && scheduledCount < MAX_NOTIFICATIONS) {
        const preAlertDate = new Date(triggerDate.getTime() - prayerConfig.preAlert * 60 * 1000);
        if (preAlertDate > now) {
          // Apply quiet hours check to pre-alert too
          let preAlertInQuiet = false;
          if (settings.quietHoursEnabled) {
            const [quietFromH, quietFromM] = settings.quietFrom.split(':').map(Number);
            const [quietToH, quietToM] = settings.quietTo.split(':').map(Number);
            const preH = preAlertDate.getHours();
            const preM = preAlertDate.getMinutes();
            const preMins = preH * 60 + preM;
            const fromMins = quietFromH * 60 + quietFromM;
            const toMins = quietToH * 60 + quietToM;
            preAlertInQuiet = fromMins > toMins
              ? (preMins >= fromMins || preMins < toMins)
              : (preMins >= fromMins && preMins < toMins);
            if (prayer === 'Fajr' && settings.allowFajrDuringQuiet) preAlertInQuiet = false;
          }

          if (!preAlertInQuiet) {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `${prayer} in ${prayerConfig.preAlert} minutes`,
                  body: `Prepare for ${prayer} prayer`,
                  sound: 'default',
                  data: { intent: 'pre_alert', prayer },
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: preAlertDate,
                  channelId: CHANNEL_IDS.pre_alert,
                },
              });
              scheduledCount++;
            } catch (preAlertError) {
              console.warn(`[NotificationManager] Failed to schedule pre-alert for ${prayer}:`, preAlertError);
            }
          }
        }
      }
    }
  }

  // Mark synced
  try {
    const syncNow = new Date();
    const currentMonthKey = `${syncNow.getFullYear()}-${String(syncNow.getMonth() + 1).padStart(2, '0')}`;
    await AsyncStorage.setItem(NOTIFICATION_CACHE_KEY, currentMonthKey);
    // Save hash with location so future location changes invalidate the cache
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_HASH_KEY, getSettingsHash(settings, profile));
  } catch (_) {}

  // Also sync the persistent prayer status notification if enabled
  await updatePrayerStatusNotification();

  console.log(`[NotificationManager] Successfully scheduled ${scheduledCount} notifications for the next 30 days.`);

  // ── Diagnostic: verify actual scheduled count ─────────────────────────────
  // If this logs 0 after a successful sync, the problem is in scheduling (e.g.
  // permissions, exact alarm denied, all times already past).
  // If this logs >0, the problem is in delivery (e.g. channel sound missing,
  // channel misconfigured, battery optimisation killing the alarm).
  if (Platform.OS === 'android') {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      // Filter out the prayer status TIME_INTERVAL notification from the count
      const adhanOnly = scheduled.filter(
        n => n.content.data?.intent !== 'prayer_status'
      );
      console.log(
        `[NotificationManager] DIAGNOSTIC: ${adhanOnly.length} Adhan notifications currently in the schedule queue.` +
        ` (${adhanOnly.length === 0 ? 'PROBLEM IS IN SCHEDULING' : 'Scheduling OK — if silent, problem is in DELIVERY/CHANNEL'})`
      );
    } catch (e) {
      console.warn('[NotificationManager] DIAGNOSTIC: Could not read scheduled notifications:', e);
    }
  }
  } finally {
    isSyncing = false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPER TESTING (TEMPORARY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Developer Testing: Schedules a test notification 30 seconds in the future
 * using the EXACT same channel and payload as a real prayer.
 */
export async function scheduleTestAdhan(
  prayer: string,
  voiceKey: string,
  alertType: string,
  fajrPhrase: boolean
): Promise<Date> {
  if (Platform.OS === 'web') throw new Error('Not supported on web');

  await ensureAndroidChannels();

  const triggerDate = new Date(Date.now() + 30 * 1000); // 30 seconds from now
  const channelId = getChannelForPrayer(prayer, alertType, voiceKey, fajrPhrase);
  const soundFile = getSoundForPrayer(prayer, alertType, voiceKey, fajrPhrase);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `[TEST] ${prayer} Prayer Time`,
      body: `Test notification scheduled for ${triggerDate.toLocaleTimeString()}`,
      sound: soundFile ?? undefined,
      data: {
        intent: 'play_adhan',
        prayer,
        voiceKey,
        alertType,
        isTest: true,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId,
    },
  });

  return triggerDate;
}

/**
 * Returns debug info for the settings screen.
 */
export async function getDebugNotificationInfo() {
  if (Platform.OS === 'web') return { scheduledCount: 0, notificationGranted: false, exactAlarmGranted: false };
  
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const perms = await Notifications.getPermissionsAsync();
  
  let exactAlarmGranted = true; // Auto-granted on iOS and Android 13+ (with USE_EXACT_ALARM)
  if (Platform.OS === 'android') {
    const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
    if (apiLevel < 33) {
      // On API 31-32, it's a special permission we can't easily check synchronously via expo-notifications
      exactAlarmGranted = false; // Just flag it as potentially needing attention
    }
  }

  return {
    scheduledCount: scheduled.length,
    notificationGranted: perms.status === 'granted',
    exactAlarmGranted,
  };
}
// NOTIFICATION LISTENERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely navigates to AdhanAlert screen with retry logic.
 */
function navigateToAdhanAlert(prayer: string, retries = 5): void {
  if (navigationRef.isReady()) {
    try {
      (navigationRef.navigate as any)('AdhanAlert', { prayer });
    } catch (e) {
      console.warn('[NotificationManager] Navigation failed:', e);
    }
    return;
  }
  if (retries > 0) {
    setTimeout(() => navigateToAdhanAlert(prayer, retries - 1), 500);
  }
}

/**
 * Processes an adhan intent from a notification.
 * Called from foreground listener (plays via expo-av for rich experience)
 * and from response listener (user tapped notification — app was backgrounded/killed).
 */
async function processAdhanIntent(data: any, fromUserTap: boolean = false): Promise<void> {
  if (data?.intent !== 'play_adhan') return;

  const prayer = String(data.prayer || '');
  if (!prayer) return;

  // Wait for Zustand store to rehydrate on cold start
  let attempts = 0;
  while (!useAppStore.persist?.hasHydrated?.() && attempts < 10) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }

  if (fromUserTap) {
    // User tapped the notification to open the app.
    // The OS notification sound (Adhan) is already playing or has finished.
    // We navigate to the alert screen but DON'T re-trigger audio playback
    // to avoid double-play. The user can interact with the alert screen.
    navigateToAdhanAlert(prayer);
  } else {
    // FOREGROUND: the notification handler suppressed the notification sound.
    // We play via expo-av for the richer in-app experience with controls.
    handleAdhanTrigger(
      prayer,
      String(data.voiceKey || 'makkah'),
      String(data.alertType || 'adhan'),
    );
    navigateToAdhanAlert(prayer);
  }
}

/**
 * Initializes listeners dynamically on App boot.
 */
export const initializeNotificationEngine = () => {
  if (Platform.OS === 'web') return () => {};

  // Ensure Android channels exist at boot
  ensureAndroidChannels();

  // Register background task for boot completed
  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(e => {
    console.warn('[NotificationManager] Failed to register background task:', e);
  });

  // ── COLD START HANDLER ──────────────────────────────────────────
  // When the app was killed and user taps a notification to open it.
  Notifications.getLastNotificationResponseAsync().then(response => {
    if (response) {
      const { data } = response.notification.request.content;
      console.log('[NotificationManager] Cold-start notification response:', data);
      processAdhanIntent(data, true);
    }
  }).catch(() => {});

  // 1. FOREGROUND TRIGGER
  // Fires when user is ACTIVELY in the app and the scheduled time occurs.
  // We play audio via expo-av (richer experience).
  const fgSubscription = Notifications.addNotificationReceivedListener(notification => {
    const { data } = notification.request.content;
    console.log('[NotificationManager] Foreground Hit!', data);
    processAdhanIntent(data, false);
  });

  // 2. BACKGROUND / KILLED RESPONSE TRIGGER
  // Fires when user taps the notification banner.
  // Audio is already playing via the OS notification sound — just navigate.
  const bgSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { data } = response.notification.request.content;
    console.log('[NotificationManager] Notification Tap Hit!', data);
    processAdhanIntent(data, true);
  });

  return () => {
    fgSubscription.remove();
    bgSubscription.remove();
  };
};

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { fetchPrayerTimes, getNextPrayer, formatTime } from './prayerTimes';

const PRAYER_STATUS_CHANNEL = 'prayer_status_v1';
// Stable identifier so repeated calls update the same entry rather than stacking duplicates.
const PRAYER_STATUS_NOTIFICATION_ID = 'persistent_prayer_status';

export async function ensurePrayerStatusChannel() {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync(PRAYER_STATUS_CHANNEL, {
      name: 'Prayer Status',
      description: 'Persistent notification showing current and next prayer',
      // LOW importance: no sound, no heads-up popup, quietly appears in the shade.
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: false,
    });
    console.log('[PrayerStatusManager] Prayer Status channel created/verified.');
  } catch (e) {
    console.warn('[PrayerStatusManager] Failed to create Prayer Status channel:', e);
  }
}

export async function disablePrayerStatusNotification() {
  if (Platform.OS === 'web') return;
  try {
    // Cancel from the scheduled queue (in case it hasn't fired yet)
    await Notifications.cancelScheduledNotificationAsync(PRAYER_STATUS_NOTIFICATION_ID);
  } catch (_) {}
  try {
    // Also dismiss from the notification shade (in case it already fired and is visible)
    await Notifications.dismissNotificationAsync(PRAYER_STATUS_NOTIFICATION_ID);
    console.log('[PrayerStatusManager] Persistent notification dismissed.');
  } catch (_) {
    // dismissNotificationAsync throws if the notification doesn't exist yet — safe to ignore.
    console.log('[PrayerStatusManager] Nothing to dismiss (notification may not exist yet).');
  }
}

export async function updatePrayerStatusNotification() {
  if (Platform.OS === 'web') return;

  const store = useAppStore.getState();
  if (!store.adhanSettings.prayerStatusNotificationEnabled) {
    await disablePrayerStatusNotification();
    return;
  }

  const profile = store.profile;
  if (!profile.latitude && !profile.longitude && (!profile.city || !profile.country)) {
    console.log('[PrayerStatusManager] No location available for prayer status.');
    return;
  }

  try {
    // Always recreate the channel before scheduling — idempotent, harmless.
    await ensurePrayerStatusChannel();

    const { times } = await fetchPrayerTimes(
      profile.latitude || 0,
      profile.longitude || 0,
      profile.country || undefined
    );

    const { current, next, nextTime } = getNextPrayer(times);
    const formattedNextTime = formatTime(nextTime);

    console.log(`[PrayerStatusNotification] Current prayer: ${current}`);
    console.log(`[PrayerStatusNotification] Next prayer: ${next}`);
    console.log(`[PrayerStatusNotification] Time: ${formattedNextTime}`);

    // ─────────────────────────────────────────────────────────────────────────
    // WHY presentNotificationAsync IS UNDEFINED:
    //   presentNotificationAsync was removed from expo-notifications before the
    //   current installed version (0.32.17). It does not exist in the package.
    //   The exported API only includes scheduleNotificationAsync, dismiss*, cancel*, etc.
    //
    // CORRECT APPROACH for expo-notifications@0.32.x:
    //   Use scheduleNotificationAsync with trigger type TIME_INTERVAL, seconds: 1.
    //   A 1-second future trigger is always valid (never past-dated) and fires
    //   effectively immediately. The notification handler will show it in the
    //   foreground via shouldShowAlert: true.
    //
    //   Using a stable `identifier` means re-scheduling replaces the existing
    //   entry — the notification updates in-place rather than stacking.
    //
    // WHY NOT DATE trigger with new Date():
    //   date: new Date() is already in the past by the time the AlarmManager
    //   evaluates it. Android silently drops it — scheduleNotificationAsync
    //   returns successfully (causing misleading "success" logs) but the OS
    //   never fires the alarm.
    // ─────────────────────────────────────────────────────────────────────────

    // Cancel any previously scheduled instance of this ID before re-scheduling.
    // Necessary because scheduling with the same ID doesn't update — it stacks.
    try {
      await Notifications.cancelScheduledNotificationAsync(PRAYER_STATUS_NOTIFICATION_ID);
    } catch (_) {
      // Safe to ignore — throws if the ID doesn't exist in the queue.
    }

    console.log('[PrayerStatusNotification] Scheduling with channelId:', PRAYER_STATUS_CHANNEL);

    await Notifications.scheduleNotificationAsync({
      identifier: PRAYER_STATUS_NOTIFICATION_ID,
      content: {
        title: '🕌 Muslim go',
        body: `Current Prayer: ${current}\nNext Prayer: ${next}\nTime: ${formattedNextTime}`,
        sticky: true,        // Android: non-dismissible by the user
        autoDismiss: false,  // Do not auto-remove after the user taps it
        sound: null,         // No sound
        vibrate: [],         // No vibration
        data: {
          // Distinct intent so the global foreground handler never
          // misidentifies this as an Adhan intent.
          intent: 'prayer_status',
        },
      },
      trigger: {
        // TIME_INTERVAL with seconds: 1 fires effectively immediately.
        // A future timestamp is always valid — avoids the past-date
        // silent-discard bug that occurs with DATE trigger + new Date().
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: PRAYER_STATUS_CHANNEL,
      },
    });

    console.log('[PrayerStatusNotification] Notification updated successfully.');
  } catch (error) {
    console.error('[PrayerStatusManager] Failed to update persistent notification:', error);
  }
}

import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { PrayerTimes, getCalendarForMonth, DailyPrayerData } from './prayerTimes';
import { handleAdhanTrigger } from './adhanManager';
import { Prayer } from '../theme';
import { navigationRef } from '../navigation/navigationRef';

/**
 * Configure standard foreground handling rule.
 * We intercept foreground triggers silently (shouldShowAlert: false)
 * because we manually force play the audio instantly via our listener instead.
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
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
 * Main Scheduling engine. Cleans history and schedules standard 
 * OS background triggers for today's required Adhan configurations.
 */
export const syncPrayerNotifications = async () => {
  if (Platform.OS === 'web') return;

  const store = useAppStore.getState();
  const settings = store.adhanSettings;
  const profile = store.profile;

  // Clear existing to avoid duplicate overlaps
  await Notifications.cancelAllScheduledNotificationsAsync();

  // If Master disabled, stop here.
  if (!settings.masterEnabled) {
    console.log('[NotificationManager] Master disabled. Cleared schedules.');
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

    // Check if we need next month's data to cover the next 6 days
    if (now.getDate() >= 25) {
      const nextMonthDate = new Date(now);
      nextMonthDate.setMonth(now.getMonth() + 1);
      nextMonthDate.setDate(1);
      try {
        const nextMonthData = await getCalendarForMonth(nextMonthDate, options);
        daysData = [...daysData, ...nextMonthData];
      } catch (e) {
        console.warn('[NotificationManager] Could not prefetch next month for notifications', e);
      }
    }
  } catch (e) {
    console.error('[NotificationManager] Failed to get calendar for notifications', e);
    return;
  }

  const prayers: Prayer[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  let scheduledCount = 0;
  const MAX_NOTIFICATIONS = 60; // Keep safely under iOS 64 limit

  // Loop through today and the next 5 days (6 days total)
  for (let offset = 0; offset < 6; offset++) {
    if (scheduledCount >= MAX_NOTIFICATIONS) break;

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + offset);
    
    // Format DD-MM-YYYY to find in daysData
    const dayStr = `${String(targetDate.getDate()).padStart(2, '0')}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${targetDate.getFullYear()}`;
    let dayData = daysData.find(d => d.dateStr === dayStr);
    
    // OFFLINE MONTH TRANSITION FIX: 
    // If user is offline at the end of the month, we can't fetch next month's calendar.
    // Instead of missing notifications, we fallback to the last known day's schedule (e.g. 30th's times for the 1st).
    // The time difference is usually < 2 minutes, which is vastly better than silent adhans.
    if (!dayData && daysData.length > 0) {
      dayData = daysData[daysData.length - 1];
    }
    
    if (!dayData) continue;

    for (const prayer of prayers) {
      if (scheduledCount >= MAX_NOTIFICATIONS) break;

      const prayerConfig = settings.prayers[prayer];
      
      // Skip unselected configurations
      if (!prayerConfig.enabled) continue;

      const timeStr = dayData.times[prayer as keyof typeof dayData.times] as string;
      if (!timeStr) continue;

      const [hour, minute] = timeStr.split(':').map(Number);
      const triggerDate = new Date(targetDate);
      triggerDate.setHours(hour, minute, 0, 0);

      // Skip if time has already passed
      if (triggerDate <= now) continue;

      if (settings.quietHoursEnabled) {
        const [quietFromH, quietFromM] = settings.quietFrom.split(':').map(Number);
        const [quietToH, quietToM] = settings.quietTo.split(':').map(Number);
        const triggerMins = hour * 60 + minute;
        const fromMins = quietFromH * 60 + quietFromM;
        const toMins = quietToH * 60 + quietToM;

        const isInQuietHours = fromMins > toMins
          ? (triggerMins >= fromMins || triggerMins < toMins)  // overnight quiet period
          : (triggerMins >= fromMins && triggerMins < toMins);

        if (isInQuietHours) {
          // Allow Fajr during quiet if setting is enabled
          if (!(prayer === 'Fajr' && settings.allowFajrDuringQuiet)) {
            console.log(`[NotificationManager] ${prayer} on ${dayStr} blocked by quiet hours.`);
            continue;
          }
        }
      }

      console.log(`[NotificationManager] Scheduling ${prayer} at ${triggerDate.toLocaleString()}`);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${prayer} Prayer Time`,
          body: `It's time for ${prayer} prayer`,
          sound: prayerConfig.alertType === 'beep' ? 'default' : undefined, 
          data: { 
              intent: 'play_adhan', 
              prayer, 
              voiceKey: prayerConfig.voice,
              alertType: prayerConfig.alertType 
          },
        },
        trigger: { date: triggerDate } as any,
      });
      scheduledCount++;

      // Schedule pre-alert if configured
      if (prayerConfig.preAlert > 0 && scheduledCount < MAX_NOTIFICATIONS) {
        const preAlertDate = new Date(triggerDate.getTime() - prayerConfig.preAlert * 60 * 1000);
        if (preAlertDate > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${prayer} in ${prayerConfig.preAlert} minutes`,
              body: `Prepare for ${prayer} prayer`,
              data: { intent: 'pre_alert', prayer },
            },
            trigger: { date: preAlertDate } as any,
          });
          scheduledCount++;
        }
      }
    }
  }
  console.log(`[NotificationManager] Successfully scheduled ${scheduledCount} local notifications for the next 6 days.`);
};

/**
 * Initializes listeners dynamically on App boot.
 */
export const initializeNotificationEngine = () => {
  if (Platform.OS === 'web') return () => {};

  // Fire permission request on boot
  requestNotificationPermissions().then((granted) => {
    if (!granted) {
      console.log('App launched without notification permissions.');
    } else {
      // Auto-refresh schedule silently on app boot to keep days synced natively 
      syncPrayerNotifications();
    }
  });
  // 1. FOREGROUND TRIGGER
  // Fires when user is ACTIVELY in the app and the minute occurs.
  const fgSubscription = Notifications.addNotificationReceivedListener(notification => {
    const { data } = notification.request.content;
    console.log('[NotificationManager] Foreground Active Hit!', data);
    
    if (data?.intent === 'play_adhan') {
      const prayer = String(data.prayer || '');
      handleAdhanTrigger(
        prayer,
        String(data.voiceKey  || 'makkah'),
        String(data.alertType || 'adhan'),
      );
      if (navigationRef.isReady()) {
        navigationRef.navigate('AdhanAlert', { prayer });
      }
    }
  });

  // 2. BACKGROUND / KILLED RESPONSE TRIGGER
  // Fires when user taps the Push Notification banner natively.
  const bgSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { data } = response.notification.request.content;
    console.log('[NotificationManager] OS Notification Map Hit!', data);
    
    if (data?.intent === 'play_adhan') {
      const prayer = String(data.prayer || '');
      handleAdhanTrigger(
        prayer,
        String(data.voiceKey  || 'makkah'),
        String(data.alertType || 'adhan'),
      );
      if (navigationRef.isReady()) {
        navigationRef.navigate('AdhanAlert', { prayer });
      }
    }
  });

  return () => {
    fgSubscription.remove();
    bgSubscription.remove();
  };
};

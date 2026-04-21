import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { PrayerTimes, fetchPrayerTimes, fetchPrayerTimesByCity } from './prayerTimes';
import { handleAdhanTrigger } from './adhanManager';
import { Prayer } from '../theme';
import { navigationRef } from '../navigation/RootNavigator';

/**
 * Configure standard foreground handling rule.
 * We intercept foreground triggers silently (shouldShowAlert: false)
 * because we manually force play the audio instantly via our listener instead.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
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
export const syncPrayerNotifications = async (customTimes?: PrayerTimes) => {
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

  // Determine optimal prayer times natively in the sync wrapper
  let resolvedTimes: PrayerTimes | null = customTimes || null;
  
  if (!resolvedTimes) {
    try {
      if (profile.autoLocation && profile.latitude && profile.longitude) {
        const payload = await fetchPrayerTimes(profile.latitude, profile.longitude);
        resolvedTimes = payload.times;
      } else if (profile.city) {
        const payload = await fetchPrayerTimesByCity(profile.city, profile.country);
        resolvedTimes = payload.times;
      }
    } catch (e) {
      console.warn('[NotificationManager] Failed silent dynamic prayer sync.', e);
      return;
    }
  }

  if (!resolvedTimes) return;

  const prayers: Prayer[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const now = new Date();

  for (const prayer of prayers) {
    const prayerConfig = settings.prayers[prayer];
    
    // Skip unselected configurations
    if (!prayerConfig.enabled) continue;

    // Parse '14:30' from API into Date object targeted for today
    const timeStr = resolvedTimes[prayer];
    if (!timeStr) continue;

    const [hour, minute] = timeStr.split(':').map(Number);
    const triggerDate = new Date();
    triggerDate.setHours(hour, minute, 0, 0);

    // If it's already passed today, schedule for tomorrow instead.
    if (triggerDate < now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    console.log(`[NotificationManager] Scheduling ${prayer} at ${triggerDate.toLocaleString()}`);
    
    // The payload data helps us uniquely identify what to play on Foreground response
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
      trigger: triggerDate,
    });

    // Schedule pre-alert if configured
    if (prayerConfig.preAlert > 0) {
      const preAlertDate = new Date(triggerDate.getTime() - prayerConfig.preAlert * 60 * 1000);
      if (preAlertDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${prayer} in ${prayerConfig.preAlert} minutes`,
            body: `Prepare for ${prayer} prayer`,
            data: { intent: 'pre_alert', prayer },
          },
          trigger: preAlertDate,
        });
      }
    }
  }
};

/**
 * Initializes listeners dynamically on App boot.
 */
export const initializeNotificationEngine = () => {
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

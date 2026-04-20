import AsyncStorage from '@react-native-async-storage/async-storage';

const ALADHAN_BASE = 'https://api.aladhan.com/v1';
const PRAYER_CACHE_KEY = 'deen_prayer_cache';

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  date: string;
}

export interface HijriDate {
  day: string;
  month: { en: string; ar: string; number: number };
  year: string;
  designation: { abbreviated: string; expanded: string };
}

export async function fetchPrayerTimes(
  latitude: number,
  longitude: number,
  method: number = 2,
): Promise<{ times: PrayerTimes; hijri: HijriDate; isOfflineFallback?: boolean }> {
  const date = new Date();
  const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  const cacheKey = `${PRAYER_CACHE_KEY}_${dateStr}`;

  try {
    const url = `${ALADHAN_BASE}/timings/${dateStr}?latitude=${latitude}&longitude=${longitude}&method=${method}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.code !== 200) throw new Error(json.status || 'Failed to fetch prayer times');

    const payload = {
      times: {
        ...json.data.timings,
        date: json.data.date.gregorian.date,
      },
      hijri: json.data.date.hijri,
    };

    // Save to local cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
    await AsyncStorage.setItem(`${PRAYER_CACHE_KEY}_latest`, JSON.stringify(payload));

    return payload;
  } catch (error) {
    console.warn(`[PrayerTimes] Network fetch failed. Attempting offline fallback.`, error);
    
    // Try today's cache
    const todayCache = await AsyncStorage.getItem(cacheKey);
    if (todayCache) {
      console.log(`[PrayerTimes] Found local cache for today.`);
      return { ...JSON.parse(todayCache), isOfflineFallback: true };
    }
    
    // Try latest available cache
    const latestCache = await AsyncStorage.getItem(`${PRAYER_CACHE_KEY}_latest`);
    if (latestCache) {
      console.log(`[PrayerTimes] Falling back to last known cached times.`);
      const parsed = JSON.parse(latestCache);
      return { ...parsed, isOfflineFallback: true };
    }

    console.warn(`[PrayerTimes] Complete offline failure. Using static fallback.`);
    return { times: FALLBACK_TIMES, hijri: FALLBACK_HIJRI, isOfflineFallback: true };
  }
}

export async function fetchPrayerTimesByCity(
  city: string,
  country: string,
  method: number = 2,
): Promise<{ times: PrayerTimes; hijri: HijriDate; isOfflineFallback?: boolean }> {
  const date = new Date();
  const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  const cacheKey = `${PRAYER_CACHE_KEY}_${dateStr}_city`;

  try {
    const url = `${ALADHAN_BASE}/timingsByCity/${dateStr}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.code !== 200) throw new Error(json.status || 'Failed to fetch prayer times');

    const payload = {
      times: {
        ...json.data.timings,
        date: json.data.date.gregorian.date,
      },
      hijri: json.data.date.hijri,
    };

    // Save to local cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
    await AsyncStorage.setItem(`${PRAYER_CACHE_KEY}_latest`, JSON.stringify(payload));

    return payload;
  } catch (error) {
    console.warn(`[PrayerTimes] Network fetch failed. Attempting offline fallback for city.`, error);
    
    const todayCache = await AsyncStorage.getItem(cacheKey);
    if (todayCache) return { ...JSON.parse(todayCache), isOfflineFallback: true };
    
    const latestCache = await AsyncStorage.getItem(`${PRAYER_CACHE_KEY}_latest`);
    if (latestCache) {
      const parsed = JSON.parse(latestCache);
      return { ...parsed, isOfflineFallback: true };
    }

    return { times: FALLBACK_TIMES, hijri: FALLBACK_HIJRI };
  }
}

// Format time from 24h to 12h AM/PM
export function formatTime(time24: string): string {
  if (!time24) return '';
  const [hoursStr, minutes] = time24.split(':');
  const hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
}

// Get time until next prayer in human-readable format
export function getTimeUntil(targetTime: string): string {
  const now = new Date();
  const [hours, mins] = targetTime.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, mins, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);

  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (h === 0) return `${m}m away`;
  if (m === 0) return `${h}h away`;
  return `${h}h ${m}m away`;
}

// Get current / next prayer
export function getNextPrayer(times: PrayerTimes): {
  current: string;
  next: string;
  nextTime: string;
  isNext: boolean;
} {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const prayers = [
    { name: 'Fajr', time: times.Fajr },
    { name: 'Dhuhr', time: times.Dhuhr },
    { name: 'Asr', time: times.Asr },
    { name: 'Maghrib', time: times.Maghrib },
    { name: 'Isha', time: times.Isha },
  ];

  for (let i = 0; i < prayers.length; i++) {
    const [h, m] = prayers[i].time.split(':').map(Number);
    const prayerMins = h * 60 + m;
    if (nowMins < prayerMins) {
      return {
        current: i > 0 ? prayers[i - 1].name : 'Isha',
        next: prayers[i].name,
        nextTime: prayers[i].time,
        isNext: true,
      };
    }
  }

  return { current: 'Isha', next: 'Fajr', nextTime: times.Fajr, isNext: true };
}

// Fallback prayer times for Dubai when offline
export const FALLBACK_TIMES: PrayerTimes = {
  Fajr: '04:52',
  Sunrise: '06:12',
  Dhuhr: '12:19',
  Asr: '15:43',
  Sunset: '18:25',
  Maghrib: '18:25',
  Isha: '19:55',
  Imsak: '04:42',
  Midnight: '00:19',
  date: new Date().toDateString(),
};

export const FALLBACK_HIJRI: HijriDate = {
  day: '14',
  month: { en: 'Shawwal', ar: 'شوال', number: 10 },
  year: '1446',
  designation: { abbreviated: "AH", expanded: "Anno Hegirae" },
};

// Get current prayer gradient name
export function getCurrentPrayerGradient(times: PrayerTimes): string {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const fajr = times.Fajr.split(':').map(Number);
  const dhuhr = times.Dhuhr.split(':').map(Number);
  const asr = times.Asr.split(':').map(Number);
  const maghrib = times.Maghrib.split(':').map(Number);
  const isha = times.Isha.split(':').map(Number);

  const toMins = (h: number, m: number) => h * 60 + m;
  const fajrMins = toMins(fajr[0], fajr[1]);
  const dhuhrMins = toMins(dhuhr[0], dhuhr[1]);
  const asrMins = toMins(asr[0], asr[1]);
  const maghribMins = toMins(maghrib[0], maghrib[1]);
  const ishaMins = toMins(isha[0], isha[1]);

  if (nowMins >= fajrMins && nowMins < dhuhrMins) return 'fajr';
  if (nowMins >= dhuhrMins && nowMins < asrMins) return 'dhuhr';
  if (nowMins >= asrMins && nowMins < maghribMins) return 'asr';
  if (nowMins >= maghribMins && nowMins < ishaMins) return 'maghrib';
  return 'isha';
}

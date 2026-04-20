import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Prayer } from '../theme';

export type PrayerStatus = 'pending' | 'done' | 'missed';
export type MoodKey = 'connected' | 'present' | 'distracted' | 'rushed' | 'emotional' | null;

export type TranslationLangCode = 'en' | 'ml' | 'hi';
export type PackStatus = 'not_installed' | 'downloading' | 'installed';

export interface AdhanPrayerSettings {
  enabled: boolean;
  voice: string;
  alertType: 'adhan' | 'beep' | 'silent_vibrate';
  preAlert: 0 | 5 | 10 | 15;
  fajrPhrase?: boolean; // Fajr only
}

export interface AdhanSettings {
  masterEnabled: boolean;
  prayers: Record<Prayer, AdhanPrayerSettings>;
  quietHoursEnabled: boolean;
  quietFrom: string; // '23:00'
  quietTo: string;   // '04:00'
  allowFajrDuringQuiet: boolean;
  jumuahEnabled: boolean;
  jumuahTime: string; // '12:00'
}

export interface SukoonEntry {
  id: string;
  text: string;
  mood: MoodKey;
  niyyah: string;
  date: string; // ISO string
  prompt: string;
}

export interface UserProfile {
  name: string;
  photoUri: string | null;
  city: string;
  country: string;
  autoLocation: boolean;
  latitude: number | null;
  longitude: number | null;
  onboardingComplete: boolean;
}

export interface AppState {
  // User
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;

  // Niyyah
  todayNiyyah: string;
  niyyahDate: string; // YYYY-MM-DD — used to auto-clear on new day
  setNiyyah: (niyyah: string) => void;
  resetNiyyahIfNewDay: () => void;

  lastPrayerResetDate: string;
  prayerStatuses: Record<Prayer, PrayerStatus>;
  setPrayerStatus: (prayer: Prayer, status: PrayerStatus) => void;
  resetDailyPrayers: () => void;

  // Prayer moods
  prayerMoods: Record<Prayer, MoodKey>;
  setPrayerMood: (prayer: Prayer, mood: MoodKey) => void;

  // Ayah of My Life
  ayahOfMyLife: { arabic: string; translation: string; reference: string } | null;
  setAyahOfMyLife: (ayah: { arabic: string; translation: string; reference: string } | null) => void;

  // Last Reading
  lastReading: { surahNumber: number; surahName: string; ayahNumber: number } | null;
  setLastReading: (reading: { surahNumber: number; surahName: string; ayahNumber: number }) => void;

  // Translations & TTS
  playTranslationAudio: boolean;
  setPlayTranslationAudio: (play: boolean) => void;
  translationLang: TranslationLangCode;
  setTranslationLang: (lang: TranslationLangCode) => void;
  languagePacks: Record<TranslationLangCode, PackStatus>;
  setLanguagePackStatus: (lang: TranslationLangCode, status: PackStatus) => void;

  // Adhan Settings
  adhanSettings: AdhanSettings;
  updateAdhanSettings: (settings: Partial<AdhanSettings>) => void;
  updatePrayerAdhanSettings: (prayer: Prayer, settings: Partial<AdhanPrayerSettings>) => void;
  isAdhanPlaying: boolean;
  setAdhanPlaying: (playing: boolean) => void;

  // Sukoon Journal
  sukoonEntries: SukoonEntry[];
  addSukoonEntry: (entry: Omit<SukoonEntry, 'id'>) => void;

  // Milestones
  milestones: {
    fajrCount: number;
    quranDays: number;
    tahajjudCount: number;
    streakDays: number;
    sukoonCount: number;
    ayahSet: boolean;
    adhanStreakDays: number;
  };
  incrementMilestone: (key: keyof AppState['milestones']) => void;
}

const defaultAdhanPrayerSettings: AdhanPrayerSettings = {
  enabled: true,
  voice: 'makkah',
  alertType: 'adhan',
  preAlert: 10,
};

const defaultAdhanSettings: AdhanSettings = {
  masterEnabled: true,
  prayers: {
    Fajr: { ...defaultAdhanPrayerSettings, fajrPhrase: true },
    Dhuhr: { ...defaultAdhanPrayerSettings },
    Asr: { ...defaultAdhanPrayerSettings },
    Maghrib: { ...defaultAdhanPrayerSettings },
    Isha: { ...defaultAdhanPrayerSettings },
  },
  quietHoursEnabled: false,
  quietFrom: '23:00',
  quietTo: '04:00',
  allowFajrDuringQuiet: true,
  jumuahEnabled: true,
  jumuahTime: '12:00',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  profile: {
    name: 'Friend',
    photoUri: null,
    city: 'Dubai',
    country: 'United Arab Emirates',
    autoLocation: true,
    latitude: null,
    longitude: null,
    onboardingComplete: false,
  },
  setProfile: (profile) =>
    set((state) => ({ profile: { ...state.profile, ...profile } })),

  todayNiyyah: '',
  niyyahDate: '',
  setNiyyah: (niyyah) => set({
    todayNiyyah: niyyah,
    niyyahDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  }),
  resetNiyyahIfNewDay: () => {
    const today = new Date().toISOString().split('T')[0];
    const { niyyahDate } = useAppStore.getState();
    if (niyyahDate !== today) {
      set({ todayNiyyah: '', niyyahDate: '' });
    }
  },

  prayerStatuses: {
    Fajr: 'pending',
    Dhuhr: 'pending',
    Asr: 'pending',
    Maghrib: 'pending',
    Isha: 'pending',
  },
  setPrayerStatus: (prayer, status) =>
    set((state) => ({
      prayerStatuses: { ...state.prayerStatuses, [prayer]: status },
    })),

  resetDailyPrayers: () =>
    set({
      prayerStatuses: {
        Fajr: 'pending',
        Dhuhr: 'pending',
        Asr: 'pending',
        Maghrib: 'pending',
        Isha: 'pending',
      },
      prayerMoods: {
        Fajr: null,
        Dhuhr: null,
        Asr: null,
        Maghrib: null,
        Isha: null,
      },
    }),

  lastPrayerResetDate: new Date().toDateString(),

  prayerMoods: {
    Fajr: null,
    Dhuhr: null,
    Asr: null,
    Maghrib: null,
    Isha: null,
  },
  setPrayerMood: (prayer, mood) =>
    set((state) => ({
      prayerMoods: { ...state.prayerMoods, [prayer]: mood },
    })),

  ayahOfMyLife: null,
  setAyahOfMyLife: (ayah) => set({ ayahOfMyLife: ayah }),

  lastReading: null,
  setLastReading: (reading) => set({ lastReading: reading }),

  playTranslationAudio: false,
  setPlayTranslationAudio: (play) => set({ playTranslationAudio: play }),
  translationLang: 'en',
  setTranslationLang: (lang) => set({ translationLang: lang }),
  languagePacks: {
    en: 'installed', // Default preloads online fallback so always effectively installed
    ml: 'not_installed',
    hi: 'not_installed',
  },
  setLanguagePackStatus: (lang, status) =>
    set((state) => ({
      languagePacks: { ...state.languagePacks, [lang]: status },
    })),

  adhanSettings: defaultAdhanSettings,
  updateAdhanSettings: (settings) =>
    set((state) => ({
      adhanSettings: { ...state.adhanSettings, ...settings },
    })),
  updatePrayerAdhanSettings: (prayer, settings) =>
    set((state) => ({
      adhanSettings: {
        ...state.adhanSettings,
        prayers: {
          ...state.adhanSettings.prayers,
          [prayer]: { ...state.adhanSettings.prayers[prayer], ...settings },
        },
      },
    })),

  isAdhanPlaying: false,
  setAdhanPlaying: (playing) => set({ isAdhanPlaying: playing }),

  sukoonEntries: [],
  addSukoonEntry: (entry) =>
    set((state) => ({
      sukoonEntries: [
        { ...entry, id: Date.now().toString() },
        ...state.sukoonEntries,
      ],
    })),

  milestones: {
    fajrCount: 0,
    quranDays: 0,
    tahajjudCount: 0,
    streakDays: 0,
    sukoonCount: 0,
    ayahSet: false,
    adhanStreakDays: 0,
  },
  incrementMilestone: (key) =>
    set((state) => ({
      milestones: {
        ...state.milestones,
        [key]: typeof state.milestones[key] === 'boolean'
          ? true
          : (state.milestones[key] as number) + 1,
      },
    })),
    }),
    {
      name: 'dheen-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        return persistedState;
      },
    }
  )
);

// ═══════════════════════════════════════════════════════
// DHEEN APP — COMPLETE DESIGN SYSTEM
// ═══════════════════════════════════════════════════════

export const Colors = {
  // Core Palette
  primary: '#0F6D5B',
  primaryDark: '#0A3D2B',
  background: '#F8F6F1',
  accent: '#D4AF37',
  accentLight: '#F0D882',

  // Text
  textDark: '#1A1A1A',
  textLight: '#6B6B6B',
  textMuted: '#9B9B9B',
  textWhite: '#FFFFFF',

  // Special Screens
  sukoonBg: '#F5F0E8',
  niyyahBg: '#0D1F17',
  adhanBg: '#0A1F14',
  quranBg: '#F8F6F1',

  // Status
  prayerDone: '#0F6D5B',
  prayerMissed: '#E57373',
  prayerPending: '#D0D0D0',

  // Mood Colors
  moodConnected: '#0F6D5B',
  moodPresent: '#4CAF7D',
  moodDistracted: '#9E9E9E',
  moodRushed: '#FFB74D',
  moodEmotional: '#F48FB1',

  // Stitch design token colors
  secondary: '#735C00',

  // Glassmorphism
  glassBg: 'rgba(255,255,255,0.25)',
  glassBorder: 'rgba(255,255,255,0.4)',
  glassDark: 'rgba(15,109,91,0.15)',

  // Overlay
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',
};

// Time-based background gradients
export const PrayerGradients = {
  fajr: ['#0A0E2A', '#1A2744', '#2C4A6E', '#8B6914'],
  dhuhr: ['#F8F4E8', '#FDF6DC', '#F5E6B0', '#E8C84A'],
  asr: ['#FBF0E0', '#F5DDB8', '#E8C07A', '#D4943A'],
  maghrib: ['#F5DDD0', '#E8A882', '#D4614A', '#8B2A1A'],
  isha: ['#0D1F1A', '#1A3028', '#0F4A38', '#0A2820'],
  default: ['#0A3D2B', '#0F6D5B', '#1A8A6A', '#F8F6F1'],
};

export const Typography = {
  // Sizes
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 22,
    '4xl': 24,
    '5xl': 26,
    '6xl': 28,
    '7xl': 32,
  },
  // Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
    arabic: 2.0,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// Alias so screens that import { NativeSpacing } still work
export const NativeSpacing = Spacing;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F6D5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  green: {
    shadowColor: '#0F6D5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  gold: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
};

export const PrayerIcons = {
  fajr: 'nightlight-round',
  dhuhr: 'wb-sunny',
  asr: 'wb-cloudy',
  maghrib: 'wb-twilight',
  isha: 'nights-stay',
};

export const Prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type Prayer = typeof Prayers[number];

export const MoodOptions = [
  { key: 'connected', label: 'Deeply Connected', color: '#0F6D5B', icon: 'favorite' },
  { key: 'present', label: 'Present & Focused', color: '#4CAF7D', icon: 'spa' },
  { key: 'distracted', label: 'Distracted', color: '#9E9E9E', icon: 'cloud' },
  { key: 'rushed', label: 'Rushed', color: '#FFB74D', icon: 'bolt' },
  { key: 'emotional', label: 'Emotional', color: '#F48FB1', icon: 'water-drop' },
] as const;

export const DhikrOptions = [
  { arabic: 'سُبْحَانَ اللَّه', transliteration: 'SubhanAllah', translation: 'Glory be to Allah' },
  { arabic: 'الْحَمْدُ لِلَّه', transliteration: 'Alhamdulillah', translation: 'Praise be to Allah' },
  { arabic: 'اللَّهُ أَكْبَر', transliteration: 'Allahu Akbar', translation: 'Allah is the Greatest' },
  { arabic: 'لَا إِلَٰهَ إِلَّا اللَّه', transliteration: 'La ilaha illa Allah', translation: 'There is no god but Allah' },
  { arabic: 'أَسْتَغْفِرُ اللَّه', transliteration: 'Astaghfirullah', translation: 'I seek Allah\'s forgiveness' },
] as const;

export const NiyyahPresets = [
  { label: 'For knowledge', icon: 'menu-book' },
  { label: 'For healing', icon: 'volunteer-activism' },
  { label: 'For my family', icon: 'family-restroom' },
  { label: 'For Allah alone', icon: 'favorite' },
  { label: 'For gratitude', icon: 'emoji-objects' },
  { label: 'For forgiveness', icon: 'auto-awesome' },
];

export const SukoonPrompts = [
  'What has Allah placed in your heart today that brings quiet joy?',
  'What is weighing on your heart right now?',
  'What do you want to ask Allah today?',
  'What are you grateful for in this moment?',
  'Write a dua for someone you love.',
  'What part of your day felt closest to Allah?',
  'If you could whisper one thing to Allah right now, what would it be?',
];

export const AdhanVoices = [
  { id: 'makkah', label: 'Makkah', artist: 'Sheikh Ali Ahmed Mulla' },
  { id: 'madinah', label: 'Madinah', artist: 'Sheikh Ali Bukhari' },
  { id: 'egypt', label: 'Egypt', artist: 'Sheikh Abd Al Basit' },
  { id: 'turkey', label: 'Turkey', artist: 'Classic Ottoman Style' },
  { id: 'nasheed', label: 'Soft Nasheed', artist: 'Calm, no full adhan' },
  { id: 'silent', label: 'Silent', artist: 'Notification only' },
];

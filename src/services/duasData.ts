// Duas data — local JSON (no API required, all offline)

export interface Dua {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
  category: string;
}

export const DuaCategories = [
  { id: 'morning', label: 'Morning', icon: 'wb-twilight' },
  { id: 'evening', label: 'Evening', icon: 'nightlight-round' },
  { id: 'after_salah', label: 'After Salah', icon: 'mosque' },
  { id: 'travel', label: 'Travel', icon: 'flight' },
  { id: 'protection', label: 'Protection', icon: 'shield' },
  { id: 'gratitude', label: 'Gratitude', icon: 'volunteer-activism' },
  { id: 'hardship', label: 'Hardship', icon: 'fitness-center' },
  { id: 'parents', label: 'Parents', icon: 'family-restroom' },
];

export const DUAS: Dua[] = [
  {
    id: '1',
    title: 'Morning Supplication',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    transliteration: 'Asbahna wa asbahal mulku lillah, walhamdu lillah',
    translation: 'We have reached the morning and at this very time all sovereignty belongs to Allah, and all praise is for Allah.',
    reference: 'Abu Dawud 4:317',
    category: 'morning',
  },
  {
    id: '2',
    title: 'Evening Supplication',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    transliteration: 'Amsayna wa amsal mulku lillah, walhamdu lillah',
    translation: 'We have reached the evening and at this very time all sovereignty belongs to Allah, and all praise is for Allah.',
    reference: 'Abu Dawud 4:317',
    category: 'evening',
  },
  {
    id: '3',
    title: 'After Salah — Seeking Forgiveness',
    arabic: 'اللَّهُمَّ أَنْتَ السَّلامُ وَمِنْكَ السَّلامُ، تَبَارَكْتَ ذَا الْجَلالِ وَالإكْرامِ',
    transliteration: 'Allahumma antas-salam wa minkas-salam, tabarakta dhaljalaali wal-ikram',
    translation: 'O Allah, You are Peace and from You comes peace. Blessed are You, O Owner of majesty and honor.',
    reference: 'Muslim 591',
    category: 'after_salah',
  },
  {
    id: '4',
    title: 'Dua for Anxiety & Hardship',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ',
    transliteration: 'Allahumma inni a\'udhu bika minal-hammi wal-hazani',
    translation: 'O Allah, I seek refuge in You from worry and grief.',
    reference: 'Bukhari 6369',
    category: 'hardship',
  },
  {
    id: '5',
    title: 'Dua for Parents',
    arabic: 'رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbi irhamhuma kama rabbayani sagheera',
    translation: 'My Lord, have mercy upon them as they brought me up when I was small.',
    reference: 'Quran 17:24',
    category: 'parents',
  },
  {
    id: '6',
    title: 'Travel Dua',
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ',
    transliteration: 'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin',
    translation: 'Glory be to Him who has subjected this to us, and we could not have [otherwise] subdued it.',
    reference: 'Quran 43:13',
    category: 'travel',
  },
  {
    id: '7',
    title: 'Protection — Ayat Al-Kursi',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    transliteration: 'Allahu la ilaha illa huwal-hayyul-qayyum',
    translation: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence.',
    reference: 'Quran 2:255',
    category: 'protection',
  },
  {
    id: '8',
    title: 'Gratitude & Contentment',
    arabic: 'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
    transliteration: 'Allahumma ma asbaha bi min ni\'matin faminka wahdaka la shareeka lak, falakal-hamdu wa lakashshukr',
    translation: 'O Allah, whatever blessing I or any of Your creation have risen upon, it is from You alone, You have no partner. All praise and thanks are Yours.',
    reference: 'Abu Dawud 4:318',
    category: 'gratitude',
  },
  {
    id: '9',
    title: 'Before Sleep',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amootu wa ahya',
    translation: 'In Your name O Allah, I die and I live.',
    reference: 'Bukhari 6312',
    category: 'evening',
  },
  {
    id: '10',
    title: 'Dua of Moses (Seeking Help)',
    arabic: 'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
    transliteration: "Rabbi inni lima anzalta ilayya min khayrin faqeer",
    translation: "My Lord, I am in absolute need of the good You send me.",
    reference: 'Quran 28:24',
    category: 'hardship',
  },
];

export function getDuasByCategory(category: string): Dua[] {
  if (category === 'all') return DUAS;
  return DUAS.filter((d) => d.category === category);
}

export function searchDuas(query: string): Dua[] {
  const q = query.toLowerCase();
  return DUAS.filter(
    (d) =>
      d.title.toLowerCase().includes(q) ||
      d.translation.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q),
  );
}

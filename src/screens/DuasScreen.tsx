import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Colors, Typography, NativeSpacing as Spacing, BorderRadius, Shadows } from '../theme';
import { DarkColors, LightColors } from '../theme/darkMode';
import { useAppStore } from '../store/useAppStore';
import { ScreenWrapper, useScreenBottomInset } from '../components/ScreenWrapper';

// ─── Storage key ─────────────────────────────────────────────────────────────
const PERSONAL_DUAS_KEY = 'dheen_personal_duas';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PersonalDua {
  id: string;
  title: string;
  text: string;
  createdAt: number; // epoch ms
}

// ─── Curated data ─────────────────────────────────────────────────────────────
const CATEGORIES = ['Morning', 'Evening', 'After Salah', 'Travel'];
const DUAS = [
  // ─── MORNING ─────────────────────────────────────────────────────────────
  {
    id: 'm01',
    category: 'Morning',
    title: 'Morning Awakening',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: 'Alhamdu lillahil-ladhi ahyana ba\'da ma amatana wa ilayhin-nushur',
    translation: 'All praise is for Allah who gave us life after having taken it from us and unto Him is the resurrection.',
    variant: 'default',
  },
  {
    id: 'm02',
    category: 'Morning',
    title: 'Morning Sovereignty',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Asbahna wa asbahal mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah',
    translation: 'We have reached the morning and at this very time unto Allah belongs all sovereignty, and all praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.',
    variant: 'soft',
  },
  {
    id: 'm03',
    category: 'Morning',
    title: 'Protection at Dawn',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: 'Bismillahil-ladhi la yadurru ma\'a ismihi shay\'un fil-ardi wa la fis-sama\'i wa huwas-sami\'ul-\'alim',
    translation: 'In the Name of Allah with Whose Name there is protection against every kind of harm in the earth or in the heaven, and He is the All-Hearing, the All-Knowing.',
    variant: 'outlined',
  },
  {
    id: 'm04',
    category: 'Morning',
    title: 'Morning Gratitude',
    arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
    transliteration: 'Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaykan-nushur',
    translation: 'O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.',
    variant: 'default',
  },
  {
    id: 'm05',
    category: 'Morning',
    title: 'Seeking Good Morning',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    transliteration: 'Allahumma anta rabbi la ilaha illa anta khalaqtani wa ana \'abduka wa ana \'ala \'ahdika wa wa\'dika mastata\'tu',
    translation: 'O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can.',
    variant: 'soft',
  },
  {
    id: 'm06',
    category: 'Morning',
    title: 'Sayyid al-Istighfar',
    arabic: 'أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration: 'A\'udhu bika min sharri ma sana\'tu, abu\'u laka bini\'matika \'alayya, wa abu\'u bidhanbi faghfir li fa innahu la yaghfirudh-dhunuba illa ant',
    translation: 'I seek refuge with You from the evil of what I have done. I acknowledge Your favor upon me, and I acknowledge my sin, so forgive me, for verily none forgives sins except You.',
    variant: 'outlined',
  },
  {
    id: 'm07',
    category: 'Morning',
    title: 'Morning Dhikr — SubhanAllah',
    arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    transliteration: 'SubhanAllahi wa bihamdih',
    translation: 'Glory be to Allah and all praise is due to Him. (Recite 100 times in the morning)',
    variant: 'soft',
  },
  {
    id: 'm08',
    category: 'Morning',
    title: 'Protection from Evil',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: 'A\'udhu bikalimatillahit-tammati min sharri ma khalaq',
    translation: 'I seek refuge in the perfect words of Allah from the evil of that which He created. (Recite 3 times in the evening)',
    variant: 'default',
  },
  {
    id: 'm09',
    category: 'Morning',
    title: 'Morning Tawakkul',
    arabic: 'حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration: 'Hasbiyallahu la ilaha illa huwa \'alayhi tawakkaltu wa huwa rabbul \'arshil \'azim',
    translation: 'Allah is sufficient for me. None has the right to be worshipped but Him. Upon Him I rely and He is the Lord of the Magnificent Throne. (Recite 7 times)',
    variant: 'soft',
  },
  {
    id: 'm10',
    category: 'Morning',
    title: 'Ayat al-Kursi',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
    transliteration: 'Allahu la ilaha illa huwal-hayyul qayyum. La ta\'khudhuhu sinatun wa la nawm',
    translation: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep.',
    variant: 'outlined',
  },
  {
    id: 'm11',
    category: 'Morning',
    title: 'Morning Salawat',
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    transliteration: 'Allahumma salli wa sallim wa barik \'ala nabiyyina Muhammad',
    translation: 'O Allah, send prayers, peace and blessings upon our Prophet Muhammad.',
    variant: 'default',
  },
  {
    id: 'm12',
    category: 'Morning',
    title: 'Seeking Wellbeing',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ',
    transliteration: 'Allahumma inni as\'alukal-\'afiyata fid-dunya wal-akhirah',
    translation: 'O Allah, I ask You for well-being in this world and in the Hereafter.',
    variant: 'soft',
  },
  {
    id: 'm13',
    category: 'Morning',
    title: 'Remembrance at Dawn',
    arabic: 'أَصْبَحْتُ أُشْهِدُ اللهَ وَأُشْهِدُ حَمَلَةَ عَرْشِهِ وَمَلَائِكَتَهُ وَجَمِيعَ خَلْقِهِ أَنَّكَ أَنْتَ اللهُ لَا إِلَهَ إِلَّا أَنْتَ',
    transliteration: 'Asbahtu ushhidullaha wa ushhidu hamalata \'arshihi wa mala\'ikatahu wa jami\'a khalqihi annaka antallahu la ilaha illa ant',
    translation: 'I have reached the morning calling on Allah to witness, and His Throne\'s bearers, His angels and all of His creation that verily You are Allah, none has the right to be worshipped except You.',
    variant: 'outlined',
  },
  {
    id: 'm14',
    category: 'Morning',
    title: 'Gratitude for Islam',
    arabic: 'رَضِيتُ بِاللهِ رَبًّا وَبِالإِسْلَامِ دِينًا وَبِمُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
    transliteration: 'Raditu billahi rabban wa bil-islami dinan wa bi-Muhammadin sallallahu \'alayhi wa sallam nabiyya',
    translation: 'I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad (peace be upon him) as my Prophet.',
    variant: 'default',
  },
  {
    id: 'm15',
    category: 'Morning',
    title: 'Morning Protection Surah',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    transliteration: 'Qul huwallahu ahad. Allahus-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad',
    translation: 'Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, Nor is there to Him any equivalent. (Surah Al-Ikhlas — recite 3 times)',
    variant: 'soft',
  },
  {
    id: 'm16',
    category: 'Morning',
    title: 'Seeking Refuge — Al-Falaq',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ مِن شَرِّ مَا خَلَقَ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
    transliteration: 'Qul a\'udhu bi rabbil-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab',
    translation: 'Say: I seek refuge in the Lord of daybreak from the evil of that which He created, and from the evil of darkness when it settles. (Surah Al-Falaq — recite 3 times)',
    variant: 'outlined',
  },
  {
    id: 'm17',
    category: 'Morning',
    title: 'Seeking Refuge — An-Nas',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ مَلِكِ النَّاسِ إِلَٰهِ النَّاسِ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ',
    transliteration: 'Qul a\'udhu bi rabbin-nas. Malikin-nas. Ilahin-nas. Min sharril waswasil khannas',
    translation: 'Say: I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the whispering retreater. (Surah An-Nas — recite 3 times)',
    variant: 'default',
  },
  {
    id: 'm18',
    category: 'Morning',
    title: 'Dua for Good Character',
    arabic: 'اللَّهُمَّ أَحْسَنْتَ خَلْقِي فَأَحْسِنْ خُلُقِي',
    transliteration: 'Allahumma ahsanta khalqi fa ahsin khuluqi',
    translation: 'O Allah, just as You have made my external features beautiful, make my character beautiful as well.',
    variant: 'soft',
  },
  {
    id: 'm19',
    category: 'Morning',
    title: 'Dua for Knowledge',
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: 'Rabbi zidni \'ilma',
    translation: 'My Lord, increase me in knowledge.',
    variant: 'outlined',
  },
  {
    id: 'm20',
    category: 'Morning',
    title: 'Morning Tasbih',
    arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ',
    transliteration: 'SubhanAllahi wa bihamdihi \'adada khalqihi wa rida nafsihi wa zinata \'arshihi wa midada kalimatihi',
    translation: 'Glory and praise be to Allah, as many times as the number of His creatures, in accordance with His Good Pleasure, equal to the weight of His Throne and equal to the ink that may be used in recording the words for His Praise.',
    variant: 'default',
  },
  {
    id: 'm21',
    category: 'Morning',
    title: 'Dua for Provision',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا',
    transliteration: 'Allahumma inni as\'aluka \'ilman nafi\'an wa rizqan tayyiban wa \'amalan mutaqabbala',
    translation: 'O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.',
    variant: 'soft',
  },
  {
    id: 'm22',
    category: 'Morning',
    title: 'Seeking Steadfastness',
    arabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
    transliteration: 'Ya muqallibal qulubi thabbit qalbi \'ala dinik',
    translation: 'O Turner of hearts, keep my heart firm upon Your religion.',
    variant: 'outlined',
  },
  {
    id: 'm23',
    category: 'Morning',
    title: 'Dua for Parents',
    arabic: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbighfir li wa liwalidayya warhamhuma kama rabbayani saghira',
    translation: 'My Lord, forgive me and my parents and have mercy upon them as they raised me when I was small.',
    variant: 'default',
  },
  {
    id: 'm24',
    category: 'Morning',
    title: 'Dua for Righteous Deeds',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى',
    transliteration: 'Allahumma inni as\'alukal-huda wat-tuqa wal-\'afafa wal-ghina',
    translation: 'O Allah, I ask You for guidance, piety, chastity and self-sufficiency.',
    variant: 'soft',
  },
  {
    id: 'm25',
    category: 'Morning',
    title: 'Dua for Good Day',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ',
    transliteration: 'Allahumma inni a\'udhu bika minal-hammi wal-hazan, wa a\'udhu bika minal-\'ajzi wal-kasal',
    translation: 'O Allah, I seek refuge in You from anxiety and sorrow, and I seek refuge in You from incapacity and laziness.',
    variant: 'outlined',
  },

  // ─── EVENING ─────────────────────────────────────────────────────────────
  {
    id: 'e01',
    category: 'Evening',
    title: 'Evening Remembrance',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Amsayna wa amsal mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah',
    translation: 'We have reached the evening and at this very time unto Allah belongs all sovereignty, and all praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.',
    variant: 'default',
  },
  {
    id: 'e02',
    category: 'Evening',
    title: 'Evening Gratitude',
    arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
    transliteration: 'Allahumma bika amsayna wa bika asbahna wa bika nahya wa bika namutu wa ilaykal-masir',
    translation: 'O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is our return.',
    variant: 'soft',
  },
  {
    id: 'e03',
    category: 'Evening',
    title: 'Evening Protection',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: 'A\'udhu bikalimatillahit-tammati min sharri ma khalaq',
    translation: 'I seek refuge in the perfect words of Allah from the evil of that which He created. (Recite 3 times in the evening)',
    variant: 'outlined',
  },
  {
    id: 'e04',
    category: 'Evening',
    title: 'Evening Sayyid al-Istighfar',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ',
    transliteration: 'Allahumma anta rabbi la ilaha illa anta khalaqtani wa ana \'abduka wa ana \'ala \'ahdika wa wa\'dika mastata\'tu a\'udhu bika min sharri ma sana\'tu',
    translation: 'O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant. I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done.',
    variant: 'default',
  },
  {
    id: 'e05',
    category: 'Evening',
    title: 'Evening Tasbih',
    arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    transliteration: 'SubhanAllahi wa bihamdih',
    translation: 'Glory be to Allah and all praise is due to Him. (Recite 100 times in the evening)',
    variant: 'soft',
  },
  {
    id: 'e06',
    category: 'Evening',
    title: 'Seeking Forgiveness',
    arabic: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullahil \'azeemal-ladhi la ilaha illa huwal-hayyul-qayyumu wa atubu ilayh',
    translation: 'I seek forgiveness from Allah the Magnificent, whom there is none worthy of worship except Him, the Ever-Living, the Sustainer, and I repent to Him.',
    variant: 'outlined',
  },
  {
    id: 'e07',
    category: 'Evening',
    title: 'Evening Peace',
    arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي اللَّهُمَّ عَافِنِي فِي سَمْعِي اللَّهُمَّ عَافِنِي فِي بَصَرِي',
    transliteration: 'Allahumma \'afini fi badani. Allahumma \'afini fi sam\'i. Allahumma \'afini fi basari',
    translation: 'O Allah, grant me health in my body. O Allah, grant me health in my hearing. O Allah, grant me health in my sight.',
    variant: 'default',
  },
  {
    id: 'e08',
    category: 'Evening',
    title: 'Evening Tawakkul',
    arabic: 'حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration: 'Hasbiyallahu la ilaha illa huwa \'alayhi tawakkaltu wa huwa rabbul \'arshil \'azim',
    translation: 'Allah is sufficient for me. None has the right to be worshipped but Him. Upon Him I rely and He is the Lord of the Magnificent Throne. (Recite 7 times)',
    variant: 'soft',
  },
  {
    id: 'e09',
    category: 'Evening',
    title: 'Dua before Sleep',
    arabic: 'اللَّهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا',
    transliteration: 'Allahumma bismika amutu wa ahya',
    translation: 'O Allah, in Your name I die and I live.',
    variant: 'outlined',
  },
  {
    id: 'e10',
    category: 'Evening',
    title: 'Sleep Tasbih',
    arabic: 'سُبْحَانَ اللهِ (٣٣) وَالْحَمْدُ لِلَّهِ (٣٣) وَاللهُ أَكْبَرُ (٣٤)',
    transliteration: 'SubhanAllah (33), Alhamdulillah (33), Allahu Akbar (34)',
    translation: 'Glory be to Allah (33 times), Praise be to Allah (33 times), Allah is the Greatest (34 times) — before sleep.',
    variant: 'default',
  },
  {
    id: 'e11',
    category: 'Evening',
    title: 'Sleep Supplications',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَضَعُ جَنْبِي وَبِكَ أَرْفَعُهُ إِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا',
    transliteration: 'Bismika Allahumma ada\'u janbi wa bika arfa\'uhu in amsakta nafsi farhamha wa in arsaltaha fahfazha',
    translation: 'In Your name O Allah, I lay down my side, and in Your name I raise it. If You take my soul, then have mercy on it, and if You return it, then protect it.',
    variant: 'soft',
  },
  {
    id: 'e12',
    category: 'Evening',
    title: 'Dua for Forgiveness Evening',
    arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
    transliteration: 'Allahumma innaka \'afuwwun tuhibbul \'afwa fa\'fu \'anni',
    translation: 'O Allah, You are the Pardoner, You love to pardon, so pardon me.',
    variant: 'outlined',
  },
  {
    id: 'e13',
    category: 'Evening',
    title: 'Evening Istighfar',
    arabic: 'أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullaha wa atubu ilayh',
    translation: 'I seek forgiveness from Allah and I repent to Him. (Recite 100 times a day)',
    variant: 'default',
  },
  {
    id: 'e14',
    category: 'Evening',
    title: 'Evening Tawbah',
    arabic: 'رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
    transliteration: 'Rabbana zalamna anfusana wa in lam taghfir lana wa tarhamna lanakunanna minal-khasirin',
    translation: 'Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will surely be among the losers.',
    variant: 'soft',
  },
  {
    id: 'e15',
    category: 'Evening',
    title: 'Dua for Good End',
    arabic: 'اللَّهُمَّ أَحْسِنْ عَاقِبَتَنَا فِي الأُمُورِ كُلِّهَا وَأَجِرْنَا مِنْ خِزْيِ الدُّنْيَا وَعَذَابِ الآخِرَةِ',
    transliteration: 'Allahumma ahsin \'aqibatana fil-umuri kulliha wa ajirna min khizyid-dunya wa \'adhabul-akhirah',
    translation: 'O Allah, make our outcome in all matters good, and save us from the humiliation of this world and the punishment of the Hereafter.',
    variant: 'outlined',
  },
  {
    id: 'e16',
    category: 'Evening',
    title: 'Dua for Ease of Hardship',
    arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
    transliteration: 'Allahumma la sahla illa ma ja\'altahu sahlan wa anta taj\'alul hazna idha shi\'ta sahla',
    translation: 'O Allah, there is no ease except what You make easy, and You make the difficult easy if You wish.',
    variant: 'default',
  },
  {
    id: 'e17',
    category: 'Evening',
    title: 'Complete Trust',
    arabic: 'تَوَكَّلْتُ عَلَى الْحَيِّ الَّذِي لَا يَمُوتُ',
    transliteration: 'Tawakkaltu \'alal-hayyil-ladhi la yamut',
    translation: 'I place my trust in the Ever-Living who does not die.',
    variant: 'soft',
  },
  {
    id: 'e18',
    category: 'Evening',
    title: 'Dua for Family Safety',
    arabic: 'اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي',
    transliteration: 'Allahumma-hfazni min bayni yadayya wa min khalfi wa \'an yamini wa \'an shimali wa min fawqi',
    translation: 'O Allah, protect me from my front and from behind me, and from my right and from my left, and from above me.',
    variant: 'outlined',
  },
  {
    id: 'e19',
    category: 'Evening',
    title: 'Dua for Contentment',
    arabic: 'اللَّهُمَّ قَنِّعْنِي بِمَا رَزَقْتَنِي وَبَارِكْ لِي فِيهِ',
    transliteration: 'Allahumma qanni\'ni bima razaqtani wa barik li fihi',
    translation: 'O Allah, make me content with what You have provided me and bless me in it.',
    variant: 'default',
  },
  {
    id: 'e20',
    category: 'Evening',
    title: 'Evening Salawat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ',
    transliteration: 'Allahumma salli \'ala Muhammadin wa \'ala ali Muhammadin kama sallayta \'ala Ibrahim',
    translation: 'O Allah, send prayers upon Muhammad and upon the family of Muhammad, as You sent prayers upon Ibrahim.',
    variant: 'soft',
  },
  {
    id: 'e21',
    category: 'Evening',
    title: 'Dua against Anxiety',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْقَسْوَةِ وَالْغَفْلَةِ وَالْعَيْلَةِ وَالذِّلَّةِ',
    transliteration: 'Allahumma inni a\'udhu bika minal-qaswati wal-ghaflati wal-\'aylati wadh-dhillah',
    translation: 'O Allah, I seek refuge in You from hardheartedness, heedlessness, poverty, and humiliation.',
    variant: 'outlined',
  },
  {
    id: 'e22',
    category: 'Evening',
    title: 'Dua for Night Worship',
    arabic: 'اللَّهُمَّ رَبَّ جِبْرِيلَ وَمِيكَائِيلَ وَإِسْرَافِيلَ فَاطِرَ السَّمَوَاتِ وَالْأَرْضِ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ',
    transliteration: 'Allahumma rabba jibrila wa mika\'ila wa israfila fatiras-samawati wal-ardi \'alimal-ghaybi wash-shahadah',
    translation: 'O Allah, Lord of Jibreel, Mikaa\'eel and Israfeel, Creator of the heavens and the earth, Knower of the seen and unseen.',
    variant: 'default',
  },
  {
    id: 'e23',
    category: 'Evening',
    title: 'Dua for Safety',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ',
    transliteration: 'Allahumma inni as\'alukal-\'afwa wal-\'afiyata fid-dunya wal-akhirah',
    translation: 'O Allah, I ask You for pardon and well-being in this world and in the Hereafter.',
    variant: 'soft',
  },
  {
    id: 'e24',
    category: 'Evening',
    title: 'Seeking Light',
    arabic: 'اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا وَفِي لِسَانِي نُورًا وَاجْعَلْ فِي سَمْعِي نُورًا',
    transliteration: 'Allahumma-j\'al fi qalbi nuran wa fi lisani nuran waj\'al fi sam\'i nuran',
    translation: 'O Allah, place light in my heart, and light in my tongue, and place light in my hearing.',
    variant: 'outlined',
  },
  {
    id: 'e25',
    category: 'Evening',
    title: 'Dua of Yunus',
    arabic: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    transliteration: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin',
    translation: 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.',
    variant: 'default',
  },

  // ─── AFTER SALAH ─────────────────────────────────────────────────────────
  {
    id: 'as01',
    category: 'After Salah',
    title: 'Post-Prayer Tasbih',
    arabic: 'سُبْحَانَ اللهِ (٣٣) وَالْحَمْدُ لِلَّهِ (٣٣) وَاللهُ أَكْبَرُ (٣٤)',
    transliteration: 'SubhanAllah (33), Alhamdulillah (33), Allahu Akbar (34)',
    translation: 'Glory be to Allah (33 times), All praise is for Allah (33 times), Allah is the Greatest (34 times). Completing it to 100: La ilaha illAllah wahdahu la sharika lah...',
    variant: 'default',
  },
  {
    id: 'as02',
    category: 'After Salah',
    title: 'Ayat al-Kursi after Prayer',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    transliteration: 'Allahu la ilaha illa huwal-hayyul-qayyum. La ta\'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard',
    translation: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. (Whoever recites Ayat al-Kursi after every prayer, nothing will prevent them from entering Jannah except death.)',
    variant: 'soft',
  },
  {
    id: 'as03',
    category: 'After Salah',
    title: 'Post-Prayer Istighfar',
    arabic: 'أَسْتَغْفِرُ اللهَ أَسْتَغْفِرُ اللهَ أَسْتَغْفِرُ اللهَ اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَاذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration: 'Astaghfirullah (3x). Allahumma antas-salam wa minkas-salam tabarakta ya dhal-jalali wal-ikram',
    translation: 'I seek Allah\'s forgiveness (3 times). O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of majesty and honour.',
    variant: 'outlined',
  },
  {
    id: 'as04',
    category: 'After Salah',
    title: 'La ilaha illallah',
    arabic: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illallahu wahdahu la sharika lahu, lahul mulku wa lahul hamdu wa huwa \'ala kulli shay\'in qadir',
    translation: 'None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is over all things competent. (Recite 10 times after Fajr and Maghrib)',
    variant: 'default',
  },
  {
    id: 'as05',
    category: 'After Salah',
    title: 'Dua for Remembrance',
    arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    transliteration: 'Allahumma a\'inni \'ala dhikrika wa shukrika wa husni \'ibadatik',
    translation: 'O Allah, help me to remember You, to give You thanks, and to perform Your worship in the best manner.',
    variant: 'soft',
  },
  {
    id: 'as06',
    category: 'After Salah',
    title: 'Dua for Jannah',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ',
    transliteration: 'Allahumma inni as\'alukal-jannata wa a\'udhu bika minan-nar',
    translation: 'O Allah, I ask You for Paradise and I seek refuge in You from the Fire.',
    variant: 'outlined',
  },
  {
    id: 'as07',
    category: 'After Salah',
    title: 'Dua for Acceptance',
    arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ',
    transliteration: 'Rabbana taqabbal minna innaka antas-sami\'ul-\'alim',
    translation: 'Our Lord, accept this from us. Indeed, You are the All-Hearing, the All-Knowing.',
    variant: 'default',
  },
  {
    id: 'as08',
    category: 'After Salah',
    title: 'After Fajr Special',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا حَلَالًا وَعَمَلًا مُتَقَبَّلًا',
    transliteration: 'Allahumma inni as\'aluka \'ilman nafi\'an wa rizqan halalan wa \'amalan mutaqabbalan',
    translation: 'O Allah, I ask You for beneficial knowledge, lawful provision, and accepted deeds. (After Fajr specifically)',
    variant: 'soft',
  },
  {
    id: 'as09',
    category: 'After Salah',
    title: 'Seeking Steadfast Heart',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الشِّرْكِ وَأَعُوذُ بِكَ مِنَ الشَّيْطَانِ الرَّجِيمِ',
    transliteration: 'Allahumma inni a\'udhu bika minash-shirki wa a\'udhu bika minash-shaytanir-rajim',
    translation: 'O Allah, I seek refuge in You from polytheism and I seek refuge in You from the accursed Shaytan.',
    variant: 'outlined',
  },
  {
    id: 'as10',
    category: 'After Salah',
    title: 'Complete Salawat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
    transliteration: 'Allahumma salli \'ala Muhammadin wa \'ala ali Muhammadin kama sallayta \'ala ali Ibrahima innaka hamidun majid',
    translation: 'O Allah, send prayers upon Muhammad and upon the family of Muhammad, just as You sent prayers upon the family of Ibrahim. Verily, You are full of praise and majesty.',
    variant: 'default',
  },
  {
    id: 'as11',
    category: 'After Salah',
    title: 'Dua for Protection',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ وَمِنْ عَذَابِ جَهَنَّمَ وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ',
    transliteration: 'Allahumma inni a\'udhu bika min \'adhabul-qabri wa min \'adhabul-jahannami wa min fitnatil-mahya wal-mamat',
    translation: 'O Allah, I seek refuge in You from the punishment of the grave, from the punishment of Hellfire, and from the trials of life and death.',
    variant: 'soft',
  },
  {
    id: 'as12',
    category: 'After Salah',
    title: 'Dua for Deen and Dunya',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina \'adhaban-nar',
    translation: 'Our Lord, give us in this world that which is good and in the Hereafter that which is good, and protect us from the punishment of the Fire.',
    variant: 'outlined',
  },
  {
    id: 'as13',
    category: 'After Salah',
    title: 'Three Quls',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ • قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ • قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    transliteration: 'Qul huwallahu ahad • Qul a\'udhu bi rabbil falaq • Qul a\'udhu bi rabbin nas',
    translation: 'Recite Surah Al-Ikhlas, Al-Falaq, and An-Nas (3 times each after Fajr and Maghrib, once after other prayers)',
    variant: 'default',
  },
  {
    id: 'as14',
    category: 'After Salah',
    title: 'Dua for Beneficial Knowledge',
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي',
    transliteration: 'Rabbish-rah li sadri wa yassir li amri wahlul \'uqdatan min lisani yafqahu qawli',
    translation: 'My Lord, expand for me my chest and ease for me my task. And untie the knot from my tongue that they may understand my speech.',
    variant: 'soft',
  },
  {
    id: 'as15',
    category: 'After Salah',
    title: 'Dua for Tawfiq',
    arabic: 'اللَّهُمَّ وَفِّقْنِي لِمَا تُحِبُّ وَتَرْضَى',
    transliteration: 'Allahumma waffiqni lima tuhibbu wa tarda',
    translation: 'O Allah, grant me success in doing what You love and are pleased with.',
    variant: 'outlined',
  },
  {
    id: 'as16',
    category: 'After Salah',
    title: 'Dua after Witr',
    arabic: 'سُبْحَانَ الْمَلِكِ الْقُدُّوسِ',
    transliteration: 'Subhanal-malikil-quddus',
    translation: 'Glory be to the Sovereign, the Most Holy. (Recite 3 times after Witr, raising the voice on the third time)',
    variant: 'default',
  },
  {
    id: 'as17',
    category: 'After Salah',
    title: 'Dua for Heart Purity',
    arabic: 'اللَّهُمَّ طَهِّرْ قَلْبِي مِنَ النِّفَاقِ وَعَمَلِي مِنَ الرِّيَاءِ وَلِسَانِي مِنَ الْكَذِبِ',
    transliteration: 'Allahumma tahhir qalbi minan-nifaqi wa \'amali minar-riya\'i wa lisani minal-kadhib',
    translation: 'O Allah, purify my heart from hypocrisy, my deeds from showing off, and my tongue from lying.',
    variant: 'soft',
  },
  {
    id: 'as18',
    category: 'After Salah',
    title: 'Dua for Ihsan',
    arabic: 'اللَّهُمَّ اجْعَلْنَا مِنَ الَّذِينَ إِذَا أَحْسَنُوا اسْتَبْشَرُوا وَإِذَا أَسَاءُوا اسْتَغْفَرُوا',
    transliteration: 'Allahumma-j\'alna minalladhina idha ahsanu-stabsharu wa idha asa\'u-istaghfaru',
    translation: 'O Allah, make us of those who rejoice when they do good and seek forgiveness when they do wrong.',
    variant: 'outlined',
  },
  {
    id: 'as19',
    category: 'After Salah',
    title: 'Dua for Khushu',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لَا يَنْفَعُ وَمِنْ قَلْبٍ لَا يَخْشَعُ',
    transliteration: 'Allahumma inni a\'udhu bika min \'ilmin la yanfa\'u wa min qalbin la yakhsha\'u',
    translation: 'O Allah, I seek refuge in You from knowledge that is of no benefit and from a heart that does not have humility.',
    variant: 'default',
  },
  {
    id: 'as20',
    category: 'After Salah',
    title: 'Complete Dhikr Set',
    arabic: 'لَا إِلَهَ إِلَّا اللهُ (١٠٠) • سُبْحَانَ اللهِ وَبِحَمْدِهِ (١٠٠)',
    transliteration: 'La ilaha illallah (100x) • SubhanAllahi wa bihamdih (100x)',
    translation: 'None has the right to be worshipped except Allah (100 times). Glory be to Allah and all praise is due to Him (100 times). Sins are forgiven even if they were as the foam of the sea.',
    variant: 'soft',
  },

  // ─── TRAVEL ─────────────────────────────────────────────────────────────
  {
    id: 't01',
    category: 'Travel',
    title: 'Leaving the Home',
    arabic: 'بِسْمِ اللهِ تَوَكَّلْتُ عَلَى اللهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    transliteration: 'Bismillahi tawakkaltu \'alallahi wa la hawla wa la quwwata illa billah',
    translation: 'In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.',
    variant: 'default',
  },
  {
    id: 't02',
    category: 'Travel',
    title: 'Boarding Transport',
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    transliteration: 'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinina wa inna ila rabbina lamunqalibun',
    translation: 'How perfect He is, the One Who has placed this at our service and we ourselves would not have been capable of that, and to our Lord is our final destiny.',
    variant: 'soft',
  },
  {
    id: 't03',
    category: 'Travel',
    title: 'Travel Dua',
    arabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى وَمِنَ الْعَمَلِ مَا تَرْضَى',
    transliteration: 'Allahumma inna nas\'aluka fi safarina hadhal-birra wat-taqwa wa minal-\'amali ma tarda',
    translation: 'O Allah, we ask You on this our journey for goodness and piety, and for deeds that are pleasing to You.',
    variant: 'outlined',
  },
  {
    id: 't04',
    category: 'Travel',
    title: 'Allahu Akbar on Journey',
    arabic: 'اللهُ أَكْبَرُ اللهُ أَكْبَرُ اللهُ أَكْبَرُ سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا',
    transliteration: 'Allahu Akbar, Allahu Akbar, Allahu Akbar. Subhanal-ladhi sakhkhara lana hadha',
    translation: 'Allah is the Greatest (3 times). How perfect is He who has subjected this to us.',
    variant: 'default',
  },
  {
    id: 't05',
    category: 'Travel',
    title: 'Entering a New Town',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ أَهْلِهَا وَخَيْرَ مَا فِيهَا وَأَعُوذُ بِكَ مِنْ شَرِّهَا',
    transliteration: 'Allahumma inni as\'aluka khayrahaa wa khayra ahliha wa khayra ma fiha wa a\'udhu bika min sharriha',
    translation: 'O Allah, I ask You for its goodness, the goodness of its people and what is in it, and I seek refuge in You from its evil.',
    variant: 'soft',
  },
  {
    id: 't06',
    category: 'Travel',
    title: 'Stopping to Rest',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: 'A\'udhu bikalimatillahit-tammati min sharri ma khalaq',
    translation: 'I seek refuge in the perfect words of Allah from the evil of that which He created. (When stopping at a place during journey)',
    variant: 'outlined',
  },
  {
    id: 't07',
    category: 'Travel',
    title: 'Returning Home',
    arabic: 'آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ',
    transliteration: 'Ayibuna ta\'ibuna \'abiduna lirabbina hamidun',
    translation: 'We return, we repent, we worship our Lord and we praise Him.',
    variant: 'default',
  },
  {
    id: 't08',
    category: 'Travel',
    title: 'Night Journey Protection',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ وَكَآبَةِ الْمَنْظَرِ وَسُوءِ الْمُنْقَلَبِ',
    transliteration: 'Allahumma inni a\'udhu bika min wa\'tha\'is-safari wa ka\'abatil-manzari wa su\'il-munqalab',
    translation: 'O Allah, I seek refuge in You from the hardships of travel, from having a change of heart, and from finding my family, property and children in an unwanted condition upon return.',
    variant: 'soft',
  },
  {
    id: 't09',
    category: 'Travel',
    title: 'Dua on the Plane / Sea',
    arabic: 'بِسْمِ اللهِ مَجْرَاهَا وَمُرْسَاهَا إِنَّ رَبِّي لَغَفُورٌ رَحِيمٌ',
    transliteration: 'Bismillahi majreha wa mursaha inna rabbi la-ghafurun rahim',
    translation: 'In the name of Allah is its sailing and its anchoring. Indeed, my Lord is Forgiving and Merciful. (From Surah Hud 11:41)',
    variant: 'outlined',
  },
  {
    id: 't10',
    category: 'Travel',
    title: 'Dua When Lost',
    arabic: 'اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الأَهْلِ',
    transliteration: 'Allahumma antas-sahibu fis-safari wal-khalifatu fil-ahl',
    translation: 'O Allah, You are the Companion on the journey and the Guardian of the family.',
    variant: 'default',
  },
  {
    id: 't11',
    category: 'Travel',
    title: 'Safe Arrival',
    arabic: 'اللَّهُمَّ اطْوِ لَنَا الأَرْضَ وَهَوِّنْ عَلَيْنَا السَّفَرَ',
    transliteration: 'Allahummaj-wi lanal-arda wa hawwin \'alainas-safar',
    translation: 'O Allah, shorten the distance for us and make the journey easy for us.',
    variant: 'soft',
  },
  {
    id: 't12',
    category: 'Travel',
    title: 'Entering a City for Hajj/Umrah',
    arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ لَا شَرِيكَ لَكَ',
    transliteration: 'Labbayk Allahumma labbayk. Labbayk la sharika laka labbayk. Innal-hamda wan-ni\'mata laka wal-mulk. La sharika lak',
    translation: 'Here I am O Allah, here I am. Here I am, You have no partner, here I am. Verily all praise and blessings are Yours, and all sovereignty. You have no partner.',
    variant: 'outlined',
  },
  {
    id: 't13',
    category: 'Travel',
    title: 'Before Driving',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ فِي سَفَرِي هَذَا الْبِرَّ وَالتَّقْوَى',
    transliteration: 'Allahumma inni as\'aluka fi safari hadhal-birra wat-taqwa',
    translation: 'O Allah, I ask You in this journey of mine for goodness and piety.',
    variant: 'default',
  },
  {
    id: 't14',
    category: 'Travel',
    title: 'Homesickness',
    arabic: 'اللَّهُمَّ ارْحَمْنَا بَعِيدِينَ كَمَا تَرْحَمُنَا قَرِيبِينَ',
    transliteration: 'Allahumma-rhamna ba\'idina kama tarhamuna qaribina',
    translation: 'O Allah, have mercy on us when we are far away just as You have mercy on us when we are near.',
    variant: 'soft',
  },
  {
    id: 't15',
    category: 'Travel',
    title: 'Seeing the Kaaba',
    arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ فَحَيِّنَا رَبَّنَا بِالسَّلَامِ',
    transliteration: 'Allahumma antas-salamu wa minkas-salamu fa-hayyina rabbana bis-salam',
    translation: 'O Allah, You are peace and from You comes peace, so keep us alive, our Lord, in peace.',
    variant: 'outlined',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loadPersonalDuas(): Promise<PersonalDua[]> {
  try {
    const raw = await AsyncStorage.getItem(PERSONAL_DUAS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PersonalDua[];
  } catch {
    return [];
  }
}

async function savePersonalDuas(duas: PersonalDua[]): Promise<void> {
  await AsyncStorage.setItem(PERSONAL_DUAS_KEY, JSON.stringify(duas));
}

// ─── Component ────────────────────────────────────────────────────────────────
export const DuasScreen = ({ navigation }: any) => {
  const { profile, darkMode } = useAppStore();
  const theme = darkMode ? DarkColors : LightColors;

  // Curated list state
  const [activeCategory, setActiveCategory] = useState('Morning');
  const [searchQuery, setSearchQuery] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Stop speech on unmount
  useEffect(() => { return () => { Speech.stop(); }; }, []);

  // Personal duas state
  const [personalDuas, setPersonalDuas] = useState<PersonalDua[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDua, setEditingDua] = useState<PersonalDua | null>(null);
  const [inputTitle, setInputTitle] = useState('');
  const [inputText, setInputText] = useState('');

  // ── Speak curated dua ──────────────────────────────────────────────────────
  const handleSpeak = useCallback((dua: typeof DUAS[0]) => {
    if (speakingId === dua.id) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    Speech.stop();
    setSpeakingId(dua.id);
    Speech.speak(dua.arabic, {
      language: 'ar-SA',
      rate: 0.85,
      onDone: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
    });
  }, [speakingId]);

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    loadPersonalDuas().then(setPersonalDuas);
  }, []);

  // ── Open modal for new dua ───────────────────────────────────────────────
  const openAddModal = useCallback(() => {
    setEditingDua(null);
    setInputTitle('');
    setInputText('');
    setModalVisible(true);
  }, []);

  // ── Open modal for editing ───────────────────────────────────────────────
  const openEditModal = useCallback((dua: PersonalDua) => {
    setEditingDua(dua);
    setInputTitle(dua.title);
    setInputText(dua.text);
    setModalVisible(true);
  }, []);

  // ── Save (add or update) ─────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) {
      Alert.alert('Empty Dua', 'Please write your dua before saving.');
      return;
    }

    let updated: PersonalDua[];

    if (editingDua) {
      // Update existing
      updated = personalDuas.map((d) =>
        d.id === editingDua.id
          ? { ...d, title: inputTitle.trim(), text: trimmedText }
          : d
      );
    } else {
      // Add new
      const newDua: PersonalDua = {
        id: Date.now().toString(),
        title: inputTitle.trim(),
        text: trimmedText,
        createdAt: Date.now(),
      };
      updated = [newDua, ...personalDuas];
    }

    setPersonalDuas(updated);
    await savePersonalDuas(updated);
    setModalVisible(false);
  }, [editingDua, inputTitle, inputText, personalDuas]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (dua: PersonalDua) => {
      Alert.alert(
        'Delete Dua',
        'Are you sure you want to delete this dua?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const updated = personalDuas.filter((d) => d.id !== dua.id);
              setPersonalDuas(updated);
              await savePersonalDuas(updated);
            },
          },
        ]
      );
    },
    [personalDuas]
  );

  // ── Format date ──────────────────────────────────────────────────────────
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ── Filtered curated duas ────────────────────────────────────────────────
  const filteredDuas = DUAS.filter((dua) => {
    const matchesCategory = dua.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      dua.arabic.includes(searchQuery) ||
      (dua as any).transliteration?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dua.translation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const bottomInset = useScreenBottomInset();

  return (
    <ScreenWrapper>
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: darkMode ? 'transparent' : 'rgba(251,249,244,0.97)' }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.dateText}>{profile?.name || 'Friend'}</Text>
        </View>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        {/* ── Page Title ──────────────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Supplications</Text>
          <Text style={styles.pageSubtitle}>Daily remembrance for spiritual peace</Text>
        </View>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <View style={[styles.searchBar, darkMode ? {
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderColor: 'rgba(154,236,213,0.25)',
          borderWidth: 1,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        } : {
          backgroundColor: 'rgba(15,109,91,0.06)',
          borderColor: 'rgba(15,109,91,0.1)',
          borderWidth: 1,
        }]}>
          <MaterialIcons name="search" size={20} color={darkMode ? 'rgba(154,236,213,0.6)' : Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search duas..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            underlineColorAndroid="transparent"
            style={[styles.searchInput, {
              color: theme.textPrimary,
              backgroundColor: 'transparent',
            }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Categories ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesSection}
        >
          {CATEGORIES.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Write Your Own Card ─────────────────────────────────────── */}
        <TouchableOpacity style={styles.writeCard} activeOpacity={0.9} onPress={openAddModal}>
          <LinearGradient colors={[Colors.secondary, '#B58C00']} style={StyleSheet.absoluteFillObject} />
          <MaterialIcons name="edit-note" size={160} color="rgba(255,255,255,0.2)" style={styles.writeBgIcon} />
          <View style={styles.writeContent}>
            <View>
              <View style={styles.writeTitleRow}>
                <MaterialIcons name="auto-awesome" size={20} color="rgba(255,255,255,0.9)" />
                <Text style={styles.writeTitle}>Write Your Own Dua</Text>
              </View>
              <Text style={styles.writeDesc}>Preserve your personal conversations with the Creator.</Text>
            </View>
            <View style={styles.addBtnContainer}>
              <BlurView intensity={20} tint="light" style={styles.addBtn}>
                <MaterialIcons name="add" size={24} color="#fff" />
              </BlurView>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── My Duas Section ─────────────────────────────────────────── */}
        {personalDuas.length > 0 && (
          <View style={styles.myDuasSection}>
            <Text style={styles.myDuasTitle}>MY DUAS</Text>
            <View style={styles.myDuasList}>
              {personalDuas.map((dua) => (
                <View key={dua.id} style={styles.personalDuaCard}>
                  <View style={styles.personalDuaHeader}>
                    <View style={styles.personalDuaHeaderLeft}>
                      <MaterialIcons name="favorite" size={16} color={Colors.secondary} />
                      <Text style={styles.personalDuaTitle} numberOfLines={1}>
                        {dua.title || 'Personal Dua'}
                      </Text>
                    </View>
                    <View style={styles.personalDuaActions}>
                      <TouchableOpacity onPress={() => openEditModal(dua)} style={styles.actionBtn}>
                        <MaterialIcons name="edit" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(dua)} style={styles.actionBtn}>
                        <MaterialIcons name="delete-outline" size={18} color="#D32F2F" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.personalDuaText}>{dua.text}</Text>
                  <Text style={styles.personalDuaDate}>{formatDate(dua.createdAt)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Empty state for My Duas ──────────────────────────────────── */}
        {personalDuas.length === 0 && (
          <View style={styles.emptyPersonal}>
            <MaterialIcons name="create" size={36} color="rgba(0,83,68,0.15)" />
            <Text style={styles.emptyPersonalText}>Start your personal conversation with Allah</Text>
            <TouchableOpacity style={styles.emptyPersonalBtn} onPress={openAddModal}>
              <Text style={styles.emptyPersonalBtnText}>Write a Dua</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Curated Dua Lists ────────────────────────────────────────── */}
        <Text style={[styles.myDuasTitle, { marginTop: Spacing['2xl'], marginBottom: Spacing.lg }]}>
          CURATED DUAS
        </Text>
        <View style={styles.duasList}>
          {filteredDuas.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <MaterialIcons name="auto-stories" size={48} color="rgba(0,83,68,0.2)" />
              <Text style={styles.noResultsTitle}>No duas found</Text>
              <Text style={styles.noResultsSub}>Check back later or write your own dua above.</Text>
            </View>
          ) : (
            filteredDuas.map((dua) => {
              const isSoft = dua.variant === 'soft';
              const isOutlined = dua.variant === 'outlined';
              return (
                <View
                  key={dua.id}
                  style={[styles.duaCard, isSoft && styles.duaCardSoft, isOutlined && styles.duaCardOutlined]}
                >
                  <View style={styles.duaHeader}>
                    <View style={styles.duaHeaderLeft}>
                      <View style={styles.duaBadge}>
                        <Text style={styles.duaBadgeText}>{dua.id}</Text>
                      </View>
                      <Text style={styles.duaCategoryText}>{dua.category}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.playBtn, isSoft && styles.playBtnSoft, isOutlined && styles.playBtnOutlined]}
                      onPress={() => handleSpeak(dua)}
                    >
                      <MaterialIcons
                        name={speakingId === dua.id ? 'stop' : 'play-arrow'}
                        size={24}
                        color={isSoft ? Colors.primary : '#fff'}
                      />
                    </TouchableOpacity>
                  </View>
                  {speakingId === dua.id && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary }} />
                      <Text style={{ fontFamily: 'Manrope', fontSize: 11, color: Colors.primary, fontWeight: '700', letterSpacing: 1 }}>
                        RECITING...
                      </Text>
                    </View>
                  )}
                  <Text style={styles.duaTitleText}>{(dua as any).title}</Text>
                  <Text style={styles.arabicText}>{dua.arabic}</Text>
                  <View style={styles.translationDivider} />
                  <Text style={styles.transliterationText}>{(dua as any).transliteration}</Text>
                  <View style={[styles.translationDivider, { opacity: 0.4 }]} />
                  <Text style={styles.translationText}>{dua.translation}</Text>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* ── Add / Edit Modal ────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingDua ? 'Edit Dua' : 'Write Your Dua'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Title field */}
            <Text style={styles.fieldLabel}>Title (Optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. For my family..."
              placeholderTextColor={Colors.textMuted}
              value={inputTitle}
              onChangeText={setInputTitle}
              maxLength={80}
            />

            {/* Dua text field */}
            <Text style={styles.fieldLabel}>Your Dua *</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextArea]}
              placeholder="Write your dua here…"
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient colors={[Colors.primary, '#0f6d5b']} style={StyleSheet.absoluteFillObject} />
                <Text style={styles.saveBtnText}>{editingDua ? 'Update' : 'Save Dua'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 249, 244, 0.8)',
    zIndex: 100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.accent, letterSpacing: 1 },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: { paddingHorizontal: Spacing.xl },
  titleSection: { marginBottom: Spacing.lg },
  pageTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 36, fontWeight: '800', color: Colors.primary, letterSpacing: -1 },
  pageSubtitle: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, marginTop: 8, fontWeight: '500' },

  // ── Search ────────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
    fontFamily: 'Manrope',
    backgroundColor: 'transparent',
    padding: 0,
    borderWidth: 0,
    outlineWidth: 0,
  },

  // ── Categories ────────────────────────────────────────────────────────────
  categoriesSection: { marginHorizontal: -Spacing.xl, marginBottom: Spacing.lg },
  categoriesContainer: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  categoryPill: {
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: BorderRadius.full, backgroundColor: '#f5f3ee',
    justifyContent: 'center', alignItems: 'center',
  },
  categoryPillActive: { backgroundColor: Colors.primary, ...Shadows.sm },
  categoryText: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '600', color: '#3f4945' },
  categoryTextActive: { color: '#fff', fontWeight: '700' },

  // ── Write Card ────────────────────────────────────────────────────────────
  writeCard: {
    borderRadius: 24, overflow: 'hidden', padding: Spacing.xl,
    marginBottom: Spacing['2xl'], ...Shadows.gold, height: 130, justifyContent: 'center',
  },
  writeBgIcon: { position: 'absolute', top: -20, right: -40, transform: [{ rotate: '12deg' }] },
  writeContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  writeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  writeTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: '#fff' },
  writeDesc: { fontFamily: 'Manrope', fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 220, lineHeight: 20 },
  addBtnContainer: { borderRadius: 16, overflow: 'hidden' },
  addBtn: { padding: 12 },

  // ── My Duas ───────────────────────────────────────────────────────────────
  myDuasSection: { marginBottom: Spacing['2xl'] },
  myDuasList: { gap: Spacing.lg },
  myDuasTitle: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '800',
    color: Colors.secondary, letterSpacing: 3, textTransform: 'uppercase',
    marginBottom: Spacing.lg, opacity: 0.7,
  },
  personalDuaCard: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: Spacing.xl, ...Shadows.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.secondary,
  },
  personalDuaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  personalDuaHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  personalDuaTitle: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700',
    color: Colors.textDark, flex: 1,
  },
  personalDuaActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  personalDuaText: {
    fontFamily: 'Manrope', fontSize: 15, color: '#3f4945',
    lineHeight: 24, marginBottom: 10,
  },
  personalDuaDate: {
    fontFamily: 'Manrope', fontSize: 11, color: Colors.textMuted,
    fontWeight: '600',
  },

  // ── Empty personal state ──────────────────────────────────────────────────
  emptyPersonal: {
    alignItems: 'center', paddingVertical: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  emptyPersonalText: {
    fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted,
    textAlign: 'center', marginTop: 10, marginBottom: 14, lineHeight: 20,
  },
  emptyPersonalBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.primary,
  },
  emptyPersonalBtnText: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: Colors.primary,
  },

  // ── Curated list ──────────────────────────────────────────────────────────
  noResultsTitle: { fontFamily: 'Plus Jakarta Sans', color: Colors.primary, fontWeight: '700', fontSize: 16, marginTop: 16 },
  noResultsSub: { fontFamily: 'Manrope', color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 4 },
  duasList: { gap: Spacing.xl },
  duaCard: { backgroundColor: '#fff', borderRadius: 24, padding: Spacing.xl, ...Shadows.sm },
  duaCardSoft: { backgroundColor: 'rgba(245, 243, 238, 0.5)', elevation: 0, shadowOpacity: 0 },
  duaCardOutlined: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,83,68,0.05)', elevation: 0, shadowOpacity: 0 },
  duaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  duaHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  duaBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,83,68,0.05)', alignItems: 'center', justifyContent: 'center' },
  duaBadgeText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: Colors.primary },
  duaCategoryText: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.green },
  playBtnSoft: { backgroundColor: '#eae8e3', shadowOpacity: 0, elevation: 0 },
  playBtnOutlined: { backgroundColor: Colors.primary },
  arabicText: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 28, color: '#1B1C19', textAlign: 'right', lineHeight: 48, marginBottom: Spacing.lg },
  translationDivider: { height: 1, backgroundColor: '#eae8e3', marginBottom: Spacing.lg },
  translationText: { fontFamily: 'Manrope', fontSize: 14, color: '#3f4945', lineHeight: 24, fontStyle: 'italic' },
  duaTitleText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  transliterationText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, paddingBottom: 48,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: '800', color: Colors.primary },
  fieldLabel: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '800',
    color: Colors.textMuted, letterSpacing: 2, textTransform: 'uppercase',
    marginBottom: 8, marginTop: Spacing.md,
  },
  fieldInput: {
    backgroundColor: '#f5f3ee', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontFamily: 'Manrope', fontSize: 15, color: Colors.textDark,
    borderWidth: 1, borderColor: 'rgba(0,83,68,0.08)',
  },
  fieldTextArea: { minHeight: 130, lineHeight: 24 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: Spacing['2xl'] },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(0,83,68,0.2)',
    alignItems: 'center',
  },
  cancelBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.primary },
  saveBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 14,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: '#fff' },
});

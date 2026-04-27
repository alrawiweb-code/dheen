import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, NativeSpacing as Spacing } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { ScreenWrapper } from '../components/ScreenWrapper';

const { width, height } = Dimensions.get('window');
const ONBOARDING_DONE_KEY = '@dheen_onboarding_done';

// ─── Slide Data ───────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'step1',
    label: 'NOUR',
    title: 'Stay connected with your Deen, every day.',
    description: 'Begin your journey towards spiritual consistency and inner peace.',
    imageUri: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d05?auto=format&fit=crop&w=800&q=80/AB6AXuBIwjNJMUCFl3YhwOVhyATuK0XUaHP2wQjcAzkBjl7EAGwtqU4tjQHx5T-7zrEb1I5SB_hgDdP73l4XgomrSBlziTgjxiNlSH6983K5tfvwm2XpuUjXKB-CxDu_ZfnbRZuXRYL1skYAXS6LWke5H8xUvaOF2ayY68NpteOLpUV0pSPqfR4Cv_P_6hkR0mif8bYFW-TXr6fgy3KQbAbbeX2hQMYL5oBOz5e7fUThCsdjouWv5NrxoBafHuxiM-VsLiAD8p8igZPHWMp4',
    bg: Colors.background,
    isDark: false,
  },
  {
    id: 'step2',
    label: 'FEATURES',
    features: [
      { icon: 'mosque', title: 'Track Salah', desc: 'Quiet reminders for your five prayers', color: Colors.primary, bg: 'rgba(15,109,91,0.05)' },
      { icon: 'menu-book', title: 'Read Quran', desc: 'Sacred verses for your daily path', color: Colors.accent, bg: 'rgba(212,175,55,0.1)' },
      { icon: 'favorite', title: 'Reflect', desc: 'Moments of Gratitude and Dhikr', color: '#ba1a1a', bg: 'rgba(186,26,26,0.1)' },
    ],
    bg: Colors.background,
    isDark: false,
  },
  {
    id: 'step3',
    label: 'PREPARE',
    title: 'This is your space.',
    description: 'No pressure. No judgement. Just peace.',
    imageUri: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d05?auto=format&fit=crop&w=800&q=80/AB6AXuC9w26Sapz23oYaaZOAdNkqmgpDIv3Nzdwq4JVgiZOWlDtpiCato-494VZvLvdS8xAcrc-5x2DEuFlnc8AwSmiQzgCSLAy826lQoVN9knddyO-vZaH8QPqabQ5uYTVtjKdloiSyQQkiOKWd4nX6p0uWoe0UiRNgWF52EqRGYZrcxwT8nk4dvIk_9VJMw9EPszXfqH_lKJ3G3yjsiJxmp6hKJtnUYjQNhmLCJApz7BYsxKysgOzJy1UhGzeM7LmJh2sFFn1mXX9Dfwp9',
    bg: '#005344',
    isDark: true,
  },
];

// ─── Component ────────────────────────────────────────────────────
export const OnboardingScreen = ({ navigation }: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [name, setName] = useState('');
  const { setProfile } = useAppStore();

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const enterApp = async () => {
    const finalName = name.trim() || 'Friend';
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      await AsyncStorage.setItem('userName', finalName);
    } catch (_) {
      // Non-critical — still navigate
    }
    setProfile({ name: finalName, onboardingComplete: true });
    navigation.replace('Root');
  };

  const slide = SLIDES[currentIndex];
  const isDark = slide.isDark;

  return (
    <ScreenWrapper>

      {/* ── Slide 3 dark gradient background ── */}
      {isDark && (
        <LinearGradient
          colors={['#005344', '#002019']}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* ── Slide 2 light gradient ── */}
      {currentIndex === 1 && (
        <LinearGradient
          colors={[Colors.background, '#eae8e3']}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      <View style={styles.safeArea}>
        {/* ── Label ── */}
        <View style={styles.header}>
          <Text style={[styles.label, isDark && styles.labelDark]}>
            {slide.label}
          </Text>
        </View>

        {/* ── Slide Content ── */}
        <View style={styles.content}>

          {/* SLIDE 0 — Welcome */}
          {currentIndex === 0 && (
            <>
              <View style={styles.imageContainer}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.description}>{slide.description}</Text>
              </View>
              <TouchableOpacity
                id="onboarding-begin-btn"
                style={styles.primaryBtn}
                onPress={goNext}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.accent, '#8B7100']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.primaryBtnText}>Begin</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#241a00" />
              </TouchableOpacity>
            </>
          )}

          {/* SLIDE 1 — Features */}
          {currentIndex === 1 && (
            <View style={styles.featuresWrapper}>
              {slide.features?.map((f, i) => (
                <View key={i} style={styles.featureCard}>
                  <View style={[styles.iconBox, { backgroundColor: f.bg }]}>
                    <MaterialIcons name={f.icon as any} size={28} color={f.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.navRow}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  id="onboarding-next-btn"
                  style={styles.nextBtn}
                  onPress={goNext}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextText}>Next</Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SLIDE 2 — Enter App */}
          {currentIndex === 2 && (
            <>
              <View style={styles.archImageContainer}>
                <Image
                  source={require('../assets/arch.jpg')}
                  style={styles.archImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.textWrapperDark}>
                <Text style={styles.titleDark}>{slide.title}</Text>
                <Text style={styles.descriptionDark}>{slide.description}</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.nameInput}
                  placeholder="What is your name?"
                  placeholderTextColor="rgba(154,236,213,0.5)"
                  value={name}
                  onChangeText={setName}
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.enterContainer}>
                <TouchableOpacity
                  id="onboarding-enter-btn"
                  style={styles.enterBtn}
                  onPress={enterApp}
                  activeOpacity={0.85}
                >
                  <Text style={styles.enterText}>Enter App</Text>
                </TouchableOpacity>
                <Text style={styles.footerPrivacy}>
                  PRIVACY FOCUSED
                </Text>
              </View>
            </>
          )}

        </View>

        {/* ── Dot Indicators ── */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                isDark && i !== currentIndex && styles.dotDark,
                isDark && i === currentIndex && styles.dotActiveDark,
              ]}
            />
          ))}
        </View>

      </View>
    </ScreenWrapper>
  );
};

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', paddingBottom: 40 },

  header: { paddingTop: 32, marginBottom: 24 },
  label: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 2,
    color: Colors.accent,
  },
  labelDark: { color: '#a1f2db' },

  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },

  // Slide 0
  imageContainer: { width: 270, height: 270, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  logoImage: {
    width: 240,
    height: 240,
    borderRadius: 48,
  },
  textWrapper: { alignItems: 'center', marginBottom: 16 },
  title: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 28, fontWeight: '800',
    color: Colors.primary, textAlign: 'center', marginBottom: 12, lineHeight: 36,
  },
  description: {
    fontFamily: 'Manrope', fontSize: 16, color: Colors.textMuted,
    textAlign: 'center', fontWeight: '500',
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 56, borderRadius: 16, overflow: 'hidden',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '800', color: '#241a00',
  },

  // Slide 1
  featuresWrapper: { width: '100%', paddingTop: 8 },
  featureCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 20, borderRadius: 24, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  featureTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  featureDesc: { fontFamily: 'Manrope', fontSize: 14, color: '#3f4945' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  backText: { fontFamily: 'Manrope', fontWeight: '600', color: Colors.primary, opacity: 0.5 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16,
  },
  nextText: { color: '#fff', fontFamily: 'Manrope', fontWeight: '700', fontSize: 15 },

  // Slide 2
  archImageContainer: { marginBottom: 32 },
  archImage: {
    width: 192,
    height: 256,
    borderTopLeftRadius: 96,
    borderTopRightRadius: 96,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(154,236,213,0.2)',
  },
  textWrapperDark: { alignItems: 'center', marginBottom: 32 },
  titleDark: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 32, fontWeight: '700',
    color: '#fff', textAlign: 'center', marginBottom: 12,
  },
  descriptionDark: {
    fontFamily: 'Manrope', fontSize: 18, fontStyle: 'italic',
    color: '#9aecd5', fontWeight: '300', textAlign: 'center',
  },
  enterContainer: { width: '100%', alignItems: 'center' },
  enterBtn: {
    width: '100%', backgroundColor: '#fff', paddingVertical: 18, borderRadius: 16,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20,
  },
  enterText: { color: Colors.primary, fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '800' },
  footerPrivacy: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10,
    fontFamily: 'Manrope', letterSpacing: 2, marginTop: 12,
  },
  inputWrapper: { width: '100%', marginBottom: 24 },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Plus Jakarta Sans',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(154,236,213,0.2)',
  },

  // Dots
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 16 },
  dot: { height: 6, width: 8, borderRadius: 3, backgroundColor: 'rgba(15,109,91,0.2)', marginHorizontal: 4 },
  dotActive: { width: 32, backgroundColor: Colors.primary },
  dotDark: { backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActiveDark: { width: 32, backgroundColor: '#fff' },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Typography, NativeSpacing as Spacing } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { ScreenWrapper, useScreenBottomInset } from '../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const DHIKR_LIST = [
  { english: 'SubhanAllah', arabic: 'سُبْحَانَ اللهِ' },
  { english: 'Alhamdulillah', arabic: 'الْحَمْدُ لِلّٰهِ' },
  { english: 'Allahu Akbar', arabic: 'اللهُ أَكْبَرُ' },
  { english: 'Astaghfirullah', arabic: 'أَسْتَغْفِرُ اللهَ' },
  { english: 'La ilaha illallah', arabic: 'لَا إِلٰهَ إِلَّا اللهُ' },
];

export const DhikrScreen = ({ navigation }: any) => {
  const bottomInset = useScreenBottomInset();
  const [isPlaying, setIsPlaying] = useState(false);

  const [phase, setPhase] = useState<'INHALE' | 'EXHALE'>('INHALE');
  const phaseRef = useRef<'INHALE' | 'EXHALE'>('INHALE');
  const [breathingEnabled, setBreathingEnabled] = useState(true);

  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [dhikrCount, setDhikrCount] = useState(0);
  const currentDhikr = DHIKR_LIST[dhikrIndex];
  const { profile } = useAppStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;



  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (isPlaying) {
      // Reset to inhale on start
      phaseRef.current = 'INHALE';
      setPhase('INHALE');

      const runCycle = () => {
        // Inhale phase
        setPhase('INHALE');
        phaseRef.current = 'INHALE';
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 4000,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished || !isPlaying) return;
          // Exhale phase
          setPhase('EXHALE');
          phaseRef.current = 'EXHALE';
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished && isPlaying) {
              setDhikrCount(c => c + 1);
              runCycle();
            }
          });
        });
      };

      runCycle();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      setPhase('INHALE');
      setDhikrCount(0);
    }

    return () => {
      pulseAnim.stopAnimation();
    };
  }, [isPlaying]);

  return (
    <ScreenWrapper>
      {/* Background Radial Gradient Effect */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.radialGradientBg} pointerEvents="none" />
      </View>

      {/* Top Header */}
      <View>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => navigation.goBack()}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          >
            <MaterialIcons name="close" size={24} color="#a1f2db" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>DHIKR</Text>
          </View>

        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Main Breathing Core */}
        <View style={styles.mainCanvas}>
        <View style={styles.coreContainer}>
          <Animated.View 
            pointerEvents="none"
            style={[
              styles.glowOrb, 
              { 
                transform: [{ scale: breathingEnabled ? pulseAnim : 1 }], 
                opacity: breathingEnabled ? pulseAnim.interpolate({inputRange:[1, 1.35], outputRange:[0.2, 0.6]}) : 0.2 
              }
            ]} 
          />
          
          <BlurView intensity={30} tint="light" style={styles.innerCore}>
            <Text style={styles.inhaleText}>{phase}</Text>
            <View style={styles.dhikrTextContainer}>
              <Text style={styles.dhikrEnglish}>{currentDhikr.english}</Text>
              <Text style={styles.dhikrArabic}>{currentDhikr.arabic}</Text>
            </View>
            <View style={styles.progressDots}>
              <Text style={styles.cycleCountText}>
                {dhikrCount}
              </Text>
              <Text style={styles.cycleLabelText}>
                CYCLES
              </Text>
            </View>
          </BlurView>

          {/* Floating Element now toggles breathing animation */}
          <TouchableOpacity 
            style={styles.floatingPanel}
            activeOpacity={0.7}
            onPress={() => setBreathingEnabled(!breathingEnabled)}
          >
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            <MaterialIcons name={breathingEnabled ? "flare" : "brightness-2"} size={20} color={breathingEnabled ? "#ffe088" : "rgba(255,255,255,0.4)"} />
          </TouchableOpacity>
        </View>

        <Text style={styles.instructionalText}>
          Allow your breath to synchronize with the circle’s expansion. Seek peace in the remembrance of the Creator.
        </Text>

        <TouchableOpacity 
          style={styles.switchModeBtn}
          onPress={() => navigation.navigate('BreathingDhikr')}
        >
          <MaterialIcons name="air" size={16} color={Colors.primary} />
          <Text style={styles.switchModeText}>Switch to Breathing Mode</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(bottomInset, 24) }]}>
        {/* Session Dua Card */}
        <BlurView intensity={20} tint="dark" style={styles.duaCard}>
          <View style={styles.duaIconBox}>
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 32, height: 32, borderRadius: 8 }}
              resizeMode="contain"
            />
          </View>
          <View style={styles.duaContent}>
            <Text style={styles.duaTitle}>Completion Dua</Text>
            <Text style={styles.duaEnglish}>"Glory be to Allah and all praise is due to Him."</Text>
            <Text style={styles.duaArabic}>سُبْحَانَ اللَّهِ وَبِحَمْدِهِ</Text>
          </View>
        </BlurView>

        {/* Media Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setDhikrIndex(i => (i - 1 + DHIKR_LIST.length) % DHIKR_LIST.length)}
          >
            <MaterialIcons name="skip-previous" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.primaryBtn} 
            activeOpacity={0.8}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <LinearGradient
              colors={['#0f6d5b', Colors.primary]}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={26} color="#fff" />
            <Text style={styles.primaryBtnText}>{isPlaying ? 'PAUSE' : 'START'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setDhikrIndex(i => (i + 1) % DHIKR_LIST.length)}
          >
            <MaterialIcons name="skip-next" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>


    </ScreenWrapper>
);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  radialGradientBg: {
    flex: 1,
    backgroundColor: '#005344', // Dark green fallback
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 100,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(161, 242, 219, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: -1,
  },
  headerTitle: { 
    fontFamily: 'Plus Jakarta Sans', 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#a1f2db', 
    letterSpacing: 2, 
    textTransform: 'uppercase'
  },
  soundIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(161, 242, 219, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreContainer: {
    width: width * 0.65,
    maxWidth: 320,
    aspectRatio: 1,
    borderRadius: 200,
    borderWidth: 1,
    borderColor: 'rgba(161, 242, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 16,
    marginBottom: 16,
  },
  glowOrb: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 200,
    backgroundColor: 'rgba(161, 242, 219, 0.05)',
  },
  innerCore: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 150,
    backgroundColor: 'rgba(15, 109, 91, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inhaleText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '800', color: '#a1f2db', letterSpacing: 4, marginBottom: Spacing.xl },
  dhikrTextContainer: { alignItems: 'center', gap: 8 },
  dhikrEnglish: { fontFamily: 'Plus Jakarta Sans', fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  dhikrArabic: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 40, color: 'rgba(255,255,255,0.9)' },
  progressDots: { alignItems: 'center', marginTop: 14 },
  cycleCountText: { fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  cycleLabelText: { fontFamily: 'Manrope', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 2 },
  floatingPanel: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  instructionalText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: 'rgba(161, 242, 219, 0.6)',
    textAlign: 'center',
    paddingHorizontal: Spacing['3xl'],
    marginTop: 20,
    lineHeight: 22,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: 'rgba(161, 242, 219, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(161, 242, 219, 0.3)',
  },
  switchModeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: '#a1f2db',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  duaCard: {
    width: width - 40,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginTop: 16,
    marginBottom: 16,
    overflow: 'hidden',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  duaIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(115,92,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  duaContent: { flex: 1, justifyContent: 'center' },
  duaTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 1, marginBottom: 4 },
  duaEnglish: { fontFamily: 'Manrope', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginBottom: 8 },
  duaArabic: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 18, color: '#fff', textAlign: 'right' },

  controlsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    width: width - 60,
    marginTop: 24,
  },
  secondaryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(161, 242, 219, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    width: 200,
    height: 58,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '800', letterSpacing: 1, color: '#fff' },

  soundMenu: {
    position: 'absolute',
    right: 24,
    padding: 12,
    borderRadius: 24,
    flexDirection: 'column',
    gap: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 50,
  },
  soundBtnActive: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fed65b', alignItems: 'center', justifyContent: 'center' },
  soundBtnInactive: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
});

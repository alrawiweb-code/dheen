import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, NativeSpacing as Spacing } from '../theme';

const { width } = Dimensions.get('window');

export const DhikrScreen = ({ navigation }: any) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundVisible, setSoundVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Background Radial Gradient Effect */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.radialGradientBg} />
      </View>

      {/* Top Header */}
      <SafeAreaView>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="close" size={24} color="#9aecd5" />
            </TouchableOpacity>
            <Text style={styles.headerLabel}>FOCUS MODE</Text>
          </View>
          <Text style={styles.dateText}>14 Shawwal 1446</Text>
          <View style={styles.headerRight}>
            <View style={styles.soundLabelContainer}>
              <Text style={styles.soundLabel}>Sound: Rain</Text>
              <TouchableOpacity onPress={() => setSoundVisible(!soundVisible)}>
                <MaterialIcons name="volume-up" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Breathing Core */}
      <View style={styles.mainCanvas}>
        <View style={styles.coreContainer}>
          <View style={[styles.glowOrb, { transform: [{ scale: 1.25 }] }]} />
          
          <BlurView intensity={30} tint="light" style={styles.innerCore}>
            <Text style={styles.inhaleText}>INHALE</Text>
            <View style={styles.dhikrTextContainer}>
              <Text style={styles.dhikrEnglish}>SubhanAllah</Text>
              <Text style={styles.dhikrArabic}>سُبْحَانَ اللهِ</Text>
            </View>
            <View style={styles.progressDots}>
              <View style={[styles.dot, { opacity: 1 }]} />
              <View style={[styles.dot, { opacity: 0.4 }]} />
              <View style={[styles.dot, { opacity: 0.2 }]} />
            </View>
          </BlurView>

          {/* Floating Element */}
          <BlurView intensity={20} tint="dark" style={styles.floatingPanel}>
            <MaterialIcons name="flare" size={20} color="#ffe088" />
          </BlurView>
        </View>

        <Text style={styles.instructionalText}>
          Allow your breath to synchronize with the circle’s expansion. Seek peace in the remembrance of the Creator.
        </Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomSection}>
        {/* Session Dua Card */}
        <BlurView intensity={20} tint="dark" style={styles.duaCard}>
          <View style={styles.duaIconBox}>
            <MaterialIcons name="auto-stories" size={24} color="#ffe088" />
          </View>
          <View style={styles.duaContent}>
            <Text style={styles.duaTitle}>Completion Dua</Text>
            <Text style={styles.duaEnglish}>"Glory be to Allah and all praise is due to Him."</Text>
            <Text style={styles.duaArabic}>سُبْحَانَ اللَّهِ وَبِحَمْدِهِ</Text>
          </View>
        </BlurView>

        {/* Media Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.secondaryBtn}>
            <MaterialIcons name="skip-previous" size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.primaryBtn} 
            activeOpacity={0.8}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <LinearGradient
              colors={['#0f6d5b', Colors.primary]}
              style={StyleSheet.absoluteFillObject}
            />
            <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={24} color="#fff" />
            <Text style={styles.primaryBtnText}>{isPlaying ? 'PAUSE SESSION' : 'START SESSION'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryBtn}>
            <MaterialIcons name="skip-next" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sound Selection Menu */}
      {soundVisible && (
        <BlurView intensity={30} tint="dark" style={styles.soundMenu}>
          <TouchableOpacity style={styles.soundBtnActive}>
            <MaterialIcons name="water-drop" size={24} color="#745c00" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.soundBtnInactive}>
            <MaterialIcons name="air" size={24} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.soundBtnInactive}>
            <MaterialIcons name="nature" size={24} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </BlurView>
      )}
    </View>
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(251, 249, 244, 0.8)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f6d5b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: Colors.secondary, letterSpacing: 1 },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.primary },
  headerRight: { alignItems: 'flex-end' },
  soundLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  soundLabel: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '600', color: 'rgba(27, 28, 25, 0.4)', textTransform: 'uppercase', letterSpacing: 1 },

  mainCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreContainer: {
    width: width * 0.8,
    maxWidth: 384,
    aspectRatio: 1,
    borderRadius: 200,
    borderWidth: 1,
    borderColor: 'rgba(161, 242, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  dhikrEnglish: { fontFamily: 'Plus Jakarta Sans', fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  dhikrArabic: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 48, color: 'rgba(255,255,255,0.9)' },
  progressDots: { flexDirection: 'row', gap: 4, marginTop: Spacing['2xl'] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
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
    fontSize: 14,
    color: 'rgba(161, 242, 219, 0.6)',
    textAlign: 'center',
    paddingHorizontal: Spacing['3xl'],
    marginTop: Spacing['3xl'],
    lineHeight: 24,
  },

  bottomSection: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 48,
    alignItems: 'center',
  },
  duaCard: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    padding: Spacing.xl,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing['2xl'],
    overflow: 'hidden',
    gap: 24,
  },
  duaIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(115,92,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  duaContent: { flex: 1 },
  duaTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 1, marginBottom: 4 },
  duaEnglish: { fontFamily: 'Manrope', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22, marginBottom: 12 },
  duaArabic: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 20, color: '#fff', textAlign: 'right' },

  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  secondaryBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    height: 64,
    paddingHorizontal: 32,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  primaryBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#fff' },

  soundMenu: {
    position: 'absolute',
    bottom: 150,
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

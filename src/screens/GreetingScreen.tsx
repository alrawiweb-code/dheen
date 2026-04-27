import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';
import { useAppStore } from '../store/useAppStore';

const { width, height } = Dimensions.get('window');

export const GreetingScreen = ({ navigation }: any) => {
  const profile = useAppStore((state) => state.profile);
  const userName = profile?.name || '';
  
  const progress = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate progress bar over 1.5 seconds
    Animated.timing(progress, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        // Fade out transition
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          navigation.replace('Root');
        });
      }
    });
  }, [navigation, progress, fadeOut]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <LinearGradient
        colors={['#002d24', '#0f6d5b', '#1a8a72']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Glow circles */}
      <View style={[styles.glowCircle, { width: 500, height: 500, top: -100, left: -60, backgroundColor: 'rgba(133,214,192,0.07)' }]} />
      <View style={[styles.glowCircle, { width: 300, height: 300, bottom: 80, right: -60, backgroundColor: 'rgba(212,175,55,0.06)' }]} />

      {/* Star dots */}
      <View style={[styles.star, { top: '12%', left: '18%', width: 3, height: 3, opacity: 0.5 }]} />
      <View style={[styles.star, { top: '20%', left: '78%', width: 2, height: 2, opacity: 0.4 }]} />
      <View style={[styles.star, { top: '35%', left: '88%', width: 3, height: 3, opacity: 0.3 }]} />
      <View style={[styles.star, { top: '72%', left: '14%', width: 2, height: 2, opacity: 0.4 }]} />
      <View style={[styles.star, { top: '80%', left: '82%', width: 3, height: 3, opacity: 0.3 }]} />
      <View style={[styles.star, { top: '60%', left: '6%', width: 2, height: 2, opacity: 0.5 }]} />

      {/* App Logo */}
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: 100, height: 100, marginBottom: 24, borderRadius: 20 }}
        resizeMode="contain"
      />

      {/* Arabic */}
      <Text style={styles.arabic}>السَّلَامُ عَلَيْكُمْ</Text>

      {/* Greeting */}
      <Text style={styles.english}>{userName ? `السلام عليكم، ${userName}` : 'السلام عليكم'}</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Welcome back</Text>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
          <LinearGradient
            colors={['#9aecd5', '#d4af37']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>

      {/* Bottom logo watermark */}
      <Image
        source={require('../../assets/icon.png')}
        style={{ position: 'absolute', bottom: 32, width: 24, height: 24, opacity: 0.5 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#002d24',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 999,
  },
  moon: {
    fontSize: 64,
    marginBottom: 8,
    textShadowColor: 'rgba(233,195,73,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  arabic: {
    fontFamily: 'Amiri', // assuming Amiri is available, otherwise system default
    fontSize: 42,
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
    fontWeight: '400',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 24,
  },
  english: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: 'rgba(154,236,213,0.8)',
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 64,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 60,
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bottomLabel: {
    fontFamily: 'Plus Jakarta Sans',
    position: 'absolute',
    bottom: 32,
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  }
});

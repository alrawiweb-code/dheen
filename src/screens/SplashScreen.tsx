import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../theme';

const { width, height } = Dimensions.get('window');
const ONBOARDING_DONE_KEY = '@dheen_onboarding_done';

export const SplashScreen = ({ navigation }: any) => {

  // Auto-skip onboarding if already completed previously
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DONE_KEY)
      .then((done) => {
        if (done === 'true') {
          navigation.replace('Root');
        }
      })
      .catch(() => {
        // Storage unavailable — show splash normally
      });
  }, []);

  const handleBegin = async () => {
    try {
      const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
      if (done === 'true') {
        navigation.replace('Root');
      } else {
        navigation.replace('Onboarding');
      }
    } catch (_) {
      navigation.replace('Onboarding');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary, Colors.background]}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative Background */}
      <View style={styles.decorativeContainer} pointerEvents="none">
        <View style={styles.glow} />
      </View>

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <MaterialIcons name="nightlight-round" size={100} color={Colors.accentLight} />
          <MaterialIcons name="star" size={24} color={Colors.accentLight} style={styles.starIcon} />
          <View style={styles.logoGlow} />
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Assalamu Alaikum</Text>
          <Text style={styles.subtitle}>Welcome to your space of peace</Text>
        </View>

        {/* Arabic */}
        <View style={styles.arabicContainer} pointerEvents="none">
          <Text style={styles.arabicText}>السَّلَامُ عَلَيْكُمْ</Text>
        </View>

        {/* CTA */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            id="splash-begin-btn"
            onPress={handleBegin}
            activeOpacity={0.7}
            style={styles.beginButton}
          >
            <Text style={styles.buttonText}>BEGIN JOURNEY</Text>
            <MaterialIcons name="arrow-forward-ios" size={14} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  decorativeContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width,
    backgroundColor: 'rgba(133, 214, 192, 0.1)',
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.25,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    zIndex: 10,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['4xl'],
    width: 128,
    height: 128,
  },
  starIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(233, 195, 73, 0.1)',
    zIndex: -1,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textWhite,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: Colors.accentLight,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  arabicContainer: {
    marginTop: Spacing['2xl'],
    opacity: 0.2,
  },
  arabicText: {
    fontFamily: 'ScheherazadeNew-Regular',
    fontSize: 36,
    color: Colors.textWhite,
  },
  actionContainer: {
    marginTop: 100,
  },
  beginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 10,
  },
  buttonText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
  },
});

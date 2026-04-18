import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { HapticButton } from '../components/HapticButton';

const { width, height } = Dimensions.get('window');

interface OnboardingFlowProps {
  onComplete: () => void;
}

const screens = [
  {
    id: 'a',
    bg: ['#0F6D5B', '#1A8A6A', '#2DA882'] as const,
    illustration: '🌅',
    heading: 'Stay connected with\nyour Deen, every day.',
    subtext: 'Salah. Quran. Reflection.\nAll in one peaceful space.',
    buttonLabel: 'Begin',
    buttonVariant: 'gold',
  },
  {
    id: 'b',
    bg: ['#F8F6F1', '#F0EAD8', '#E8DFC8'] as const,
    heading: 'Everything you need.',
    subtext: '',
    features: [
      { emoji: '🕌', label: 'Track your Salah' },
      { emoji: '📖', label: 'Read Quran daily' },
      { emoji: '💚', label: 'Reflect with Sukoon' },
    ],
    buttonLabel: 'Next',
    buttonVariant: 'green',
  },
  {
    id: 'c',
    bg: ['#0A1F17', '#0D2B1F', '#0F3D29'] as const,
    heading: 'This is your space.',
    subtext: 'No pressure. No judgement.\nJust peace.',
    buttonLabel: 'Enter App',
    buttonVariant: 'white',
  },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goNext = () => {
    if (currentIndex < screens.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      onComplete();
    }
  };

  const screen = screens[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={currentIndex === 1 ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />
      <LinearGradient colors={[...screen.bg]} style={StyleSheet.absoluteFill} />

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
        <Text style={[styles.skipText, { color: currentIndex === 1 ? Colors.textLight : 'rgba(255,255,255,0.6)' }]}>
          Skip
        </Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={screens}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={styles.slide}>
            {/* Illustration */}
            {item.illustration && (
              <Text style={styles.emoji}>{item.illustration}</Text>
            )}

            {/* Feature cards (screen B) */}
            {item.features && (
              <View style={styles.featuresContainer}>
                {item.features.map((f, i) => (
                  <View key={i} style={styles.featureCard}>
                    <Text style={styles.featureEmoji}>{f.emoji}</Text>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Text content */}
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.heading,
                  { color: index === 1 ? Colors.textDark : '#FFFFFF' },
                ]}
              >
                {item.heading}
              </Text>
              {item.subtext ? (
                <Text
                  style={[
                    styles.subtext,
                    {
                      color: index === 2 ? Colors.accent : index === 1 ? Colors.textLight : 'rgba(255,255,255,0.75)',
                      fontStyle: index === 2 ? 'italic' : 'normal',
                    },
                  ]}
                >
                  {item.subtext}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {screens.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex
                ? styles.dotActive
                : { backgroundColor: currentIndex === 1 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)' },
            ]}
          />
        ))}
      </View>

      {/* Button */}
      <HapticButton onPress={goNext} style={styles.btnWrapper} hapticType="medium">
        <LinearGradient
          colors={
            screen.buttonVariant === 'gold'
              ? ['#D4AF37', '#B8950A']
              : screen.buttonVariant === 'white'
              ? ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']
              : ['#0F6D5B', '#0A4A3A']
          }
          style={styles.btn}
        >
          <Text
            style={[
              styles.btnText,
              {
                color:
                  screen.buttonVariant === 'gold'
                    ? '#FFFFFF'
                    : screen.buttonVariant === 'white'
                    ? '#FFFFFF'
                    : '#FFFFFF',
              },
            ]}
          >
            {screen.buttonLabel}
          </Text>
        </LinearGradient>
      </HapticButton>

      <View style={{ height: 40 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 180,
  },
  emoji: {
    fontSize: 80,
    marginBottom: Spacing['2xl'],
  },
  featuresContainer: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,109,91,0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(15,109,91,0.12)',
  },
  featureEmoji: {
    fontSize: 28,
  },
  featureLabel: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  textContainer: {
    alignItems: 'center',
  },
  heading: {
    fontSize: 26,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: Spacing.md,
  },
  subtext: {
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  btnWrapper: {
    width: width - 64,
    marginBottom: Spacing.md,
  },
  btn: {
    borderRadius: BorderRadius.full,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },
});

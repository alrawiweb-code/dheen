import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, NativeSpacing as Spacing, Shadows, NiyyahPresets } from '../theme';
import { GradientCTA } from '../components/GradientCTA';
import { useAppStore } from '../store/useAppStore';

// Extract predefined presets or use the ones from theme
const PRESETS = ['For knowledge', 'For healing', 'For my family', 'For Allah alone'];

export const SetNiyyahScreen = ({ navigation }: any) => {
  const { setNiyyah } = useAppStore();
  const [selectedNiyyah, setSelectedNiyyah] = useState<string>('');
  const [customNiyyah, setCustomNiyyah] = useState<string>('');

  const handleSetNiyyah = () => {
    const finalNiyyah = customNiyyah.trim() || selectedNiyyah;
    if (finalNiyyah) {
      setNiyyah(finalNiyyah);
    }
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Ambient Background Glows */}
          <View style={styles.topRightGlow} />
          <View style={styles.bottomRightGlow} />
          <View style={styles.topLeftGlow} />

          {/* Decorative Gradient Component */}
          <LinearGradient
            colors={['rgba(212,175,55,0.05)', 'transparent']}
            style={[styles.decorativeImage, { opacity: 0.5 }]}
          />

          {/* Close Action */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={24} color={Colors.background} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.overhead}>INTENTIONALITY</Text>
              <Text style={styles.title}>
                Set Your{`\n`}
                <Text style={styles.highlight}>Niyyah</Text>
              </Text>
              <Text style={styles.subtitle}>
                Actions are judged by the intention behind them. Take a moment to align your heart.
              </Text>
            </View>

            {/* Presets */}
            <View style={styles.presetSection}>
              <Text style={styles.presetLabel}>SELECT AN INTENTION</Text>
              <View style={styles.presetGrid}>
                {PRESETS.map((preset) => {
                  const isSelected = selectedNiyyah === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetBadge, isSelected && styles.presetBadgeSelected]}
                      onPress={() => setSelectedNiyyah(preset)}
                    >
                      <Text
                        style={[styles.presetText, isSelected && styles.presetTextSelected]}
                      >
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Custom Input */}
            <View style={styles.inputSection}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Or type a custom intention..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  textAlignVertical="top"
                  value={customNiyyah}
                  onChangeText={(val) => {
                    setCustomNiyyah(val);
                    if (val.length > 0) setSelectedNiyyah(''); // Clear preset if typing custom
                  }}
                />
                <MaterialIcons
                  name="edit"
                  size={20}
                  color="rgba(255,255,255,0.2)"
                  style={styles.inputIcon}
                />
              </View>
            </View>

            {/* CTA */}
            <View style={styles.ctaWrapper}>
              <GradientCTA
                onPress={handleSetNiyyah}
                colors={['#735C00', '#5a4800']} // Secondary to darker gold
                style={styles.ctaButton}
              >
                <Text style={styles.ctaText}>Set Niyyah</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#241a00" />
              </GradientCTA>
              
              <Text style={styles.footerQuote}>
                "Verily, every man shall have but that which he intended."
              </Text>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1f17', // niyyahBg
  },
  inner: {flex: 1},
  topRightGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(154, 236, 213, 0.08)',
  },
  topLeftGlow: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(15, 109, 91, 0.1)',
  },
  bottomRightGlow: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(115, 92, 0, 0.05)',
  },
  decorativeImage: {
    position: 'absolute',
    width: 400,
    height: 400,
    right: -50,
    bottom: -50,
    transform: [{ rotate: '-15deg' }],
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  header: {
    marginBottom: 40,
  },
  overhead: {
    fontFamily: 'Plus Jakarta Sans',
    color: '#735C00', // secondary
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Plus Jakarta Sans',
    color: '#FBF9F4', // surface-bright
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 48,
    marginBottom: 16,
  },
  highlight: {
    color: '#ffe088', // secondary-fixed
  },
  subtitle: {
    fontFamily: 'Manrope',
    color: 'rgba(228, 226, 221, 0.7)',
    fontSize: 16,
    lineHeight: 24,
    paddingRight: 40,
  },
  presetSection: {
    marginBottom: 24,
  },
  presetLabel: {
    fontFamily: 'Plus Jakarta Sans',
    color: 'rgba(228, 226, 221, 0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetBadge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(190, 201, 196, 0.1)',
  },
  presetBadgeSelected: {
    backgroundColor: 'rgba(255, 224, 136, 0.1)',
    borderColor: 'rgba(255, 224, 136, 0.3)',
  },
  presetText: {
    fontFamily: 'Manrope',
    color: '#FBF9F4',
    fontSize: 14,
    fontWeight: '600',
  },
  presetTextSelected: {
    color: '#ffe088',
  },
  inputSection: {
    marginBottom: 32,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    color: '#FBF9F4',
    fontFamily: 'Manrope',
    fontSize: 16,
    minHeight: 120,
  },
  inputIcon: {
    position: 'absolute',
    bottom: 16,
    right: 24,
  },
  ctaWrapper: {
    alignItems: 'center',
    paddingTop: 24,
    marginBottom: 40,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 20,
  },
  ctaText: {
    color: '#241a00', // on-secondary-fixed
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  footerQuote: {
    fontFamily: 'Manrope',
    color: 'rgba(228, 226, 221, 0.3)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 24,
    letterSpacing: -0.5,
  },
});

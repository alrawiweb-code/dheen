import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, NiyyahPresets } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { HapticButton } from '../components/HapticButton';

const { width } = Dimensions.get('window');

interface NiyyahScreenProps {
  navigation: any;
}

export const NiyyahScreen: React.FC<NiyyahScreenProps> = ({ navigation }) => {
  const { setNiyyah, todayNiyyah } = useAppStore();
  const [selected, setSelected] = useState(todayNiyyah);
  const [custom, setCustom] = useState('');
  const [saved, setSaved] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const handleSave = () => {
    const finalNiyyah = custom || selected;
    if (!finalNiyyah) return;
    setNiyyah(finalNiyyah);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Show confirmation
    setSaved(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        navigation.goBack();
      });
    }, 1800);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#0D1F17', '#0A2E1A', '#0F3D25']}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars */}
      {[...Array(12)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              top: Math.random() * 300 + 60,
              left: Math.random() * width,
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              opacity: 0.3 + Math.random() * 0.5,
            },
          ]}
        />
      ))}

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹  Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.crescent}>☪</Text>
        <Text style={styles.heading}>Set Your Niyyah</Text>
        <Text style={styles.subheading}>What is your intention?</Text>

        {/* Preset pills */}
        <View style={styles.pillsGrid}>
          {NiyyahPresets.map((preset) => (
            <HapticButton
              key={preset}
              onPress={() => { setSelected(preset); setCustom(''); }}
              style={[
                styles.pill,
                selected === preset && styles.pillSelected,
              ]}
              hapticType="light"
            >
              <Text
                style={[
                  styles.pillText,
                  selected === preset && styles.pillTextSelected,
                ]}
              >
                {preset}
              </Text>
            </HapticButton>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or write your own</Text>
          <View style={styles.divider} />
        </View>

        {/* Custom input */}
        <TextInput
          style={styles.input}
          placeholder="My intention is..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={custom}
          onChangeText={(t) => { setCustom(t); setSelected(''); }}
          multiline
          maxLength={120}
        />

        {/* Save button */}
        <HapticButton onPress={handleSave} style={styles.saveBtn} hapticType="heavy">
          <LinearGradient
            colors={['#D4AF37', '#B8950A']}
            style={styles.saveBtnGradient}
          >
            <Text style={styles.saveBtnText}>Set Niyyah</Text>
          </LinearGradient>
        </HapticButton>

        {/* Confirmation */}
        <Animated.View style={[styles.confirmation, { opacity: fadeAnim }]}>
          <Text style={styles.confirmationText}>
            May Allah accept your intention. ✨
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F17' },
  star: { position: 'absolute', borderRadius: 99, backgroundColor: '#fff' },
  backBtn: { position: 'absolute', top: 60, left: Spacing.base, zIndex: 10, padding: 8 },
  backText: { fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.6)', fontWeight: Typography.weights.medium },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: Spacing.xl,
  },
  crescent: { fontSize: 48, marginBottom: Spacing.md },
  heading: { fontSize: 22, fontWeight: Typography.weights.bold, color: '#fff', marginBottom: 6 },
  subheading: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginBottom: Spacing.xl },
  pillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(212,175,55,0.15)',
  },
  pillText: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.7)' },
  pillTextSelected: { color: Colors.accent, fontWeight: Typography.weights.semibold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.base, width: '100%' },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.3)' },
  input: {
    width: '100%',
    minHeight: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    color: '#fff',
    fontSize: Typography.sizes.md,
    marginBottom: Spacing.xl,
    textAlignVertical: 'top',
  },
  saveBtn: { width: '100%', borderRadius: BorderRadius.full, overflow: 'hidden', marginBottom: Spacing.lg },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: BorderRadius.full },
  saveBtnText: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: '#fff', letterSpacing: 0.5 },
  confirmation: { position: 'absolute', bottom: 80 },
  confirmationText: { fontSize: Typography.sizes.md, color: Colors.accent, fontStyle: 'italic', textAlign: 'center' },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { HapticButton } from '../components/HapticButton';

const PRAISE_PRESETS = [
  'Bismillah ir-Rahman ir-Raheem',
  'Alhamdulillah, all praise belongs to You',
  'SubhanAllah, You are perfect',
  'Ya Allah, the Most Merciful',
];
const CLOSE_PRESETS = [
  'Ameen, Ya Rabb al-Alameen',
  'In gratitude for all that You have given',
  'Alhamdulillah for everything',
  'May You accept this dua. Ameen.',
];

interface DuaBuilderProps {
  navigation: any;
}

export const DuaBuilderScreen: React.FC<DuaBuilderProps> = ({ navigation }) => {
  const [praise, setPraise] = useState('');
  const [request, setRequest] = useState('');
  const [close, setClose] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!request.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => { setSaved(false); navigation.goBack(); }, 2000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#F8F6F1', '#FFFFFF']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>✦  Write Your Own Dua</Text>
          <Text style={styles.subtitle}>A guided 3-part supplication</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Part 1 */}
        <View style={styles.partCard}>
          <View style={styles.partHeader}>
            <View style={styles.partNum}><Text style={styles.partNumText}>1</Text></View>
            <View>
              <Text style={styles.partTitle}>Begin with Praise</Text>
              <Text style={styles.partSub}>Glorify Allah before your request</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
            {PRAISE_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPraise(p)}
                style={[styles.preset, praise === p && styles.presetSelected]}
              >
                <Text style={[styles.presetText, praise === p && { color: Colors.primary }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={styles.input}
            placeholder="Or write your own praise..."
            placeholderTextColor={Colors.textMuted}
            value={praise}
            onChangeText={setPraise}
            multiline
          />
        </View>

        {/* Divider arrow */}
        <View style={styles.arrow}><Text style={styles.arrowText}>↓</Text></View>

        {/* Part 2 */}
        <View style={[styles.partCard, styles.partCardMain]}>
          <View style={styles.partHeader}>
            <View style={[styles.partNum, { backgroundColor: Colors.primary }]}>
              <Text style={[styles.partNumText, { color: '#fff' }]}>2</Text>
            </View>
            <View>
              <Text style={styles.partTitle}>Your Request to Allah</Text>
              <Text style={styles.partSub}>Speak from your heart, freely</Text>
            </View>
          </View>
          <TextInput
            style={[styles.input, styles.inputLarge]}
            placeholder="O Allah, I ask of You..."
            placeholderTextColor={Colors.textMuted}
            value={request}
            onChangeText={setRequest}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Divider arrow */}
        <View style={styles.arrow}><Text style={styles.arrowText}>↓</Text></View>

        {/* Part 3 */}
        <View style={styles.partCard}>
          <View style={styles.partHeader}>
            <View style={styles.partNum}><Text style={styles.partNumText}>3</Text></View>
            <View>
              <Text style={styles.partTitle}>Close with Gratitude</Text>
              <Text style={styles.partSub}>End with thankfulness and Ameen</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
            {CLOSE_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setClose(p)}
                style={[styles.preset, close === p && styles.presetSelected]}
              >
                <Text style={[styles.presetText, close === p && { color: Colors.primary }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={styles.input}
            placeholder="Or write your own closing..."
            placeholderTextColor={Colors.textMuted}
            value={close}
            onChangeText={setClose}
            multiline
          />
        </View>

        {/* Preview */}
        {(praise || request || close) && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Your Dua</Text>
            {praise ? <Text style={styles.previewText}>{praise}</Text> : null}
            {request ? <Text style={[styles.previewText, { fontWeight: Typography.weights.semibold, color: Colors.primary }]}>{request}</Text> : null}
            {close ? <Text style={styles.previewText}>{close}</Text> : null}
          </View>
        )}

        {/* Save */}
        <HapticButton onPress={handleSave} style={[styles.saveBtn, !request.trim() && { opacity: 0.5 }]} hapticType="heavy">
          <LinearGradient
            colors={request.trim() ? ['#0F6D5B', '#0A4A3A'] : ['#ccc', '#bbb']}
            style={styles.saveBtnGradient}
          >
            <Text style={styles.saveBtnText}>{saved ? '✓ Dua Saved!' : 'Save My Dua'}</Text>
          </LinearGradient>
        </HapticButton>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 28, color: Colors.primary },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.accent },
  subtitle: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: 2 },
  content: { padding: Spacing.base },
  partCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  partCardMain: {
    borderColor: 'rgba(15,109,91,0.2)',
    borderWidth: 1.5,
    backgroundColor: '#F7FDF9',
  },
  partHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  partNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15,109,91,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,109,91,0.3)',
  },
  partNumText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.primary },
  partTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textDark },
  partSub: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: 2 },
  presets: { gap: Spacing.sm, paddingBottom: Spacing.md },
  preset: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  presetSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(15,109,91,0.06)' },
  presetText: { fontSize: Typography.sizes.sm, color: Colors.textLight },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.textDark,
    backgroundColor: 'rgba(0,0,0,0.02)',
    minHeight: 60,
  },
  inputLarge: { minHeight: 120, textAlignVertical: 'top' },
  arrow: { alignItems: 'center', paddingVertical: 6 },
  arrowText: { fontSize: 20, color: Colors.textMuted },
  previewCard: {
    backgroundColor: 'rgba(15,109,91,0.04)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(15,109,91,0.12)',
    gap: 8,
  },
  previewTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.accent, letterSpacing: 0.5, marginBottom: 4 },
  previewText: { fontSize: Typography.sizes.md, color: Colors.textDark, lineHeight: 24 },
  saveBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md },
  saveBtnGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: BorderRadius.lg },
  saveBtnText: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: '#fff' },
});

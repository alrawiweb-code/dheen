import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { DAILY_AYAHS } from '../services/quranApi';
import { useAppStore } from '../store/useAppStore';

const { height } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'ruhani';
  text: string;
  ayah?: { arabic: string; translation: string; reference: string };
  dua?: string;
  action?: string;
}

const RESPONSES: Record<string, Message> = {
  failing: {
    id: 'r1', role: 'ruhani',
    text: 'The very fact that you worry about your Deen is a sign of faith in your heart. Allah sees your effort, not just your perfection.',
    ayah: DAILY_AYAHS[2],
    dua: 'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا',
    action: 'Would you like to write how you feel in Sukoon?',
  },
  scared: {
    id: 'r2', role: 'ruhani',
    text: 'Fear is human — and Allah is the Most Compassionate. You are not alone in this moment.',
    ayah: DAILY_AYAHS[5],
    dua: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    action: 'Take a breath. Allah is always near.',
  },
  fajr: {
    id: 'r3', role: 'ruhani',
    text: "Allah's mercy is greater than our shortcomings. Missing Fajr doesn't define you — returning to Allah does.",
    dua: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ',
    action: 'Remember: every prayer is a fresh start. 🌅',
  },
  sad: {
    id: 'r4', role: 'ruhani',
    text: 'Your sadness is felt. Allah is closer to you than your jugular vein. Pour your heart out to Him.',
    ayah: DAILY_AYAHS[6],
    action: 'Would you like to write in Sukoon?',
  },
  default: {
    id: 'r5', role: 'ruhani',
    text: 'I am here with you. Ask me anything — from your heart, not your mind.',
    action: 'What is on your heart today?',
  },
};

function getRuhaniResponse(input: string): Message {
  const lower = input.toLowerCase();
  if (lower.includes('fail') || lower.includes('deen') || lower.includes('struggling')) return RESPONSES.failing;
  if (lower.includes('scar') || lower.includes('anxious') || lower.includes('worried') || lower.includes('tomorrow')) return RESPONSES.scared;
  if (lower.includes('fajr') || lower.includes('miss') || lower.includes('forgot')) return RESPONSES.fajr;
  if (lower.includes('sad') || lower.includes('cry') || lower.includes('hurt')) return RESPONSES.sad;
  return RESPONSES.default;
}

export const RuhaniOverlay: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'ruhani', text: 'Assalamu Alaikum. I am Ruhani — your spiritual companion. What is on your heart?' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { ayahOfMyLife } = useAppStore();
  const slideAnim = useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => {
      const response = getRuhaniResponse(userMsg.text);
      // Include Ayah of My Life if relevant
      const finalResponse = {
        ...response,
        id: Date.now().toString(),
        ayah: response.ayah ?? (ayahOfMyLife ? { arabic: ayahOfMyLife.arabic, translation: ayahOfMyLife.translation, reference: ayahOfMyLife.reference } : undefined),
      };
      setMessages((m) => [...m, finalResponse]);
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['#FAF6EE', '#F8F4E8', '#F5F0E0']} style={StyleSheet.absoluteFill} />

        {/* Handle */}
        <TouchableOpacity style={styles.handle} onPress={onClose}>
          <View style={styles.handleBar} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>☪</Text>
          </View>
          <View>
            <Text style={styles.ruhaniName}>Ruhani</Text>
            <Text style={styles.ruhaniStatus}>Your spiritual companion ✨</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.ruhaniBubble]}>
              {msg.role === 'ruhani' && (
                <View style={styles.ruhaniPrefix}>
                  <Text style={styles.ruhaniPrefixIcon}>☪</Text>
                </View>
              )}
              <View style={[styles.bubbleContent, msg.role === 'user' ? styles.userBubbleContent : styles.ruhaniBubbleContent]}>
                <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userBubbleText : styles.ruhaniBubbleText]}>
                  {msg.text}
                </Text>
                {msg.ayah && (
                  <View style={styles.ayahQuote}>
                    <Text style={styles.ayahQuoteArabic}>{msg.ayah.arabic}</Text>
                    <Text style={styles.ayahQuoteTranslation}>{msg.ayah.translation}</Text>
                    <Text style={styles.ayahQuoteRef}>{msg.ayah.reference}</Text>
                  </View>
                )}
                {msg.dua && (
                  <View style={styles.duaQuote}>
                    <Text style={styles.duaText}>{msg.dua}</Text>
                  </View>
                )}
                {msg.action && (
                  <Text style={styles.actionText}>{msg.action}</Text>
                )}
              </View>
            </View>
          ))}
          {typing && (
            <View style={[styles.bubble, styles.ruhaniBubble]}>
              <View style={styles.ruhaniPrefix}><Text style={styles.ruhaniPrefixIcon}>☪</Text></View>
              <View style={styles.typingIndicator}>
                <Text style={styles.typingDot}>•</Text>
                <Text style={styles.typingDot}> •</Text>
                <Text style={styles.typingDot}> •</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="What is on your heart..."
              placeholderTextColor="rgba(107,107,107,0.5)"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={300}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}>
              <LinearGradient colors={['#0F6D5B', '#0A4A3A']} style={styles.sendBtnGradient}>
                <Text style={styles.sendIcon}>↑</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>Ruhani does not issue fatwas. Always consult a scholar for rulings.</Text>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

// Floating trigger button
export const RuhaniFloatingButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <TouchableOpacity
      style={styles.floatingBtn}
      onPress={() => { onPress(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
      activeOpacity={0.85}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient colors={['#D4AF37', '#B8950A']} style={styles.floatingBtnGradient}>
          <Text style={styles.floatingBtnIcon}>☪</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.85,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  handle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,109,91,0.1)', borderWidth: 1.5, borderColor: 'rgba(15,109,91,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { fontSize: 22, color: Colors.primary },
  ruhaniName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textDark },
  ruhaniStatus: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  closeBtn: { marginLeft: 'auto', padding: 8 },
  closeText: { fontSize: 18, color: Colors.textMuted },
  messages: { flex: 1 },
  messagesContent: { padding: Spacing.base, gap: Spacing.md },
  bubble: { flexDirection: 'row', gap: Spacing.sm },
  userBubble: { justifyContent: 'flex-end' },
  ruhaniBubble: { justifyContent: 'flex-start' },
  ruhaniPrefix: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(15,109,91,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ruhaniPrefixIcon: { fontSize: 14, color: Colors.primary },
  bubbleContent: { maxWidth: '80%', borderRadius: BorderRadius.xl, padding: Spacing.md, gap: 6 },
  userBubbleContent: { backgroundColor: Colors.primary },
  ruhaniBubbleContent: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  bubbleText: { fontSize: Typography.sizes.md, lineHeight: 22 },
  userBubbleText: { color: '#fff' },
  ruhaniBubbleText: { color: Colors.textDark },
  ayahQuote: { backgroundColor: 'rgba(15,109,91,0.06)', borderRadius: BorderRadius.lg, padding: Spacing.sm, borderLeftWidth: 3, borderLeftColor: Colors.primary, gap: 4 },
  ayahQuoteArabic: { fontSize: 16, color: Colors.primary, textAlign: 'right' },
  ayahQuoteTranslation: { fontSize: Typography.sizes.sm, color: Colors.textLight, fontStyle: 'italic' },
  ayahQuoteRef: { fontSize: Typography.sizes.xs, color: Colors.accent },
  duaQuote: { backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: BorderRadius.lg, padding: Spacing.sm, borderLeftWidth: 3, borderLeftColor: Colors.accent },
  duaText: { fontSize: 16, color: Colors.accent, textAlign: 'right' },
  actionText: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontStyle: 'italic' },
  typingIndicator: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: BorderRadius.lg, padding: Spacing.md },
  typingDot: { fontSize: 20, color: Colors.textMuted, letterSpacing: 2 },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: Typography.sizes.md, color: Colors.textDark, maxHeight: 100, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  sendBtn: { justifyContent: 'flex-end' },
  sendBtnGradient: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontSize: 20, color: '#fff', fontWeight: Typography.weights.bold },
  disclaimer: { fontSize: 9, color: 'rgba(0,0,0,0.25)', textAlign: 'center', paddingTop: 4, paddingBottom: 8, paddingHorizontal: Spacing.xl },
  floatingBtn: { position: 'absolute', bottom: 90, right: 20, zIndex: 100 },
  floatingBtnGradient: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', ...Shadows.gold },
  floatingBtnIcon: { fontSize: 26, color: '#fff' },
});

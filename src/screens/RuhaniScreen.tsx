import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, NativeSpacing as Spacing, BorderRadius } from '../theme';

interface Message {
  id: string;
  role: 'user' | 'ruhani';
  text: string;
  label?: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    text: 'I feel like I am failing at my deen',
    label: 'Sincere Intention',
  },
  {
    id: '2',
    role: 'ruhani',
    text: "Allah's mercy is greater than our mistakes.\n\nThe very fact that you feel this concern is a sign of a living heart. The path is not a straight line, but a series of returns to Him.",
  },
];

export const RuhaniScreen = ({ navigation }: any) => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: input.trim() },
    ]);
    setInput('');
    // Scroll to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={styles.container}>
      {/* Decorative corner orbs */}
      <View style={styles.decorCorner1} />
      <View style={styles.decorCorner2} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="close" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerLabel}>RUHANI AI</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.quietMode}>Quiet Mode Active</Text>
            <View style={styles.quietDot} />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Ruhani Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow} />
              <View style={styles.avatarRing}>
                <MaterialIcons name="nights-stay" size={36} color={Colors.secondary} />
              </View>
            </View>

            {/* Messages */}
            <View style={styles.messageList}>
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <View key={msg.id} style={styles.userBubbleContainer}>
                    <View style={styles.userBubble}>
                      <Text style={styles.userBubbleText}>{msg.text}</Text>
                    </View>
                    {msg.label && (
                      <Text style={styles.messageMeta}>{msg.label}</Text>
                    )}
                  </View>
                ) : (
                  <View key={msg.id} style={styles.ruhaniBubbleContainer}>
                    <BlurView intensity={30} tint="light" style={styles.ruhaniBubble}>
                      <Text style={styles.ruhaniQuote}>{msg.text.split('\n\n')[0]}</Text>
                      {msg.text.split('\n\n')[1] && (
                        <Text style={styles.ruhaniBody}>{msg.text.split('\n\n')[1]}</Text>
                      )}
                      {/* Action buttons only on last ruhani message */}
                      {msg.id === INITIAL_MESSAGES[1].id && (
                        <View style={styles.ruhaniActions}>
                          <Text style={styles.ruhaniPrompt}>Would you like to write in Sukoon?</Text>
                          <View style={styles.ruhaniActionRow}>
                            <TouchableOpacity
                              style={styles.actionPrimary}
                              onPress={() => navigation.navigate('Sukoon')}
                            >
                              <Text style={styles.actionPrimaryText}>Yes, let's reflect</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionSecondary}>
                              <Text style={styles.actionSecondaryText}>Just listen</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </BlurView>
                  </View>
                )
              )}
            </View>

            {/* Ayah of My Life divider */}
            <View style={styles.ayahSection}>
              <Text style={styles.ayahLabel}>AYAH OF MY LIFE</Text>
              <Text style={styles.ayahArabic}>
                قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ
              </Text>
              <Text style={styles.ayahTranslation}>
                "Say, 'O My servants who have transgressed against themselves, do not despair of the mercy of Allah...'" (39:53)
              </Text>
              <TouchableOpacity style={styles.changeReflectionBtn}>
                <MaterialIcons name="auto-awesome" size={14} color={Colors.primary} />
                <Text style={styles.changeReflectionText}>CHANGE REFLECTION</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Input bar */}
          <View style={styles.inputBar}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="Speak your heart..."
                placeholderTextColor="rgba(27,28,25,0.3)"
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={sendMessage}
              >
                <MaterialIcons name="send" size={20} color="#9aecd5" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputDots}>
              <View style={[styles.dot, { opacity: 0.2 }]} />
              <View style={[styles.dot, { opacity: 0.4 }]} />
              <View style={[styles.dot, { opacity: 0.2 }]} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  decorCorner1: {
    position: 'absolute', top: -40, right: -40, width: 256, height: 256,
    borderRadius: 128, borderWidth: 1, borderColor: 'rgba(0,83,68,0.05)', zIndex: -1,
  },
  decorCorner2: {
    position: 'absolute', top: -64, right: -64, width: 256, height: 256,
    borderRadius: 128, borderWidth: 1, borderColor: 'rgba(0,83,68,0.03)', zIndex: -1,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    backgroundColor: 'rgba(251,249,244,0.8)',
    borderBottomWidth: 0,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05, shadowRadius: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f5f3ee', alignItems: 'center', justifyContent: 'center',
  },
  headerLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '800', color: Colors.secondary, letterSpacing: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quietMode: { fontFamily: 'Manrope', fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  quietDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.secondary, shadowColor: Colors.secondary, shadowOpacity: 0.4, shadowRadius: 4 },

  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing['2xl'], paddingBottom: Spacing.xl },

  avatarContainer: { alignItems: 'center', marginBottom: Spacing['2xl'], position: 'relative' },
  avatarGlow: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(115,92,0,0.1)', transform: [{ scale: 2.5 }], top: 0 },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#eae8e3', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16,
  },

  messageList: { gap: 40, marginBottom: Spacing['3xl'] },

  userBubbleContainer: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '85%', backgroundColor: '#f5f3ee',
    paddingHorizontal: 24, paddingVertical: 16,
    borderRadius: 24, borderTopRightRadius: 4,
  },
  userBubbleText: { fontFamily: 'Manrope', fontSize: 18, color: Colors.textDark, fontWeight: '500', lineHeight: 26 },
  messageMeta: { fontFamily: 'Manrope', fontSize: 10, color: 'rgba(27,28,25,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8, marginRight: 8 },

  ruhaniBubbleContainer: { alignItems: 'flex-start' },
  ruhaniBubble: {
    maxWidth: '90%',
    paddingHorizontal: 32, paddingVertical: 24,
    borderRadius: 32, borderTopLeftRadius: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  ruhaniQuote: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: Colors.primary, lineHeight: 28, marginBottom: 16 },
  ruhaniBody: { fontFamily: 'Manrope', fontSize: 18, color: '#3f4945', lineHeight: 28, marginBottom: 32, opacity: 0.9 },
  ruhaniActions: { gap: 12 },
  ruhaniPrompt: { fontFamily: 'Manrope', fontSize: 16, color: '#3f4945', fontStyle: 'italic', marginBottom: 12 },
  ruhaniActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionPrimary: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, shadowColor: Colors.primary, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  actionPrimaryText: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '700', color: '#fff' },
  actionSecondary: {
    backgroundColor: 'rgba(228,226,221,0.5)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  actionSecondaryText: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '700', color: Colors.primary },

  ayahSection: { paddingTop: 48, borderTopWidth: 1, borderColor: 'rgba(0,83,68,0.05)', alignItems: 'center' },
  ayahLabel: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: Colors.secondary, letterSpacing: 3, marginBottom: 16 },
  ayahArabic: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 20, color: Colors.primary, textAlign: 'center', lineHeight: 40, marginBottom: 16 },
  ayahTranslation: { fontFamily: 'Manrope', fontSize: 14, color: '#3f4945', fontStyle: 'italic', textAlign: 'center', maxWidth: 340, lineHeight: 22 },
  changeReflectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  changeReflectionText: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '800', color: Colors.primary, letterSpacing: 2 },

  inputBar: { paddingHorizontal: Spacing.xl, paddingBottom: 32, paddingTop: 16, alignItems: 'center', backgroundColor: Colors.background },
  inputWrapper: { width: '100%', maxWidth: 560, position: 'relative', marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  textInput: {
    flex: 1,
    backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 16, paddingLeft: 24, paddingRight: 56,
    fontFamily: 'Manrope', fontSize: 16, color: Colors.textDark,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
  },
  sendBtn: {
    position: 'absolute', right: 12,
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0f6d5b', alignItems: 'center', justifyContent: 'center',
  },
  inputDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary },
});

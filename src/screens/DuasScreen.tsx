import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, NativeSpacing as Spacing, BorderRadius, Shadows } from '../theme';
import { useAppStore } from '../store/useAppStore';

// ─── Storage key ─────────────────────────────────────────────────────────────
const PERSONAL_DUAS_KEY = 'dheen_personal_duas';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PersonalDua {
  id: string;
  title: string;
  text: string;
  createdAt: number; // epoch ms
}

// ─── Curated data ─────────────────────────────────────────────────────────────
const CATEGORIES = ['Morning', 'Evening', 'After Salah', 'Travel'];
const DUAS = [
  {
    id: '01',
    category: 'Morning',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ...',
    translation: '"We have reached the morning and at this very time unto Allah belongs all sovereignty..."',
    variant: 'default',
  },
  {
    id: '02',
    category: 'Morning',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ...',
    translation: '"In the Name of Allah with Whose Name there is protection against every kind of harm..."',
    variant: 'soft',
  },
  {
    id: '03',
    category: 'Evening',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا...',
    translation: '"Praise is to Allah Who gives us life after He has caused us to die..."',
    variant: 'outlined',
  },
  {
    id: '04',
    category: 'After Salah',
    arabic: 'سُبْحَانَ اللَّهِ (٣٣) وَالْحَمْدُ لِلَّهِ (٣٣) وَاللَّهُ أَكْبَرُ (٣٤)',
    translation: 'SubhanAllah 33 times, Alhamdulillah 33 times, Allahu Akbar 34 times.',
    variant: 'default',
  },
  {
    id: '05',
    category: 'Travel',
    arabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى',
    translation: '"O Allah, we ask You on this our journey for goodness and piety..."',
    variant: 'soft',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loadPersonalDuas(): Promise<PersonalDua[]> {
  try {
    const raw = await AsyncStorage.getItem(PERSONAL_DUAS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PersonalDua[];
  } catch {
    return [];
  }
}

async function savePersonalDuas(duas: PersonalDua[]): Promise<void> {
  await AsyncStorage.setItem(PERSONAL_DUAS_KEY, JSON.stringify(duas));
}

// ─── Component ────────────────────────────────────────────────────────────────
export const DuasScreen = ({ navigation }: any) => {
  const { profile } = useAppStore();

  // Curated list state
  const [activeCategory, setActiveCategory] = useState('Morning');
  const [searchQuery, setSearchQuery] = useState('');

  // Personal duas state
  const [personalDuas, setPersonalDuas] = useState<PersonalDua[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDua, setEditingDua] = useState<PersonalDua | null>(null);
  const [inputTitle, setInputTitle] = useState('');
  const [inputText, setInputText] = useState('');

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    loadPersonalDuas().then(setPersonalDuas);
  }, []);

  // ── Open modal for new dua ───────────────────────────────────────────────
  const openAddModal = useCallback(() => {
    setEditingDua(null);
    setInputTitle('');
    setInputText('');
    setModalVisible(true);
  }, []);

  // ── Open modal for editing ───────────────────────────────────────────────
  const openEditModal = useCallback((dua: PersonalDua) => {
    setEditingDua(dua);
    setInputTitle(dua.title);
    setInputText(dua.text);
    setModalVisible(true);
  }, []);

  // ── Save (add or update) ─────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) {
      Alert.alert('Empty Dua', 'Please write your dua before saving.');
      return;
    }

    let updated: PersonalDua[];

    if (editingDua) {
      // Update existing
      updated = personalDuas.map((d) =>
        d.id === editingDua.id
          ? { ...d, title: inputTitle.trim(), text: trimmedText }
          : d
      );
    } else {
      // Add new
      const newDua: PersonalDua = {
        id: Date.now().toString(),
        title: inputTitle.trim(),
        text: trimmedText,
        createdAt: Date.now(),
      };
      updated = [newDua, ...personalDuas];
    }

    setPersonalDuas(updated);
    await savePersonalDuas(updated);
    setModalVisible(false);
  }, [editingDua, inputTitle, inputText, personalDuas]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (dua: PersonalDua) => {
      Alert.alert(
        'Delete Dua',
        'Are you sure you want to delete this dua?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const updated = personalDuas.filter((d) => d.id !== dua.id);
              setPersonalDuas(updated);
              await savePersonalDuas(updated);
            },
          },
        ]
      );
    },
    [personalDuas]
  );

  // ── Format date ──────────────────────────────────────────────────────────
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ── Filtered curated duas ────────────────────────────────────────────────
  const filteredDuas = DUAS.filter((dua) => {
    const matchesCategory = dua.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      dua.arabic.includes(searchQuery) ||
      dua.translation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.name?.[0]?.toUpperCase() || 'A'}</Text>
          </View>
          <Text style={styles.dateText}>{profile?.name || 'Friend'}</Text>
        </View>
        <TouchableOpacity style={styles.headerRight}>
          <MaterialIcons name="brightness-5" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Page Title ──────────────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Supplications</Text>
          <Text style={styles.pageSubtitle}>Daily remembrance for spiritual peace</Text>
        </View>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search duas..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Categories ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesSection}
        >
          {CATEGORIES.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Write Your Own Card ─────────────────────────────────────── */}
        <TouchableOpacity style={styles.writeCard} activeOpacity={0.9} onPress={openAddModal}>
          <LinearGradient colors={[Colors.secondary, '#B58C00']} style={StyleSheet.absoluteFillObject} />
          <MaterialIcons name="edit-note" size={160} color="rgba(255,255,255,0.2)" style={styles.writeBgIcon} />
          <View style={styles.writeContent}>
            <View>
              <View style={styles.writeTitleRow}>
                <MaterialIcons name="auto-awesome" size={20} color="rgba(255,255,255,0.9)" />
                <Text style={styles.writeTitle}>✦ Write Your Own Dua</Text>
              </View>
              <Text style={styles.writeDesc}>Preserve your personal conversations with the Creator.</Text>
            </View>
            <View style={styles.addBtnContainer}>
              <BlurView intensity={20} tint="light" style={styles.addBtn}>
                <MaterialIcons name="add" size={24} color="#fff" />
              </BlurView>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── My Duas Section ─────────────────────────────────────────── */}
        {personalDuas.length > 0 && (
          <View style={styles.myDuasSection}>
            <Text style={styles.myDuasTitle}>MY DUAS</Text>
            <View style={styles.myDuasList}>
              {personalDuas.map((dua) => (
                <View key={dua.id} style={styles.personalDuaCard}>
                  <View style={styles.personalDuaHeader}>
                    <View style={styles.personalDuaHeaderLeft}>
                      <MaterialIcons name="favorite" size={16} color={Colors.secondary} />
                      <Text style={styles.personalDuaTitle} numberOfLines={1}>
                        {dua.title || 'Personal Dua'}
                      </Text>
                    </View>
                    <View style={styles.personalDuaActions}>
                      <TouchableOpacity onPress={() => openEditModal(dua)} style={styles.actionBtn}>
                        <MaterialIcons name="edit" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(dua)} style={styles.actionBtn}>
                        <MaterialIcons name="delete-outline" size={18} color="#D32F2F" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.personalDuaText}>{dua.text}</Text>
                  <Text style={styles.personalDuaDate}>{formatDate(dua.createdAt)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Empty state for My Duas ──────────────────────────────────── */}
        {personalDuas.length === 0 && (
          <View style={styles.emptyPersonal}>
            <MaterialIcons name="create" size={36} color="rgba(0,83,68,0.15)" />
            <Text style={styles.emptyPersonalText}>Start your personal conversation with Allah</Text>
            <TouchableOpacity style={styles.emptyPersonalBtn} onPress={openAddModal}>
              <Text style={styles.emptyPersonalBtnText}>Write a Dua</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Curated Dua Lists ────────────────────────────────────────── */}
        <Text style={[styles.myDuasTitle, { marginTop: Spacing['2xl'], marginBottom: Spacing.lg }]}>
          CURATED DUAS
        </Text>
        <View style={styles.duasList}>
          {filteredDuas.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <MaterialIcons name="auto-stories" size={48} color="rgba(0,83,68,0.2)" />
              <Text style={styles.noResultsTitle}>No duas found</Text>
              <Text style={styles.noResultsSub}>Check back later or write your own dua above.</Text>
            </View>
          ) : (
            filteredDuas.map((dua) => {
              const isSoft = dua.variant === 'soft';
              const isOutlined = dua.variant === 'outlined';
              return (
                <View
                  key={dua.id}
                  style={[styles.duaCard, isSoft && styles.duaCardSoft, isOutlined && styles.duaCardOutlined]}
                >
                  <View style={styles.duaHeader}>
                    <View style={styles.duaHeaderLeft}>
                      <View style={styles.duaBadge}>
                        <Text style={styles.duaBadgeText}>{dua.id}</Text>
                      </View>
                      <Text style={styles.duaCategoryText}>{dua.category}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.playBtn, isSoft && styles.playBtnSoft, isOutlined && styles.playBtnOutlined]}
                    >
                      <MaterialIcons name="play-arrow" size={24} color={isSoft ? Colors.primary : '#fff'} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.arabicText}>{dua.arabic}</Text>
                  <View style={styles.translationDivider} />
                  <Text style={styles.translationText}>{dua.translation}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Add / Edit Modal ────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingDua ? 'Edit Dua' : 'Write Your Dua'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Title field */}
            <Text style={styles.fieldLabel}>Title (Optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. For my family..."
              placeholderTextColor={Colors.textMuted}
              value={inputTitle}
              onChangeText={setInputTitle}
              maxLength={80}
            />

            {/* Dua text field */}
            <Text style={styles.fieldLabel}>Your Dua *</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextArea]}
              placeholder="Write your dua here…"
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient colors={[Colors.primary, '#0f6d5b']} style={StyleSheet.absoluteFillObject} />
                <Text style={styles.saveBtnText}>{editingDua ? 'Update' : 'Save Dua'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 249, 244, 0.8)',
    zIndex: 100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#eae8e3', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0,83,68,0.1)',
  },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.accent, letterSpacing: 1 },
  headerRight: { padding: 4 },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  titleSection: { marginBottom: Spacing['2xl'] },
  pageTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 36, fontWeight: '800', color: Colors.primary, letterSpacing: -1 },
  pageSubtitle: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, marginTop: 8, fontWeight: '500' },

  // ── Search ────────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(15,109,91,0.06)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(15,109,91,0.1)',
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark, fontFamily: 'Manrope' },

  // ── Categories ────────────────────────────────────────────────────────────
  categoriesSection: { marginHorizontal: -Spacing.xl, marginBottom: Spacing['2xl'] },
  categoriesContainer: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  categoryPill: {
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: BorderRadius.full, backgroundColor: '#f5f3ee',
    justifyContent: 'center', alignItems: 'center',
  },
  categoryPillActive: { backgroundColor: Colors.primary, ...Shadows.sm },
  categoryText: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '600', color: '#3f4945' },
  categoryTextActive: { color: '#fff', fontWeight: '700' },

  // ── Write Card ────────────────────────────────────────────────────────────
  writeCard: {
    borderRadius: 24, overflow: 'hidden', padding: Spacing.xl,
    marginBottom: Spacing['3xl'], ...Shadows.gold, height: 140, justifyContent: 'center',
  },
  writeBgIcon: { position: 'absolute', top: -20, right: -40, transform: [{ rotate: '12deg' }] },
  writeContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  writeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  writeTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: '#fff' },
  writeDesc: { fontFamily: 'Manrope', fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 220, lineHeight: 20 },
  addBtnContainer: { borderRadius: 16, overflow: 'hidden' },
  addBtn: { padding: 12 },

  // ── My Duas ───────────────────────────────────────────────────────────────
  myDuasSection: { marginBottom: Spacing['2xl'] },
  myDuasList: { gap: Spacing.lg },
  myDuasTitle: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '800',
    color: Colors.secondary, letterSpacing: 3, textTransform: 'uppercase',
    marginBottom: Spacing.lg, opacity: 0.7,
  },
  personalDuaCard: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: Spacing.xl, ...Shadows.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.secondary,
  },
  personalDuaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  personalDuaHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  personalDuaTitle: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700',
    color: Colors.textDark, flex: 1,
  },
  personalDuaActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  personalDuaText: {
    fontFamily: 'Manrope', fontSize: 15, color: '#3f4945',
    lineHeight: 24, marginBottom: 10,
  },
  personalDuaDate: {
    fontFamily: 'Manrope', fontSize: 11, color: Colors.textMuted,
    fontWeight: '600',
  },

  // ── Empty personal state ──────────────────────────────────────────────────
  emptyPersonal: {
    alignItems: 'center', paddingVertical: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  emptyPersonalText: {
    fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted,
    textAlign: 'center', marginTop: 10, marginBottom: 14, lineHeight: 20,
  },
  emptyPersonalBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.primary,
  },
  emptyPersonalBtnText: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: Colors.primary,
  },

  // ── Curated list ──────────────────────────────────────────────────────────
  noResultsTitle: { fontFamily: 'Plus Jakarta Sans', color: Colors.primary, fontWeight: '700', fontSize: 16, marginTop: 16 },
  noResultsSub: { fontFamily: 'Manrope', color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 4 },
  duasList: { gap: Spacing.xl },
  duaCard: { backgroundColor: '#fff', borderRadius: 24, padding: Spacing.xl, ...Shadows.sm },
  duaCardSoft: { backgroundColor: 'rgba(245, 243, 238, 0.5)', elevation: 0, shadowOpacity: 0 },
  duaCardOutlined: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,83,68,0.05)', elevation: 0, shadowOpacity: 0 },
  duaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  duaHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  duaBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,83,68,0.05)', alignItems: 'center', justifyContent: 'center' },
  duaBadgeText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: Colors.primary },
  duaCategoryText: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.green },
  playBtnSoft: { backgroundColor: '#eae8e3', shadowOpacity: 0, elevation: 0 },
  playBtnOutlined: { backgroundColor: Colors.primary },
  arabicText: { fontFamily: 'ScheherazadeNew-Regular', fontSize: 28, color: '#1B1C19', textAlign: 'right', lineHeight: 48, marginBottom: Spacing.lg },
  translationDivider: { height: 1, backgroundColor: '#eae8e3', marginBottom: Spacing.lg },
  translationText: { fontFamily: 'Manrope', fontSize: 14, color: '#3f4945', lineHeight: 24, fontStyle: 'italic' },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, paddingBottom: 48,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: '800', color: Colors.primary },
  fieldLabel: {
    fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '800',
    color: Colors.textMuted, letterSpacing: 2, textTransform: 'uppercase',
    marginBottom: 8, marginTop: Spacing.md,
  },
  fieldInput: {
    backgroundColor: '#f5f3ee', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontFamily: 'Manrope', fontSize: 15, color: Colors.textDark,
    borderWidth: 1, borderColor: 'rgba(0,83,68,0.08)',
  },
  fieldTextArea: { minHeight: 130, lineHeight: 24 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: Spacing['2xl'] },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(0,83,68,0.2)',
    alignItems: 'center',
  },
  cancelBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.primary },
  saveBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 14,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: '#fff' },
});

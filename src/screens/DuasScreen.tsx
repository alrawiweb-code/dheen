import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, NativeSpacing as Spacing, BorderRadius, Shadows } from '../theme';
import { useAppStore } from '../store/useAppStore';

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

export const DuasScreen = ({ navigation }: any) => {
  const { profile } = useAppStore();
  const [activeCategory, setActiveCategory] = useState('Morning');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      {/* Top Header */}
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
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Supplications</Text>
          <Text style={styles.pageSubtitle}>Daily remembrance for spiritual peace</Text>
        </View>

        <View style={{ 
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: 'rgba(15,109,91,0.06)', borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
          borderWidth: 1, borderColor: 'rgba(15,109,91,0.1)'
        }}>
          <MaterialIcons name="search" size={20} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search duas..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, fontSize: 14, color: Colors.textDark, fontFamily: 'Manrope' }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer} style={styles.categoriesSection}>
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

        {/* Write Your Own Card */}
        <TouchableOpacity style={styles.writeCard} activeOpacity={0.9}>
          <LinearGradient
            colors={[Colors.secondary, '#B58C00']} // Gold to darker gold
            style={StyleSheet.absoluteFillObject}
          />
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

        {/* Dua Lists */}
        <View style={styles.duasList}>
          {DUAS.filter(dua => {
            const matchesCategory = dua.category === activeCategory;
            const matchesSearch = searchQuery.trim() === '' ||
              dua.arabic.includes(searchQuery) ||
              dua.translation.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
          }).length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <MaterialIcons name="auto-stories" size={48} color="rgba(0,83,68,0.2)" />
              <Text style={{ fontFamily: 'Plus Jakarta Sans', color: Colors.primary, fontWeight: '700', fontSize: 16, marginTop: 16 }}>No duas found</Text>
              <Text style={{ fontFamily: 'Manrope', color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 4 }}>Check back later or write your own dua above.</Text>
            </View>
          ) : (
            DUAS.filter(dua => {
              const matchesCategory = dua.category === activeCategory;
              const matchesSearch = searchQuery.trim() === '' ||
                dua.arabic.includes(searchQuery) ||
                dua.translation.toLowerCase().includes(searchQuery.toLowerCase());
              return matchesCategory && matchesSearch;
            }).map((dua) => {
              const isSoft = dua.variant === 'soft';
              const isOutlined = dua.variant === 'outlined';

            return (
              <View
                key={dua.id}
                style={[
                  styles.duaCard,
                  isSoft && styles.duaCardSoft,
                  isOutlined && styles.duaCardOutlined,
                ]}
              >
                <View style={styles.duaHeader}>
                  <View style={styles.duaHeaderLeft}>
                    <View style={styles.duaBadge}>
                      <Text style={styles.duaBadgeText}>{dua.id}</Text>
                    </View>
                    <Text style={styles.duaCategoryText}>{dua.category}</Text>
                  </View>
                  <TouchableOpacity style={[
                    styles.playBtn, 
                    isSoft && styles.playBtnSoft,
                    isOutlined && styles.playBtnOutlined,
                  ]}>
                    <MaterialIcons 
                      name="play-arrow" 
                      size={24} 
                      color={isSoft ? Colors.primary : '#fff'} 
                    />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.arabicText}>{dua.arabic}</Text>
                
                <View style={styles.translationDivider} />
                <Text style={styles.translationText}>{dua.translation}</Text>
              </View>
            );
          }))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eae8e3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,83,68,0.1)',
  },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.accent, letterSpacing: 1 },
  headerRight: { padding: 4 },
  
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  titleSection: { marginBottom: Spacing['2xl'] },
  pageTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 36, fontWeight: '800', color: Colors.primary, letterSpacing: -1 },
  pageSubtitle: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, marginTop: 8, fontWeight: '500' },
  
  categoriesSection: { marginHorizontal: -Spacing.xl, marginBottom: Spacing['2xl'] },
  categoriesContainer: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  categoryPill: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: '#f5f3ee', // surface-container-low
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  categoryText: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '600', color: '#3f4945' },
  categoryTextActive: { color: '#fff', fontWeight: '700' },

  writeCard: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: Spacing.xl,
    marginBottom: Spacing['3xl'],
    ...Shadows.gold,
    height: 140,
    justifyContent: 'center',
  },
  writeBgIcon: {
    position: 'absolute',
    top: -20,
    right: -40,
    transform: [{ rotate: '12deg' }],
  },
  writeContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  writeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  writeTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: '#fff' },
  writeDesc: { fontFamily: 'Manrope', fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 220, lineHeight: 20 },
  addBtnContainer: { borderRadius: 16, overflow: 'hidden' },
  addBtn: { padding: 12 },

  duasList: { gap: Spacing.xl },
  duaCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: Spacing.xl,
    ...Shadows.sm,
  },
  duaCardSoft: {
    backgroundColor: 'rgba(245, 243, 238, 0.5)',
    elevation: 0,
    shadowOpacity: 0,
  },
  duaCardOutlined: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,83,68,0.05)',
    elevation: 0,
    shadowOpacity: 0,
  },
  duaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  duaHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  duaBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,83,68,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaBadgeText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: Colors.primary },
  duaCategoryText: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.green,
  },
  playBtnSoft: {
    backgroundColor: '#eae8e3',
    shadowOpacity: 0,
    elevation: 0,
  },
  playBtnOutlined: {
    backgroundColor: Colors.primary,
  },
  arabicText: {
    fontFamily: 'ScheherazadeNew-Regular',
    fontSize: 28,
    color: '#1B1C19',
    textAlign: 'right',
    lineHeight: 48,
    marginBottom: Spacing.lg,
  },
  translationDivider: {
    height: 1,
    backgroundColor: '#eae8e3',
    marginBottom: Spacing.lg,
  },
  translationText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#3f4945',
    lineHeight: 24,
    fontStyle: 'italic',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, NativeSpacing as Spacing, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';

const PAST_REFLECTIONS = [
  {
    day: '12',
    month: 'Shawwal 1446',
    text: 'Grateful for the morning sun that filtered through the masjid windows during Fajr. It felt like a warm embrace...',
    color: '#d2e8da', // tertiary-fixed
    textColor: '#0d1f17',
  },
  {
    day: '10',
    month: 'Shawwal 1446',
    text: 'Finding peace in the silence of Dhikr after Maghrib. The world slows down when we remember Him.',
    color: '#ffe088', // secondary-fixed
    textColor: '#241a00',
  },
  {
    day: '08',
    month: 'Shawwal 1446',
    text: "Reflecting on the verse 'Indeed, with hardship comes ease'. A conversation with a friend brought clarity to a struggle.",
    color: '#a1f2db', // primary-fixed
    textColor: '#002019',
  },
];

export const SukoonScreen = ({ navigation }: any) => {
  const { profile } = useAppStore();

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBldSsIdZGsTtgCopWv5OaNPPzuvz9BJnHjnvxKJ20kmEZ9E9oAqtXiIi6HGi9ZRWKyA0chT5HX0508nT1W3NXdj-qXh3k6npTpnRX-LKP8dp1TWsLy0skCzQUOn48xZKVqvUzjm9G6pnNo1djzGltLtEeL72r6zTcj1bZ-X6nx3WRJIJ2Q2P-T0Moo0JjTDf6XBIZ5JI2Y85w_wiBxL2a5FMLMdbwudcht1PH0TMeW2J2ek5LfWK-0Mq68EPqcWTrsFMNia-HMueeH' }} 
              style={StyleSheet.absoluteFillObject} 
            />
          </View>
          <Text style={styles.dateText}>14 Shawwal 1446</Text>
        </View>
        <TouchableOpacity>
          <MaterialIcons name="brightness-5" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Sukoon</Text>
          <Text style={styles.pageSubtitle}>Find stillness in the presence of the Divine</Text>
        </View>

        {/* Daily Prompt Card */}
        <View style={styles.promptCardWrapper}>
          <View style={styles.promptCard}>
            <View style={styles.promptHeader}>
              <MaterialIcons name="history-edu" size={16} color={Colors.secondary} />
              <Text style={styles.promptLabel}>DAILY PROMPT</Text>
            </View>
            <Text style={styles.promptQuestion}>
              What has Allah placed in your heart today that brings quiet joy?
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="Begin your reflection..."
                placeholderTextColor="rgba(111,121,117,0.7)"
                textAlignVertical="top"
              />
              <TouchableOpacity style={styles.micBtn}>
                <MaterialIcons name="mic" size={24} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={[Colors.primary, '#0f6d5b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.saveBtnText}>Save Reflection</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Spiritual Seeds Section */}
        <View style={styles.seedsSection}>
          <View style={styles.seedsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Spiritual Seeds</Text>
              <Text style={styles.sectionSubtitle}>Your garden of past reflections</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.seedsList}>
            {PAST_REFLECTIONS.map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.seedItem} activeOpacity={0.7}>
                <View style={[styles.seedDateBox, { backgroundColor: item.color }]}>
                  <Text style={[styles.seedDateText, { color: item.textColor }]}>{item.day}</Text>
                </View>
                <View style={styles.seedContent}>
                  <Text style={styles.seedMonthText}>{item.month}</Text>
                  <Text style={styles.seedDescText} numberOfLines={2}>{item.text}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Ruhani Button */}
      <TouchableOpacity style={styles.fab}>
        <LinearGradient 
          colors={[Colors.primary, '#0f6d5b']} 
          style={StyleSheet.absoluteFillObject} 
        />
        <MaterialIcons name="auto-awesome" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 240, 232, 0.8)',
    zIndex: 100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { marginRight: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3', overflow: 'hidden' },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.secondary, letterSpacing: 1, textTransform: 'uppercase' },
  
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },

  titleSection: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  pageTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 36, fontWeight: '800', color: Colors.primary, letterSpacing: -1, marginBottom: 8 },
  pageSubtitle: { fontFamily: 'Manrope', fontSize: 18, color: '#52655b', fontStyle: 'italic', fontWeight: '500', textAlign: 'center' },

  promptCardWrapper: { marginBottom: Spacing['3xl'] },
  promptCard: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 32,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  promptHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  promptLabel: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: Colors.secondary, letterSpacing: 2 },
  promptQuestion: { fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: '800', color: Colors.textDark, lineHeight: 32, marginBottom: 24 },
  
  inputContainer: { position: 'relative', marginBottom: 24 },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 24,
    minHeight: 180,
    padding: 24,
    paddingBottom: 60, // Make room for mic button
    fontFamily: 'Manrope',
    fontSize: 18,
    color: Colors.textDark,
  },
  micBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fed65b',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveBtn: {
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  saveBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: '#fff' },

  seedsSection: { marginBottom: Spacing.xl },
  seedsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.xl },
  sectionTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  sectionSubtitle: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  viewAllText: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '700', color: Colors.secondary, letterSpacing: -0.5 },

  seedsList: { gap: 16 },
  seedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 243, 238, 0.5)',
  },
  seedDateBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedDateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '800' },
  seedContent: { flex: 1 },
  seedMonthText: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  seedDescText: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '600', color: Colors.textDark, lineHeight: 20 },

  fab: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, NativeSpacing as Spacing, Shadows, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { GradientCTA } from '../components/GradientCTA';

const MOOD_COLORS: Record<string, string> = {
  connected: Colors.primary,
  present: Colors.secondary,
  distracted: Colors.prayerMissed,
  rushed: Colors.prayerMissed,
  emotional: Colors.primary,
};

const BASE_MOODS = [
  'rgba(0,83,68,0.2)', 'rgba(0,83,68,0.4)', 'rgba(0,83,68,0.8)', 'rgba(186,26,26,0.3)',
  'rgba(0,83,68,0.6)', 'rgba(115,92,0,0.4)', 'rgba(0,83,68,0.9)', 'rgba(0,83,68,0.5)',
  'rgba(0,83,68,0.7)', 'rgba(186,26,26,0.2)', 'rgba(0,83,68,0.9)', 'rgba(115,92,0,0.6)',
  'rgba(0,83,68,0.1)', 'rgba(0,83,68,0.4)', 'rgba(0,83,68,0.8)', 'rgba(0,83,68,0.6)',
  'rgba(115,92,0,0.3)', 'rgba(186,26,26,0.4)', 'rgba(0,83,68,0.9)', 'rgba(0,83,68,0.5)',
  'rgba(0,83,68,0.7)', 'rgba(0,83,68,0.2)', 'rgba(0,83,68,0.9)',
];

export const ProfileScreen = ({ navigation }: any) => {
  const { profile, milestones, prayerMoods, todayNiyyah } = useAppStore();

  const totalPrayers = milestones.fajrCount + milestones.tahajjudCount; // Simplified heuristic
  const sukoonEntries = milestones.sukoonCount;

  const FAJR_TARGET = 20;
  const STREAK_TARGET = 10;
  const fajrProgress = Math.min(milestones.fajrCount / FAJR_TARGET, 1);
  const streakProgress = Math.min(milestones.streakDays / STREAK_TARGET, 1);

  // Insert today's recorded moods
  const todayMoodKeys = Object.values(prayerMoods).filter(Boolean);
  const trailingMoods = todayMoodKeys.map(k => MOOD_COLORS[k as keyof typeof MOOD_COLORS] || 'rgba(0,83,68,0.2)');
  const renderedMoods = [...trailingMoods].slice(-30);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
             <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>{profile.name?.[0]?.toUpperCase() || 'A'}</Text>
          </View>
          <Text style={styles.dateText}>{profile.name || 'Abdullah'}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.premiumText}>ETHEREAL</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Your Deen journey</Text>
          <Text style={styles.heroSubtitle}>Reflecting on your spiritual growth and intentional practices.</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statCardLeft}>
              <Text style={styles.statLabelLeft}>TOTAL PRAYERS</Text>
              <Text style={styles.statNumberLeft}>{totalPrayers}</Text>
            </View>
            <View style={styles.statCardRight}>
              <Text style={styles.statLabelRight}>SUKOON ENTRIES</Text>
              <Text style={styles.statNumberRight}>{sukoonEntries}</Text>
            </View>
          </View>
        </View>

        {/* Prayer Mood Map */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prayer Mood Map</Text>
            <Text style={styles.sectionLabel}>Last 30 Days</Text>
          </View>
          <View style={styles.moodMapCard}>
            {renderedMoods.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <MaterialIcons name="grid-on" size={32} color="rgba(0,83,68,0.2)" />
                <Text style={{ fontFamily: 'Plus Jakarta Sans', color: Colors.primary, fontWeight: '700', fontSize: 14, marginTop: 12 }}>Your prayer mood map will build here</Text>
                <Text style={{ fontFamily: 'Manrope', color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Log your salah to visualize your spiritual pattern.</Text>
              </View>
            ) : (
              <>
                <View style={styles.moodGrid}>
                  {renderedMoods.map((color, i) => (
                    <View key={i} style={[styles.moodCell, { backgroundColor: color }]} />
                  ))}
                </View>
                <View style={styles.moodLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                    <Text style={styles.legendText}>FOCUSED</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.secondary }]} />
                    <Text style={styles.legendText}>CONTENT</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.prayerMissed }]} />
                    <Text style={styles.legendText}>DISTRACTED</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Intentions This Week */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Intentions This Week</Text>
          <View style={styles.intentionList}>
            {todayNiyyah ? (
              <View style={[styles.intentionCard, { backgroundColor: 'rgba(15,109,91,0.05)', borderRadius: 20, padding: 20 }]}>
                <View style={styles.intentionIconWudu}>
                  <MaterialIcons name="emoji-objects" size={20} color={Colors.primary} />
                </View>
                <View style={styles.intentionContent}>
                  <Text style={styles.intentionTitle}>{todayNiyyah}</Text>
                  <Text style={{ fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>Today's intention</Text>
                </View>
              </View>
            ) : (
              <View style={{ padding: 30, backgroundColor: 'rgba(15,109,91,0.05)', borderRadius: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🧭</Text>
                <Text style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.primary }}>No active intentions</Text>
                <Text style={{ fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 4 }}>Set an intention from the Home Screen to build a meaningful habit.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Spiritual Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spiritual Milestones</Text>
          <View style={styles.milestonesGrid}>
            <View style={styles.milestoneCardSmall}>
              <MaterialIcons name="wb-twilight" size={28} color={Colors.primary} style={styles.milestoneIcon} />
              <View>
                <Text style={styles.milestoneTitle}>Early Riser</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { backgroundColor: Colors.primary, width: `${Math.round(fajrProgress * 100)}%` }]} />
                </View>
                <Text style={styles.milestoneProgressText}>{milestones.fajrCount}/{FAJR_TARGET} Fajr</Text>
              </View>
            </View>

            <View style={styles.milestoneCardSmall}>
              <MaterialIcons name="anchor" size={28} color={Colors.secondary} style={styles.milestoneIcon} />
              <View>
                <Text style={styles.milestoneTitle}>Anchor Found</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { backgroundColor: Colors.secondary, width: `${Math.round(streakProgress * 100)}%` }]} />
                </View>
                <Text style={styles.milestoneProgressText}>{milestones.streakDays}/{STREAK_TARGET} Day Streak</Text>
              </View>
            </View>

            <View style={styles.milestoneCardLarge}>
              <MaterialIcons name="campaign" size={36} color="rgba(255,255,255,0.8)" />
              <View style={styles.inProgressBadge}>
                <Text style={styles.inProgressText}>IN PROGRESS</Text>
              </View>
              <View style={styles.milestoneLargeContent}>
                <Text style={styles.milestoneLargeTitle}>Muadhin</Text>
                <Text style={styles.milestoneLargeSub}>Calling the family to prayer</Text>
              </View>
              <View style={styles.milestoneLargeGlow} />
            </View>
          </View>
        </View>

        {/* Zakat Calculator */}
        <View style={styles.zakatSection}>
          <View style={styles.zakatHeaderRow}>
            <MaterialIcons name="calculate" size={24} color={Colors.secondary} />
            <Text style={styles.zakatTitle}>Zakat Calculator</Text>
          </View>
          <Text style={styles.zakatDesc}>Purify your wealth by calculating your mandatory charity contribution.</Text>
          <GradientCTA 
            onPress={() => {
              Alert.alert(
                'Zakat Calculator',
                'Zakat is due on wealth held for one lunar year above the nisab (minimum threshold). The current gold nisab is approximately 85g of gold. Zakat rate is 2.5% of total eligible wealth.\n\nFor a full calculation, visit an Islamic finance resource.',
                [{ text: 'Understood', style: 'default' }]
              );
            }} 
            title="Calculate Now" 
            colors={[Colors.secondary, '#5a4800']} 
            style={styles.zakatBtn} 
          />
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
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  premiumText: { color: Colors.secondary, fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },

  heroSection: { marginBottom: Spacing['3xl'] },
  heroTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 36, fontWeight: '800', color: Colors.primary, marginBottom: 8 },
  heroSubtitle: { fontFamily: 'Manrope', fontSize: 16, color: Colors.textMuted, maxWidth: 280 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: Spacing.xl },
  statCardLeft: {
    flex: 1,
    backgroundColor: '#f5f3ee', // surface-container-low
    padding: Spacing.xl,
    borderRadius: 20,
    justifyContent: 'space-between',
    height: 128,
  },
  statCardRight: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    borderRadius: 20,
    justifyContent: 'space-between',
    height: 128,
    ...Shadows.green,
  },
  statLabelLeft: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 2 },
  statNumberLeft: { fontFamily: 'Plus Jakarta Sans', fontSize: 30, fontWeight: '700', color: Colors.textDark },
  statLabelRight: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: '#9aecd5', letterSpacing: 2 },
  statNumberRight: { fontFamily: 'Plus Jakarta Sans', fontSize: 30, fontWeight: '700', color: '#fff' },

  section: { marginBottom: Spacing['3xl'] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.lg },
  sectionTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.lg },
  sectionLabel: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted },

  moodMapCard: {
    backgroundColor: '#fff',
    padding: Spacing.xl,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodCell: { width: 36, height: 36, borderRadius: 6 },
  moodLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: Spacing.xl },
  legendItem: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },

  intentionList: { gap: 16 },
  intentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f5f3ee',
    padding: Spacing.lg,
    borderRadius: 16,
  },
  intentionIconWudu: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,83,68,0.1)', alignItems: 'center', justifyContent: 'center' },
  intentionIconCharity: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(115,92,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  intentionContent: { flex: 1 },
  intentionTitle: { fontFamily: 'Manrope', fontSize: 14, fontWeight: '700', color: Colors.textDark },
  intentionStatus: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted },

  milestonesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  milestoneCardSmall: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#eae8e3',
    padding: Spacing.xl,
    borderRadius: 20,
    justifyContent: 'space-between',
    gap: 16,
  },
  milestoneIcon: { marginBottom: 8 },
  milestoneTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: Colors.textDark },
  progressBarBg: { height: 6, width: '100%', backgroundColor: 'rgba(111,121,117,0.3)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  milestoneProgressText: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginTop: 8 },
  
  milestoneCardLarge: {
    width: '100%',
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    height: 140,
    justifyContent: 'space-between',
  },
  inProgressBadge: { position: 'absolute', top: 24, right: 24, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  inProgressText: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: '#fff' },
  milestoneLargeContent: { zIndex: 10 },
  milestoneLargeTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: '800', color: '#fff' },
  milestoneLargeSub: { fontFamily: 'Manrope', fontSize: 14, color: '#9aecd5', marginTop: 4 },
  milestoneLargeGlow: { position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },

  zakatSection: { backgroundColor: 'rgba(115,92,0,0.05)', padding: Spacing.xl, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(115,92,0,0.1)', marginBottom: Spacing.xl },
  zakatHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  zakatTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.secondary },
  zakatDesc: { fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.xl },
  zakatBtn: { width: '100%' },
});

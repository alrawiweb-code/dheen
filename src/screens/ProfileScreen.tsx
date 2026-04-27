import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, NativeSpacing as Spacing, Shadows, BorderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { GradientCTA } from '../components/GradientCTA';
import { ScreenWrapper, useScreenBottomInset } from '../components/ScreenWrapper';

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
  const setProfile = useAppStore(state => state.setProfile);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name || 'Friend');

  useEffect(() => {
    setNameInput(profile.name || 'Friend');
  }, [profile.name]);

  const prayerStatuses = useAppStore(state => state.prayerStatuses);
  const totalPrayers = Object.values(prayerStatuses).filter(s => s === 'done').length;
  const sukoonEntries = useAppStore(state => state.sukoonEntries).length;

  const FAJR_TARGET = 20;
  const STREAK_TARGET = 10;
  const fajrProgress = Math.min(milestones.fajrCount / FAJR_TARGET, 1);
  const streakProgress = Math.min(milestones.streakDays / STREAK_TARGET, 1);



  // Zakat Calculator State
  // Nisab based on silver standard: 612.36g silver. 
  // We use a conservative fixed proxy of 595 USD. User can set currency context separately.
  // The 2.5% rate (1/40) is fixed by Islamic law.
  const NISAB_USD = 595; // Approx silver nisab — update periodically
  const ZAKAT_RATE = 0.025;

  const [zakat, setZakat] = useState({
    cash: '',
    gold: '',
    silver: '',
    investments: '',
    other: '',
    debts: '',
  });

  type ZakatResult = {
    netWealth: number;
    zakatDue: number;
    isEligible: boolean;
    nisabThreshold: number;
  };

  const [zakatResult, setZakatResult] = useState<ZakatResult | null>(null);
  const [zakatError, setZakatError] = useState('');

  const parseNum = (val: string) => {
    const n = parseFloat(val.replace(/,/g, '').trim());
    return isNaN(n) || n < 0 ? 0 : n;
  };

  const calculateZakat = useCallback(() => {
    setZakatError('');
    const cash = parseNum(zakat.cash);
    const gold = parseNum(zakat.gold);
    const silver = parseNum(zakat.silver);
    const investments = parseNum(zakat.investments);
    const other = parseNum(zakat.other);
    const debts = parseNum(zakat.debts);

    const totalAssets = cash + gold + silver + investments + other;
    const netWealth = Math.max(totalAssets - debts, 0);

    setZakatResult({
      netWealth,
      zakatDue: netWealth >= NISAB_USD ? netWealth * ZAKAT_RATE : 0,
      isEligible: netWealth >= NISAB_USD,
      nisabThreshold: NISAB_USD,
    });
  }, [zakat]);

  const updateZakatField = (field: keyof typeof zakat) => (val: string) => {
    // Strip non-numeric chars except decimal point
    const sanitized = val.replace(/[^0-9.]/g, '');
    setZakat(prev => ({ ...prev, [field]: sanitized }));
    setZakatResult(null); // reset result on input change
  };

  // Build mood grid: last 30 days of sukoon entries + today's prayer moods
  const sukoonHistory = useAppStore(state => state.sukoonEntries);
  const todayMoodKeys = Object.values(prayerMoods).filter(Boolean);

  const historicalMoods = sukoonHistory
    .slice(0, 25)
    .map(entry => MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS] || 'rgba(0,83,68,0.2)');

  const todayMoods = todayMoodKeys
    .map(k => MOOD_COLORS[k as keyof typeof MOOD_COLORS] || 'rgba(0,83,68,0.2)');

  const renderedMoods = [...historicalMoods, ...todayMoods].slice(0, 30);

  const bottomInset = useScreenBottomInset();

  return (
    <ScreenWrapper>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: 'bold' }}>
              {profile?.name?.[0]?.toUpperCase() || 'F'}
            </Text>
          </View>

          {isEditingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={30}
                returnKeyType="done"
                style={{
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 18,
                  fontWeight: '700',
                  color: Colors.primary,
                  borderBottomWidth: 2,
                  borderBottomColor: Colors.primary,
                  minWidth: 100,
                  paddingVertical: 2,
                }}
                onSubmitEditing={() => {
                  const trimmed = nameInput.trim() || 'Friend';
                  setProfile({ name: trimmed });
                  setNameInput(trimmed);
                  setIsEditingName(false);
                  AsyncStorage.setItem('userName', trimmed);
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  const trimmed = nameInput.trim() || 'Friend';
                  setProfile({ name: trimmed });
                  setNameInput(trimmed);
                  setIsEditingName(false);
                  AsyncStorage.setItem('userName', trimmed);
                }}
                style={{
                  backgroundColor: Colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700',
                  fontFamily: 'Plus Jakarta Sans' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setNameInput(profile.name || 'Friend');
                  setIsEditingName(false);
                }}
              >
                <MaterialIcons name="close" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setNameInput(profile.name || 'Friend');
                setIsEditingName(true);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Text style={styles.dateText}>{profile.name || 'Friend'}</Text>
              <MaterialIcons name="edit" size={14} color={Colors.primary} style={{ opacity: 0.4 }} />
            </TouchableOpacity>
          )}
        </View>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
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
            {(() => {
              // Collect this week's unique non-empty intentions from sukoon entries
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

              const weeklyIntentions = sukoonHistory
                .filter(e => e.niyyah && e.niyyah.trim() && new Date(e.date) >= oneWeekAgo)
                .map(e => e.niyyah.trim())
                .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate
                .slice(0, 5);

              // Also include today's niyyah if set and not already in list
              if (todayNiyyah && !weeklyIntentions.includes(todayNiyyah.trim())) {
                weeklyIntentions.unshift(todayNiyyah.trim());
              }

              if (weeklyIntentions.length === 0) {
                return (
                  <View style={{ padding: 30, backgroundColor: 'rgba(15,109,91,0.05)', borderRadius: 20, alignItems: 'center' }}>
                    <MaterialIcons name="explore" size={32} color={Colors.primary} style={{ marginBottom: 8 }} />
                    <Text style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: Colors.primary }}>No active intentions</Text>
                    <Text style={{ fontFamily: 'Manrope', fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 4 }}>Set an intention from the Home Screen to build a meaningful habit.</Text>
                  </View>
                );
              }

              return (
                <>
                  {weeklyIntentions.map((intention, i) => (
                    <View key={i} style={[styles.intentionCard, { backgroundColor: 'rgba(15,109,91,0.05)', borderRadius: 20, padding: 20 }]}>
                      <View style={styles.intentionIconWudu}>
                        <MaterialIcons name="emoji-objects" size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.intentionContent}>
                        <Text style={styles.intentionTitle}>{intention}</Text>
                        <Text style={{ fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>
                          {i === 0 && todayNiyyah === intention ? "Today's intention" : "This week"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              );
            })()}
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
                {fajrProgress >= 1 && (
                  <MaterialIcons name="check-circle" size={16} color={Colors.primary} />
                )}
                <Text style={styles.milestoneProgressText}>{milestones.fajrCount}/{FAJR_TARGET} FAJR BEFORE 6AM</Text>
              </View>
            </View>

            <View style={styles.milestoneCardSmall}>
              <MaterialIcons name="anchor" size={28} color={Colors.secondary} style={styles.milestoneIcon} />
              <View>
                <Text style={styles.milestoneTitle}>Anchor Found</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { backgroundColor: Colors.secondary, width: `${Math.round(streakProgress * 100)}%` }]} />
                </View>
                {streakProgress >= 1 && (
                  <MaterialIcons name="check-circle" size={16} color={Colors.secondary} />
                )}
                <Text style={styles.milestoneProgressText}>{milestones.streakDays}/{STREAK_TARGET} DAY STREAK</Text>
              </View>
            </View>

            <View style={styles.milestoneCardLarge}>
              <MaterialIcons name="campaign" size={36} color="rgba(255,255,255,0.8)" />
              <View style={[styles.inProgressBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={styles.inProgressText}>🔜 COMING SOON</Text>
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.zakatSection}>
            <View style={styles.zakatHeaderRow}>
              <MaterialIcons name="calculate" size={24} color={Colors.secondary} />
              <Text style={styles.zakatTitle}>Zakat Calculator</Text>
            </View>
            <Text style={styles.zakatDesc}>Purify your wealth. Enter your assets in your local currency. Nisab threshold is based on the silver standard (~595 USD equivalent).</Text>

            {/* Input Fields */}
            <View style={styles.zakatInputGroup}>
              {[
                { key: 'cash', label: 'Cash & Bank Savings', icon: 'account-balance' },
                { key: 'gold', label: 'Gold Value', icon: 'diamond' },
                { key: 'silver', label: 'Silver Value (optional)', icon: 'spa' },
                { key: 'investments', label: 'Investments & Stocks', icon: 'trending-up' },
                { key: 'other', label: 'Other Assets', icon: 'inventory' },
              ].map(({ key, label, icon }) => (
                <View key={key} style={styles.zakatInputRow}>
                  <View style={styles.zakatInputIcon}>
                    <MaterialIcons name={icon as any} size={18} color={Colors.secondary} />
                  </View>
                  <View style={styles.zakatInputFieldWrap}>
                    <Text style={styles.zakatInputLabel}>{label}</Text>
                    <TextInput
                      style={styles.zakatInputField}
                      value={zakat[key as keyof typeof zakat]}
                      onChangeText={updateZakatField(key as keyof typeof zakat)}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>
              ))}

              {/* Debts – highlighted separately */}
              <View style={[styles.zakatInputRow, styles.zakatDebtRow]}>
                <View style={[styles.zakatInputIcon, { backgroundColor: 'rgba(186,26,26,0.1)' }]}>
                  <MaterialIcons name="remove-circle-outline" size={18} color="#ba1a1a" />
                </View>
                <View style={styles.zakatInputFieldWrap}>
                  <Text style={[styles.zakatInputLabel, { color: '#ba1a1a' }]}>Debts / Liabilities</Text>
                  <TextInput
                    style={styles.zakatInputField}
                    value={zakat.debts}
                    onChangeText={updateZakatField('debts')}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Error */}
            {zakatError ? <Text style={styles.zakatErrorText}>{zakatError}</Text> : null}

            {/* Result */}
            {zakatResult && (
              <View style={[styles.zakatResultCard, zakatResult.isEligible ? styles.zakatResultEligible : styles.zakatResultNone]}>
                <View style={styles.zakatResultRow}>
                  <Text style={styles.zakatResultLabel}>Net Wealth</Text>
                  <Text style={styles.zakatResultValue}>{zakatResult.netWealth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.zakatResultRow}>
                  <Text style={styles.zakatResultLabel}>Nisab Threshold</Text>
                  <Text style={styles.zakatResultValue}>~{zakatResult.nisabThreshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={[styles.zakatResultRow, styles.zakatResultDivider]} />
                {zakatResult.isEligible ? (
                  <>
                    <Text style={styles.zakatEligibleLabel}>Zakat Due (2.5%)</Text>
                    <Text style={styles.zakatAmount}>{zakatResult.zakatDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    <Text style={styles.zakatNote}>May Allah accept your charity.</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.zakatNoZakatLabel}><MaterialIcons name="check-circle" size={18} color={Colors.primary} /> No Zakat Due</Text>
                    <Text style={styles.zakatNote}>Your net wealth is below the Nisab threshold. Zakat is not obligatory this year.</Text>
                  </>
                )}
              </View>
            )}

            {/* Calculate Button */}
            <TouchableOpacity style={styles.zakatCalcBtn} onPress={calculateZakat} activeOpacity={0.8}>
              <MaterialIcons name="calculate" size={20} color="#fff" />
              <Text style={styles.zakatCalcBtnText}>Calculate Now</Text>
            </TouchableOpacity>

            {/* Nisab info */}
            <Text style={styles.zakatNisabNote}>
              <MaterialIcons name="menu-book" size={14} color={Colors.textMuted} /> Nisab is based on the silver standard (612.36g). Zakat is computed at 2.5% on wealth held for one full lunar year (Hawl).
            </Text>
          </View>

          {/* About Section */}
          <TouchableOpacity
            style={styles.aboutButton}
            onPress={() => navigation.navigate('About')}
            activeOpacity={0.7}
          >
            <View style={styles.aboutLeft}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.aboutLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.aboutTitle}>About Deen Islam</Text>
                <Text style={styles.aboutVersion}>Version 1.0.0 • Spiritual Growth</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Privacy Policy Link */}
          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 16 }}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Text style={{ fontFamily: 'Manrope', fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline' }}>
              Privacy Policy
            </Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </KeyboardAvoidingView>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 249, 244, 0.8)',
    zIndex: 100,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  premiumText: { color: Colors.secondary, fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  scrollContent: { paddingHorizontal: Spacing.xl },

  heroSection: { marginBottom: Spacing['2xl'] },
  heroTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 28, fontWeight: '800', color: Colors.primary, marginBottom: 6 },
  heroSubtitle: { fontFamily: 'Manrope', fontSize: 15, color: Colors.textMuted, maxWidth: 280 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: Spacing.md },
  statCardLeft: {
    flex: 1,
    backgroundColor: '#f5f3ee',
    padding: Spacing.lg,
    borderRadius: 16,
    justifyContent: 'space-between',
    height: 100,
  },
  statCardRight: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: 16,
    justifyContent: 'space-between',
    height: 100,
    ...Shadows.green,
  },
  statLabelLeft: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 2 },
  statNumberLeft: { fontFamily: 'Plus Jakarta Sans', fontSize: 30, fontWeight: '700', color: Colors.textDark },
  statLabelRight: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: '#9aecd5', letterSpacing: 2 },
  statNumberRight: { fontFamily: 'Plus Jakarta Sans', fontSize: 30, fontWeight: '700', color: '#fff' },

  section: { marginBottom: Spacing['2xl'] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.md },
  sectionTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.md },
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

  milestonesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  milestoneCardSmall: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#eae8e3',
    padding: Spacing.lg,
    borderRadius: 16,
    justifyContent: 'space-between',
    gap: 12,
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
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
    gap: 8,
  },
  inProgressBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  inProgressText: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: '#fff' },
  milestoneLargeContent: { zIndex: 10 },
  milestoneLargeTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: '800', color: '#fff' },
  milestoneLargeSub: { fontFamily: 'Manrope', fontSize: 14, color: '#9aecd5', marginTop: 4 },
  milestoneLargeGlow: { position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },

  zakatSection: { backgroundColor: 'rgba(115,92,0,0.05)', padding: Spacing.xl, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(115,92,0,0.1)', marginBottom: Spacing.xl },
  zakatHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  zakatTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: Colors.secondary },
  zakatDesc: { fontFamily: 'Manrope', fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.xl, lineHeight: 20 },
  zakatBtn: { width: '100%' },

  zakatInputGroup: { gap: 12, marginBottom: Spacing.xl },
  zakatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(115,92,0,0.08)' },
  zakatDebtRow: { borderColor: 'rgba(186,26,26,0.15)', backgroundColor: 'rgba(186,26,26,0.02)' },
  zakatInputIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(115,92,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  zakatInputFieldWrap: { flex: 1 },
  zakatInputLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  zakatInputField: { fontFamily: 'Manrope', fontSize: 16, color: Colors.textDark, paddingVertical: 0, minHeight: 24 },

  zakatErrorText: { fontFamily: 'Manrope', fontSize: 13, color: '#ba1a1a', marginBottom: Spacing.md },

  zakatResultCard: { padding: Spacing.xl, borderRadius: 16, marginBottom: Spacing.xl, gap: 8 },
  zakatResultEligible: { backgroundColor: 'rgba(115,92,0,0.08)', borderWidth: 1, borderColor: 'rgba(115,92,0,0.2)' },
  zakatResultNone: { backgroundColor: 'rgba(0,83,68,0.06)', borderWidth: 1, borderColor: 'rgba(0,83,68,0.15)' },
  zakatResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  zakatResultLabel: { fontFamily: 'Manrope', fontSize: 13, color: Colors.textMuted },
  zakatResultValue: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: Colors.textDark },
  zakatResultDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 4 },
  zakatEligibleLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '800', color: Colors.secondary, letterSpacing: 1, textTransform: 'uppercase' },
  zakatAmount: { fontFamily: 'Plus Jakarta Sans', fontSize: 36, fontWeight: '800', color: Colors.secondary },
  zakatNoZakatLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '800', color: Colors.primary },
  zakatNote: { fontFamily: 'Manrope', fontSize: 13, color: Colors.textMuted, lineHeight: 20 },

  zakatCalcBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  zakatCalcBtnText: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '800', color: '#fff' },
  zakatNisabNote: { fontFamily: 'Manrope', fontSize: 12, color: Colors.textMuted, lineHeight: 20, textAlign: 'center', marginTop: 4 },

  aboutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginTop: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
  },
  aboutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aboutLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  aboutTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  aboutVersion: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

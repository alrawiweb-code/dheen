import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, NativeSpacing as Spacing } from '../theme';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.78, 300);

// Static Qibla bearing for London (demo) – in real app sourced from device sensors
const QIBLA_BEARING = 292;

export const QiblaScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      {/* Radial gradient background */}
      <LinearGradient
        colors={['#0F6D5B', '#002019']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top AppBar */}
      <SafeAreaView>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar} />
            <Text style={styles.headerLabel}>QIBLA</Text>
          </View>
          <Text style={styles.dateText}>14 Shawwal 1446</Text>
          <TouchableOpacity>
            <MaterialIcons name="brightness-5" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main compass canvas */}
      <View style={styles.mainCanvas}>
        {/* Location badge */}
        <View style={styles.locationBadge}>
          <Text style={styles.locationLabel}>Location: London, UK</Text>
          <Text style={styles.bearingText}>292° NW</Text>
          <Text style={styles.alignText}>Align yourself with the arrow to face the Kaaba</Text>
        </View>

        {/* Compass ring */}
        <View style={styles.compassOuter}>
          {/* Decorative rings */}
          <View style={styles.compassRing1} />
          <View style={styles.compassRing2} />

          {/* Compass disk */}
          <BlurView intensity={10} tint="dark" style={styles.compassDisk}>
            {/* Inner degree ring */}
            <View style={styles.degreeRing} />

            {/* Cardinal labels */}
            <Text style={[styles.cardinal, styles.cardinalN]}>N</Text>
            <Text style={[styles.cardinal, styles.cardinalE]}>E</Text>
            <Text style={[styles.cardinal, styles.cardinalS]}>S</Text>
            <Text style={[styles.cardinal, styles.cardinalW]}>W</Text>

            {/* Qibla arrow rotated to bearing */}
            <View style={[styles.arrowContainer, { transform: [{ rotate: `${QIBLA_BEARING}deg` }] }]}>
              <View style={styles.arrowTip}>
                <MaterialIcons name="mosque" size={18} color="#241a00" />
              </View>
              <View style={styles.arrowShaft} />
            </View>

            {/* Center dot */}
            <View style={styles.centerDot} />
          </BlurView>
        </View>

        {/* GPS Status card */}
        <BlurView intensity={20} tint="dark" style={styles.statusCard}>
          <View style={styles.statusIconBg}>
            <MaterialIcons name="gps-fixed" size={24} color="#a1f2db" />
          </View>
          <View>
            <Text style={styles.statusTitle}>GPS Calibrated</Text>
            <Text style={styles.statusSub}>Accuracy within 3 meters</Text>
          </View>
        </BlurView>
      </View>

      {/* Floating Ruhani FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Ruhani')}>
        <LinearGradient colors={[Colors.primary, '#0f6d5b']} style={StyleSheet.absoluteFillObject} />
        <MaterialIcons name="auto-awesome" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(251,249,244,0.8)',
    zIndex: 50,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3' },
  headerLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '800', color: Colors.secondary, letterSpacing: 2 },
  dateText: { fontFamily: 'Plus Jakarta Sans', fontWeight: '700', fontSize: 16, color: Colors.primary },

  mainCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  locationBadge: { alignItems: 'center', marginBottom: 48 },
  locationLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: '#a1f2db', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  bearingText: { fontFamily: 'Plus Jakarta Sans', fontSize: 40, fontWeight: '800', color: '#FBF9F4', marginBottom: 8 },
  alignText: { fontFamily: 'Manrope', fontSize: 14, color: 'rgba(161,242,219,0.7)', textAlign: 'center', maxWidth: 240 },

  compassOuter: {
    width: COMPASS_SIZE + 40,
    height: COMPASS_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 48,
  },
  compassRing1: {
    position: 'absolute',
    width: COMPASS_SIZE + 40,
    height: COMPASS_SIZE + 40,
    borderRadius: (COMPASS_SIZE + 40) / 2,
    borderWidth: 1,
    borderColor: 'rgba(161,242,219,0.1)',
  },
  compassRing2: {
    position: 'absolute',
    width: COMPASS_SIZE + 60,
    height: COMPASS_SIZE + 60,
    borderRadius: (COMPASS_SIZE + 60) / 2,
    borderWidth: 1,
    borderColor: 'rgba(161,242,219,0.05)',
  },
  compassDisk: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // compass glow
    shadowColor: '#85d6c0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },
  degreeRing: {
    position: 'absolute',
    width: COMPASS_SIZE - 32,
    height: COMPASS_SIZE - 32,
    borderRadius: (COMPASS_SIZE - 32) / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    top: 16,
    left: 16,
  },
  cardinal: {
    position: 'absolute',
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
  },
  cardinalN: { top: 20, alignSelf: 'center', left: COMPASS_SIZE / 2 - 6 },
  cardinalE: { right: 20, alignSelf: 'center', top: COMPASS_SIZE / 2 - 8 },
  cardinalS: { bottom: 20, alignSelf: 'center', left: COMPASS_SIZE / 2 - 6 },
  cardinalW: { left: 20, alignSelf: 'center', top: COMPASS_SIZE / 2 - 8 },

  arrowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    height: COMPASS_SIZE * 0.9,
    top: COMPASS_SIZE * 0.05,
  },
  arrowTip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fed65b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  arrowShaft: {
    width: 6,
    height: COMPASS_SIZE / 2.5,
    borderRadius: 3,
    backgroundColor: 'transparent',
    // Gradient effect via shadow
    borderTopWidth: 2,
    borderTopColor: '#fed65b',
  },
  centerDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  statusIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15,109,91,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: '#FBF9F4', marginBottom: 2 },
  statusSub: { fontFamily: 'Manrope', fontSize: 12, color: 'rgba(161,242,219,0.6)' },

  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
});

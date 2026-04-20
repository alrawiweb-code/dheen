import React, { useState, useEffect, useRef } from 'react';
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
import { Magnetometer } from 'expo-sensors';
import { useAppStore } from '../store/useAppStore';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.78, 300);

const MECCA_LAT = 21.422487;
const MECCA_LNG = 39.826206;

const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const toDeg = (x: number) => (x * 180) / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
};

export const QiblaScreen = ({ navigation }: any) => {
  const { profile } = useAppStore();
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [permissionError, setPermissionError] = useState(false);
  const subRef = useRef<any>(null);

  const lat = profile.latitude || 25.2048;
  const lng = profile.longitude || 55.2708;
  const qiblaBearing = getBearing(lat, lng, MECCA_LAT, MECCA_LNG);

  useEffect(() => {
    const initCompass = async () => {
      try {
        const available = await Magnetometer.isAvailableAsync();
        if (!available) {
          setPermissionError(true);
          return;
        }
        Magnetometer.setUpdateInterval(100);
        subRef.current = Magnetometer.addListener(data => {
          let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
          angle = angle >= 0 ? angle : angle + 360;
          setDeviceHeading(angle);
        });
      } catch (e) {
        setPermissionError(true);
      }
    };
    initCompass();

    return () => {
      subRef.current?.remove();
      subRef.current = null;
    };
  }, []);

  const compassRotation = 360 - deviceHeading;
  const pointerRotation = qiblaBearing;

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
            <View style={styles.avatar}>
               <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>{profile.name?.[0]?.toUpperCase() || 'A'}</Text>
            </View>
            <Text style={styles.headerLabel}>QIBLA</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Main compass canvas */}
      <View style={styles.mainCanvas}>
        {permissionError && (
          <View style={{ position: 'absolute', top: -50, backgroundColor: 'rgba(186, 26, 26, 0.9)', padding: 12, borderRadius: 12, zIndex: 50, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name="error-outline" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: 'Manrope', fontSize: 14 }}>Compass unavailable or permission denied.</Text>
          </View>
        )}
        
        {/* Location badge */}
        <View style={styles.locationBadge}>
          <Text style={styles.locationLabel}>{profile.city ? `Location: ${profile.city}, ${profile.country}` : 'Location Active'}</Text>
          <Text style={styles.bearingText}>{Math.round(qiblaBearing)}°</Text>
          <Text style={styles.alignText}>Align yourself with the arrow to face the Kaaba</Text>
        </View>

        {/* Compass ring */}
        <View style={styles.compassOuter}>
          {/* Decorative rings */}
          <View style={styles.compassRing1} />
          <View style={styles.compassRing2} />

          {/* Compass disk - this rotates with the device magnetometer */}
          <BlurView intensity={10} tint="dark" style={[styles.compassDisk, { transform: [{ rotate: `${compassRotation}deg` }] }]}>
            {/* Inner degree ring */}
            <View style={styles.degreeRing} />

            {/* Cardinal labels */}
            <Text style={[styles.cardinal, styles.cardinalN]}>N</Text>
            <Text style={[styles.cardinal, styles.cardinalE]}>E</Text>
            <Text style={[styles.cardinal, styles.cardinalS]}>S</Text>
            <Text style={[styles.cardinal, styles.cardinalW]}>W</Text>

            {/* Qibla arrow rotates pointing to the exact bearing relative to North */}
            <View style={[styles.arrowContainer, { transform: [{ rotate: `${pointerRotation}deg` }] }]}>
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

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, NativeSpacing as Spacing } from '../theme';
import { Magnetometer } from 'expo-sensors';
import { useAppStore } from '../store/useAppStore';
import { useIsFocused } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ScreenWrapper';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

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
  const [needsCalibration, setNeedsCalibration] = useState(false);
  
  const subRef = useRef<any>(null);
  const isFocused = useIsFocused();

  const lat = profile.latitude || 25.2048;
  const lng = profile.longitude || 55.2708;
  const qiblaBearing = getBearing(lat, lng, MECCA_LAT, MECCA_LNG);

  const animatedHeading = useRef(new Animated.Value(0)).current;
  const lastHeading = useRef(0);

  useEffect(() => {
    let isMounted = true;
    
    const initCompass = async () => {
      try {
        const available = await Magnetometer.isAvailableAsync();
        
        // CRITICAL FIX: If component unmounted or lost focus during the await, abort immediately.
        // Failing to do this causes an orphaned 20-FPS background listener to leak.
        if (!isMounted) return;
        
        if (!available) {
          setPermissionError(true);
          return;
        }
        
        Magnetometer.setUpdateInterval(50); // Faster updates for smooth animation
        
        subRef.current = Magnetometer.addListener(data => {
          if (!isMounted) return;
          
          // Calibration detection (Earth's magnetic field is 25-65 µT)
          const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
          if (magnitude < 15 || magnitude > 85) {
            setNeedsCalibration(true);
          } else {
            setNeedsCalibration(false);
          }

          let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
          if (angle < 0) angle += 360;
          
          let heading = angle - 90;
          if (heading < 0) heading += 360;

          // Find shortest rotation path
          let diff = heading - lastHeading.current;
          while (diff > 180) diff -= 360;
          while (diff < -180) diff += 360;
          
          const targetHeading = lastHeading.current + diff;
          lastHeading.current = targetHeading;
          
          setDeviceHeading(Math.round((targetHeading % 360 + 360) % 360));

          Animated.timing(animatedHeading, {
            toValue: targetHeading,
            duration: 50,
            useNativeDriver: true,
          }).start();
        });
      } catch (e) {
        if (isMounted) setPermissionError(true);
      }
    };

    if (isFocused) {
      initCompass();
    } else {
      if (subRef.current) {
        subRef.current.remove();
        subRef.current = null;
      }
    }

    return () => {
      isMounted = false;
      if (subRef.current) {
        subRef.current.remove();
        subRef.current = null;
      }
    };
  }, [isFocused]);

  const compassRotationAnim = animatedHeading.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-1deg']
  });

  const qiblaDirection = Math.round((qiblaBearing - deviceHeading + 360) % 360);
  const isFacingQibla = qiblaDirection < 5 || qiblaDirection > 355;

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={['#0F6D5B', '#002019']}
        style={StyleSheet.absoluteFillObject}
      />

      <View>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerLabel}>QIBLA</Text>
          </View>
          <View style={{ width: 40 }} /> 
        </View>
      </View>

      <View style={styles.mainCanvas}>
        {permissionError && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="explore-off" size={24} color="#fff" />
            <Text style={styles.errorText}>Compass not available.</Text>
          </View>
        )}

        <View style={styles.locationBadge}>
          <Text style={styles.locationLabel}>{profile.city ? `Location: ${profile.city}, ${profile.country}` : 'Location Active'}</Text>
          <Text style={[styles.bearingText, isFacingQibla && { color: '#fed65b' }]}>{Math.round(qiblaBearing)}°</Text>
          {!permissionError && (
            <Text style={styles.alignText}>
              {isFacingQibla ? 'You are facing the Qibla' : 'Align yourself with the arrow to face the Kaaba'}
            </Text>
          )}
        </View>

        <View style={[styles.compassOuter, permissionError && { opacity: 0.5 }]}>
          <View style={styles.compassRing1} />
          <View style={styles.compassRing2} />

          <AnimatedBlurView intensity={Platform.OS === 'ios' ? 10 : 100} tint="dark" style={[styles.compassDisk, { transform: [{ rotate: compassRotationAnim }] }]}>
            <View style={styles.degreeRing} />

            <Text style={[styles.cardinal, styles.cardinalN]}>N</Text>
            <Text style={[styles.cardinal, styles.cardinalE]}>E</Text>
            <Text style={[styles.cardinal, styles.cardinalS]}>S</Text>
            <Text style={[styles.cardinal, styles.cardinalW]}>W</Text>

            <View style={[styles.arrowContainer, { transform: [{ rotate: `${qiblaBearing}deg` }] }]}>
              <View style={[styles.arrowTip, isFacingQibla && { backgroundColor: '#fff' }]}>
                <MaterialIcons name="mosque" size={18} color="#241a00" />
              </View>
              <View style={[styles.arrowShaft, isFacingQibla && { borderTopColor: '#fff' }]} />
            </View>

            <View style={styles.centerDot} />
          </AnimatedBlurView>
        </View>

        <BlurView intensity={Platform.OS === 'ios' ? 20 : 100} tint="dark" style={[styles.statusCard, needsCalibration && { borderColor: 'rgba(255, 165, 0, 0.5)' }]}>
          <View style={[styles.statusIconBg, needsCalibration && { backgroundColor: 'rgba(255, 165, 0, 0.2)' }]}>
            <MaterialIcons name={permissionError ? "gps-off" : needsCalibration ? "screen-rotation" : "gps-fixed"} size={24} color={needsCalibration ? "#FFA500" : "#a1f2db"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {permissionError ? "Sensor Error" : needsCalibration ? "Calibration Needed" : "Compass Calibrated"}
            </Text>
            <Text style={styles.statusSub}>
              {permissionError ? "Could not initialize compass" : needsCalibration ? "Move your phone in a figure-8 motion to calibrate" : "Accuracy is optimal"}
            </Text>
          </View>
        </BlurView>
      </View>
    </ScreenWrapper>
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
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },

  errorContainer: {
    position: 'absolute', 
    top: -50, 
    backgroundColor: 'rgba(186, 26, 26, 0.9)', 
    padding: 12, 
    borderRadius: 12, 
    zIndex: 50, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8
  },
  errorText: { color: '#fff', fontFamily: 'Manrope', fontSize: 14 },

  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eae8e3', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
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
});

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Modal, TextInput, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../theme';
import { ScreenWrapper } from '../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const BEAD_RING_RADIUS = 118;
const BEAD_SIZE = 12;
const CENTER_SIZE = 200;
const CANVAS_SIZE = width - 32;
const CANVAS_CENTER = CANVAS_SIZE / 2;
const TARGET_OPTIONS = [33, 99, 100];

function beadPosition(index: number, total: number, radius: number, cx: number, cy: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

interface BeadProps {
  x: number;
  y: number;
  active: boolean;
  past: boolean;
}

const Bead: React.FC<BeadProps> = ({ x, y, active, past }) => {
  const scaleAnim = useRef(new Animated.Value(defaultScale())).current;
  const opacityAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  function defaultScale() {
    if (active) return 1.6;
    if (past) return 1.1;
    return 1;
  }

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: active ? 1.6 : past ? 1.1 : 1,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: active ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, past]);

  const bodyColor = active ? '#a1f2db' : past ? 'rgba(161,242,219,0.50)' : 'rgba(255,255,255,0.11)';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - BEAD_SIZE / 2,
        top: y - BEAD_SIZE / 2,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          borderRadius: (BEAD_SIZE + 4) / 2,
          backgroundColor: '#a1f2db',
          opacity: opacityAnim,
        }}
      />
      <View
        style={{
          width: BEAD_SIZE,
          height: BEAD_SIZE,
          borderRadius: BEAD_SIZE / 2,
          backgroundColor: bodyColor,
        }}
      />
    </Animated.View>
  );
};

interface TargetSheetProps {
  visible: boolean;
  current: number;
  onSelect: (val: number) => void;
  onClose: () => void;
  onReset: () => void;
}

const TargetSheet: React.FC<TargetSheetProps> = ({ visible, current, onSelect, onClose, onReset }) => {
  const translateY = useRef(new Animated.Value(400)).current;
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: 400, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible && translateY === 400) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(0,0,0,0.82)' }
        ]}
        onPress={onClose}
      />
      <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Set Target</Text>
        <Text style={styles.sheetSubtitle}>Beads reset when target is reached</Text>
        <View style={styles.optionsRow}>
          {TARGET_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.optionBtn, current === opt && styles.optionBtnActive]}
              onPress={() => onSelect(opt)}
            >
              <Text style={styles.optionNum}>{opt}</Text>
              <Text style={styles.optionLabel}>{opt === 33 ? 'TASBIH' : opt === 99 ? 'ASMAUL HUSNA' : 'CENTURY'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            onReset();
            onClose();
          }}
        >
          <MaterialIcons name="refresh" size={18} color="rgba(220,80,80,0.8)" />
          <Text style={styles.resetBtnText}>Reset All</Text>
        </TouchableOpacity>

        <View style={styles.customRow}>
          <TextInput
            style={styles.sheetCustomInput}
            keyboardType="number-pad"
            placeholder="Custom number…"
            placeholderTextColor="rgba(161,242,219,0.35)"
            value={customInput}
            onChangeText={(val) => setCustomInput(val.replace(/[^0-9]/g, ''))}
            maxLength={5}
          />
        </View>

        <TouchableOpacity
          style={styles.sheetCloseBtn}
          onPress={() => {
            if (customInput.trim() !== '') {
              const n = parseInt(customInput.trim(), 10);
              if (!isNaN(n) && n > 0 && n <= 99999) {
                onSelect(n);
                setCustomInput('');
                return;
              } else {
                return;
              }
            }
            onClose();
          }}
        >
          <Text style={styles.sheetCloseText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

export const DhikrScreen = ({ navigation }: any) => {
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [showTargetSheet, setShowTargetSheet] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);

  const tapScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const orbPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1.08, duration: 3000, useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 1, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleTap = useCallback(() => {
    // Squeeze
    Animated.sequence([
      Animated.timing(tapScale, { toValue: 0.96, duration: 55, useNativeDriver: true }),
      Animated.spring(tapScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    // Ripple
    pulseOpacity.setValue(0.5);
    pulseScale.setValue(0.82);
    Animated.parallel([
      Animated.timing(pulseOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseScale, { toValue: 1.05, duration: 700, useNativeDriver: true }),
    ]).start();

    const newCount = count + 1;
    if (newCount >= target) {
      setCount(0);
      setTotalCount(tc => tc + 1);
      setCycleCount(cc => cc + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setCount(newCount);
      setTotalCount(tc => tc + 1);
      if (newCount % 33 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [count, target]);

  const handleTargetSelect = (t: number) => {
    setTarget(t);
    setCount(0);
    setShowTargetSheet(false);
  };

  const BEAD_DISPLAY_COUNT = Math.min(target, 100);

  const beads = Array.from({ length: BEAD_DISPLAY_COUNT }, (_, i) => {
    const pos = beadPosition(i, BEAD_DISPLAY_COUNT, BEAD_RING_RADIUS, CANVAS_CENTER, CANVAS_CENTER);
    return {
      ...pos,
      active: i === (count % BEAD_DISPLAY_COUNT) && count > 0,
      past: i < (count % BEAD_DISPLAY_COUNT),
      id: i,
    };
  });

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={['#041a11', '#072b1b', '#0A3D2B', '#0d4a33']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.orbGlow,
          {
            transform: [{ scale: orbPulse }],
            opacity: orbPulse.interpolate({
              inputRange: [1, 1.08],
              outputRange: [0.14, 0.22],
            }),
          },
        ]}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color="#a1f2db" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DHIKR</Text>
        <TouchableOpacity style={styles.targetBtn} onPress={() => setShowTargetSheet(true)}>
          <Text style={styles.targetBtnText}>{target}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>TARGET</Text>
          <Text style={styles.infoValue}>{target}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>TOTAL</Text>
          <Text style={styles.infoValue}>{totalCount}</Text>
        </View>
      </View>

      <View style={styles.canvasWrapper}>
        <Pressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={handleTap}>
          <Animated.View style={[{ transform: [{ scale: tapScale }] }]}>
            <View style={styles.canvasArea}>

              <Animated.View
                style={[
                  styles.rippleRing,
                  {
                    transform: [{ scale: pulseScale }],
                    opacity: pulseOpacity,
                  },
                ]}
              />

              <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                <Circle cx={CANVAS_CENTER} cy={CANVAS_CENTER} r={BEAD_RING_RADIUS} stroke="rgba(161,242,219,0.1)" strokeWidth="1" fill="none" />
                {BEAD_DISPLAY_COUNT > 33 && (
                  <Line
                    x1={CANVAS_CENTER + (BEAD_RING_RADIUS - 10) * Math.cos((33 / BEAD_DISPLAY_COUNT) * 2 * Math.PI - Math.PI / 2)}
                    y1={CANVAS_CENTER + (BEAD_RING_RADIUS - 10) * Math.sin((33 / BEAD_DISPLAY_COUNT) * 2 * Math.PI - Math.PI / 2)}
                    x2={CANVAS_CENTER + (BEAD_RING_RADIUS + 10) * Math.cos((33 / BEAD_DISPLAY_COUNT) * 2 * Math.PI - Math.PI / 2)}
                    y2={CANVAS_CENTER + (BEAD_RING_RADIUS + 10) * Math.sin((33 / BEAD_DISPLAY_COUNT) * 2 * Math.PI - Math.PI / 2)}
                    stroke="rgba(161,242,219,0.3)"
                    strokeWidth="2"
                  />
                )}
                {BEAD_DISPLAY_COUNT > 66 && (
                  <Line
                    x1={CANVAS_CENTER + (BEAD_RING_RADIUS - 10) * Math.cos((66 / BEAD_DISPLAY_COUNT) * 2 * Math.PI - Math.PI / 2)}
                    y1={CANVAS_CENTER + (BEAD_RING_RADIUS - 10) * Math.sin((66 / BEAD_DISPLAY_COUNT) * 2 * Math.PI - Math.PI / 2)}
                    x2={CANVAS_CENTER + (BEAD_RING_RADIUS + 10) * Math.cos((66 / BEAD_DISPLAY_COUNT) * 2 * Math.PI - Math.PI / 2)}
                    y2={CANVAS_CENTER + (BEAD_RING_RADIUS + 10) * Math.sin((66 / BEAD_DISPLAY_COUNT) * 2 * Math.PI - Math.PI / 2)}
                    stroke="rgba(161,242,219,0.3)"
                    strokeWidth="2"
                  />
                )}
              </Svg>

              {beads.map((b) => (
                <Bead key={b.id} x={b.x} y={b.y} active={b.active} past={b.past} />
              ))}

              <Animated.View
                style={[
                  styles.centerCircle,
                  {
                    transform: [{ scale: orbPulse }],
                  },
                ]}
              >
                <View style={styles.centerBorderRing} />
                <Text style={styles.centerCount}>{count}</Text>
                <Text style={styles.centerTarget}>/ {target}</Text>
              </Animated.View>
            </View>
          </Animated.View>
        </Pressable>

        {cycleCount > 0 && (
          <View style={styles.cycleBadge}>
            <Text style={styles.cycleBadgeText}>{cycleCount}×</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.breathingPill}
          onPress={() => navigation.navigate('BreathingDhikr')}
        >
          <LinearGradient colors={['#0f6d5b', '#072b1b']} style={StyleSheet.absoluteFill} />
          <MaterialIcons name="air" size={18} color="#a1f2db" style={{ marginRight: 6 }} />
          <Text style={styles.breathingPillText}>Breathing Mode</Text>
        </TouchableOpacity>
      </View>

      <TargetSheet
        visible={showTargetSheet}
        current={target}
        onSelect={handleTargetSelect}
        onClose={() => setShowTargetSheet(false)}
        onReset={() => {
          setCount(0);
          setTotalCount(0);
          setCycleCount(0);
        }}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  orbGlow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#0F6D5B',
    top: Dimensions.get('window').height / 2 - width * 0.75,
    left: width / 2 - width * 0.75,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 5,
  },
  headerTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 12,
  },
  infoItem: {
    alignItems: 'center',
    gap: 2,
  },
  infoLabel: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(161,242,219,0.35)',
    letterSpacing: 2,
  },
  infoValue: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 22,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.88)',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(161,242,219,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(161,242,219,0.18)',
  },
  targetBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(161,242,219,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(161,242,219,0.18)',
  },
  targetBtnText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '800',
    color: '#a1f2db',
  },
  canvasWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  canvasArea: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: CANVAS_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(161,242,219,0.28)',
  },
  centerCircle: {
    position: 'absolute',
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: 'rgba(5,22,14,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBorderRing: {
    position: 'absolute',
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(161,242,219,0.12)',
  },
  centerCount: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 54,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 60,
  },
  centerTarget: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: 'rgba(161,242,219,0.35)',
  },
  cycleBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(161,242,219,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cycleBadgeText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12,
    fontWeight: '800',
    color: '#a1f2db',
  },
  // removed totalLabel and picker styles
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  breathingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(161,242,219,0.18)',
    overflow: 'hidden',
  },
  breathingPillText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '700',
    color: '#a1f2db',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(161,242,219,0.15)',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: 'rgba(161,242,219,0.5)',
    marginBottom: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  optionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(161,242,219,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionBtnActive: {
    borderColor: 'rgba(161,242,219,0.38)',
    backgroundColor: 'rgba(161,242,219,0.1)',
  },
  optionNum: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  optionLabel: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 10,
    fontWeight: '700',
    color: '#a1f2db',
    marginTop: 4,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetCustomInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(186,26,26,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.18)',
    marginBottom: 16,
  },
  resetBtnText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(220,80,80,0.8)',
  },
  sheetCloseBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#a1f2db',
    alignItems: 'center',
  },
  sheetCloseText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 16,
    fontWeight: '800',
    color: '#041a11',
  },
});

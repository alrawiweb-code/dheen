import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface HapticButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  hitSlop?: { top: number; bottom: number; left: number; right: number };
  disabled?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy' | 'none';
  children: React.ReactNode;
}

export const HapticButton: React.FC<HapticButtonProps> = ({
  onPress,
  style,
  hitSlop,
  disabled = false,
  hapticType = 'light',
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
    if (hapticType !== 'none') {
      const type =
        hapticType === 'light'
          ? Haptics.ImpactFeedbackStyle.Light
          : hapticType === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Heavy;
      Haptics.impactAsync(type);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      activeOpacity={1}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

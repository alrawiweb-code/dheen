import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors } from '../theme';

// Import Screens (to be implemented/already implemented)
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SetNiyyahScreen } from '../screens/SetNiyyahScreen';
import { SukoonScreen } from '../screens/SukoonScreen';
import { DhikrScreen } from '../screens/DhikrScreen';
import { QiblaScreen } from '../screens/QiblaScreen';
import { AdhanSettingsScreen } from '../screens/AdhanSettingsScreen';
import { OneMinuteAllahScreen } from '../screens/OneMinuteAllahScreen';
import { BreathingDhikrScreen } from '../screens/BreathingDhikrScreen';
import { AdhanAlertScreen } from '../screens/AdhanAlertScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { QuranScreen } from '../screens/QuranScreen';
import { PrayersScreen } from '../screens/PrayersScreen';
import { DuasScreen } from '../screens/DuasScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { QuranReader } from '../screens/QuranReader';

// Placeholder standard screens for tabs before we build them fully

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          let label = '';

          if (route.name === 'HomeTab') {
            iconName = 'home';
            label = 'Home';
          } else if (route.name === 'QuranTab') {
            iconName = 'menu-book';
            label = 'Quran';
          } else if (route.name === 'PrayersTab') {
            iconName = 'auto-awesome-motion';
            label = 'Prayers';
          } else if (route.name === 'DuasTab') {
            iconName = 'auto-stories';
            label = 'Duas';
          } else if (route.name === 'ProfileTab') {
            iconName = 'person';
            label = 'Profile';
          }

          return (
            <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
              <MaterialIcons name={iconName} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{label}</Text>
            </View>
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: 'rgba(27, 28, 25, 0.4)', // text textDark / 40 opacity
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="QuranTab" component={QuranScreen} />
      <Tab.Screen name="PrayersTab" component={PrayersScreen} />
      <Tab.Screen name="DuasTab" component={DuasScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export const RootNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {/* Onboarding Flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="SetNiyyah" component={SetNiyyahScreen} />
        <Stack.Screen name="Sukoon" component={SukoonScreen} />
        <Stack.Screen name="Dhikr" component={DhikrScreen} />
        <Stack.Screen name="Qibla" component={QiblaScreen} />
        <Stack.Screen name="AdhanSettings" component={AdhanSettingsScreen} />
        
        {/* Main App */}
        <Stack.Screen name="Root" component={MainTabs} />
        
        {/* Modals */}
        <Stack.Screen
          name="SetNiyyahModal"
          component={SetNiyyahScreen}
          options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="OneMinute"
          component={OneMinuteAllahScreen}
          options={{ presentation: 'fullScreenModal', animation: 'fade_from_bottom' }}
        />
        <Stack.Screen
          name="AdhanAlert"
          component={AdhanAlertScreen}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="BreathingDhikr"
          component={BreathingDhikrScreen}
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        {/* Quran Reader (full screen) */}
        <Stack.Screen
          name="QuranReader"
          component={QuranReader}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    elevation: 0,
    backgroundColor: 'rgba(251, 249, 244, 0.9)', // FBF9F4 / 90
    height: 80,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 0,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    paddingHorizontal: 16,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabItemFocused: {
    backgroundColor: 'rgba(0, 83, 68, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
});

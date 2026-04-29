import React, { Suspense } from 'react';
import { ActivityIndicator } from 'react-native';
import { View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme';
import { TAB_BAR_HEIGHT } from '../constants/layout';
import { useAppStore } from '../store/useAppStore';

// Import Screens (to be implemented/already implemented)
import { SplashScreen } from '../screens/SplashScreen';
import { GreetingScreen } from '../screens/GreetingScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SetNiyyahScreen } from '../screens/SetNiyyahScreen';
import { SukoonScreen } from '../screens/SukoonScreen';
import { DhikrScreen } from '../screens/DhikrScreen';
// Lazy-load QiblaScreen so expo-sensors (Magnetometer) is never imported at
// startup — it caused a silent module-level crash that produced the white screen.
const QiblaScreen = React.lazy(() =>
  import('../screens/QiblaScreen').then(m => ({ default: m.QiblaScreen }))
);
// Lazy-load QuranReader so @shopify/flash-list is never imported at startup.
// flash-list's benchmark sub-modules fail to resolve in Metro's startup bundle,
// causing a JS crash before React mounts → white screen.
const QuranReader = React.lazy(() =>
  import('../screens/QuranReader').then(m => ({ default: m.QuranReader }))
);
import { AdhanSettingsScreen } from '../screens/AdhanSettingsScreen';
import { OneMinuteAllahScreen } from '../screens/OneMinuteAllahScreen';
import { BreathingDhikrScreen } from '../screens/BreathingDhikrScreen';
import { AdhanAlertScreen } from '../screens/AdhanAlertScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { QuranScreen } from '../screens/QuranScreen';
import { PrayersScreen } from '../screens/PrayersScreen';
import { DuasScreen } from '../screens/DuasScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const darkMode = useAppStore(state => state.darkMode);
  // Full physical tab bar height: icon row + Android nav inset
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            // Push icon content up so it sits in the visual 80px zone
            paddingBottom: insets.bottom,
            backgroundColor: darkMode ? '#001a12' : '#FFFFFF',
            shadowColor: darkMode ? 'transparent' : Colors.primary,
          },
        ],
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
            <View style={[styles.tabItem, focused && [styles.tabItemFocused, darkMode && { backgroundColor: 'rgba(161,242,219,0.1)' }]]}>
              <MaterialIcons name={iconName} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{label}</Text>
            </View>
          );
        },
        tabBarActiveTintColor: darkMode ? '#a1f2db' : '#0F5132',
        tabBarInactiveTintColor: darkMode ? '#4a6a5a' : '#9CA3AF',
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

import { navigationRef } from './navigationRef';
export { navigationRef };

export const RootNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {/* Onboarding Flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Greeting" component={GreetingScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="SetNiyyah" component={SetNiyyahScreen} />
        <Stack.Screen name="Sukoon" component={SukoonScreen} />
        <Stack.Screen name="Dhikr" component={DhikrScreen} />
        <Stack.Screen
          name="Qibla"
          children={(props) => (
            <Suspense fallback={<ActivityIndicator size="large" color="#0f6d5b" style={{ flex: 1 }} />}>
              <QiblaScreen {...props} />
            </Suspense>
          )}
        />

        <Stack.Screen name="AdhanSettings" component={AdhanSettingsScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        
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
        {/* Quran Reader (full screen) — lazy-loaded to keep flash-list out of startup bundle */}
        <Stack.Screen
          name="QuranReader"
          children={(props) => (
            <Suspense fallback={<ActivityIndicator size="large" color="#0f6d5b" style={{ flex: 1 }} />}>
              <QuranReader {...props} />
            </Suspense>
          )}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    elevation: 0,
    backgroundColor: '#FFFFFF',
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

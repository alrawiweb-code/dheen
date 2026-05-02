import React, { Suspense } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme';
import { TAB_BAR_HEIGHT } from '../constants/layout';
import { useAppStore } from '../store/useAppStore';

// Import Screens — eager: only screens needed at cold start or for tabs
import { GreetingScreen } from '../screens/GreetingScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SetNiyyahScreen } from '../screens/SetNiyyahScreen';
import { AdhanAlertScreen } from '../screens/AdhanAlertScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { QuranScreen } from '../screens/QuranScreen';
import { PrayersScreen } from '../screens/PrayersScreen';
// Lazy-loaded: heavy or rarely-visited screens deferred off the startup bundle
const DuasScreen = React.lazy(() =>
  import('../screens/DuasScreen').then(m => ({ default: m.DuasScreen }))
);

import { ProfileScreen } from '../screens/ProfileScreen';
import { AboutScreen } from '../screens/AboutScreen';

// Lazy-loaded: heavy or rarely-visited screens deferred off the startup bundle
const QiblaScreen = React.lazy(() =>
  import('../screens/QiblaScreen').then(m => ({ default: m.QiblaScreen }))
);
const QuranReader = React.lazy(() =>
  import('../screens/QuranReader').then(m => ({ default: m.QuranReader }))
);
const DhikrScreen = React.lazy(() =>
  import('../screens/DhikrScreen').then(m => ({ default: m.DhikrScreen }))
);
const SukoonScreen = React.lazy(() =>
  import('../screens/SukoonScreen').then(m => ({ default: m.SukoonScreen }))
);
const AdhanSettingsScreen = React.lazy(() =>
  import('../screens/AdhanSettingsScreen').then(m => ({ default: m.AdhanSettingsScreen }))
);
const OneMinuteAllahScreen = React.lazy(() =>
  import('../screens/OneMinuteAllahScreen').then(m => ({ default: m.OneMinuteAllahScreen }))
);
const BreathingDhikrScreen = React.lazy(() =>
  import('../screens/BreathingDhikrScreen').then(m => ({ default: m.BreathingDhikrScreen }))
);
const PrivacyPolicyScreen = React.lazy(() =>
  import('../screens/PrivacyPolicyScreen').then(m => ({ default: m.PrivacyPolicyScreen }))
);

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
  const profile = useAppStore(state => state.profile);
  const initialRouteName = profile.onboardingComplete ? 'Greeting' : 'Onboarding';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false, animation: 'fade' }}>
        {/* Onboarding Flow */}
        <Stack.Screen name="Greeting" component={GreetingScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="SetNiyyah" component={SetNiyyahScreen} />
        <Stack.Screen
          name="Sukoon"
          children={(props) => (
            <Suspense fallback={<ActivityIndicator size="large" color="#0f6d5b" style={{ flex: 1 }} />}>
              <SukoonScreen {...props} />
            </Suspense>
          )}
        />
        <Stack.Screen
          name="Dhikr"
          children={(props) => (
            <Suspense fallback={<ActivityIndicator size="large" color="#0f6d5b" style={{ flex: 1 }} />}>
              <DhikrScreen {...props} />
            </Suspense>
          )}
        />
        <Stack.Screen
          name="Qibla"
          children={(props) => (
            <Suspense fallback={<ActivityIndicator size="large" color="#0f6d5b" style={{ flex: 1 }} />}>
              <QiblaScreen {...props} />
            </Suspense>
          )}
        />

        <Stack.Screen
          name="AdhanSettings"
          children={(props) => (
            <Suspense fallback={<ActivityIndicator size="large" color="#0f6d5b" style={{ flex: 1 }} />}>
              <AdhanSettingsScreen {...props} />
            </Suspense>
          )}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          children={(props) => (
            <Suspense fallback={<ActivityIndicator size="large" color="#0f6d5b" style={{ flex: 1 }} />}>
              <PrivacyPolicyScreen {...props} />
            </Suspense>
          )}
        />
        
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
          children={(props) => (
            <Suspense fallback={<ActivityIndicator size="large" color="#0f6d5b" style={{ flex: 1 }} />}>
              <OneMinuteAllahScreen {...props} />
            </Suspense>
          )}
          options={{ presentation: 'fullScreenModal', animation: 'fade_from_bottom' }}
        />
        <Stack.Screen
          name="AdhanAlert"
          component={AdhanAlertScreen}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="BreathingDhikr"
          children={(props) => (
            <Suspense fallback={<ActivityIndicator size="large" color="#0f6d5b" style={{ flex: 1 }} />}>
              <BreathingDhikrScreen {...props} />
            </Suspense>
          )}
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

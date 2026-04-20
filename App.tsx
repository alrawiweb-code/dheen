import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { initializeNotificationEngine } from './src/services/notificationManager';
import { preloadAdhanAudio } from './src/services/adhanManager';
import {
  ScheherazadeNew_400Regular,
  ScheherazadeNew_700Bold,
} from '@expo-google-fonts/scheherazade-new';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from './src/store/useAppStore';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreenExpo.preventAutoHideAsync();

// Suppress excessive logging in Production
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, padding: 40, backgroundColor: '#fff', marginTop: 40 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'red', marginBottom: 12 }}>
            App crashed — error details:
          </Text>
          <Text style={{ fontSize: 12, color: '#333', fontFamily: 'monospace' }}>
            {(this.state.error as Error).message}
            {'\n\n'}
            {(this.state.error as Error).stack}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    const cleanupNotifications = initializeNotificationEngine();
    // Kick off background download of all Adhan audio files so
    // previews play instantly from local storage on every subsequent tap.
    preloadAdhanAudio();
    return () => {
      cleanupNotifications();
    };
  }, []);

  useEffect(() => {
    const checkDailyReset = async () => {
      try {
        const today = new Date().toDateString();
        const lastReset = await AsyncStorage.getItem('lastPrayerResetDate');
        if (lastReset !== today) {
          useAppStore.getState().resetDailyPrayers();
          await AsyncStorage.setItem('lastPrayerResetDate', today);
        }
      } catch (e) {
        console.warn('[DailyReset] Failed:', e);
      }
    };
    checkDailyReset();
  }, []);


  // Load Scheherazade New — the only widely available font with
  // full Quranic Unicode coverage (all tajweed marks, end-of-ayah ۝, etc.)
  const [fontsLoaded, fontError] = useFonts({
    'ScheherazadeNew-Regular': ScheherazadeNew_400Regular,
    'ScheherazadeNew-Bold': ScheherazadeNew_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreenExpo.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Keep splash screen up while fonts are loading
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <View style={styles.container} onLayout={onLayoutRootView}>
        <StatusBar style="light" translucent />
        <RootNavigator />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F4',
  },
});

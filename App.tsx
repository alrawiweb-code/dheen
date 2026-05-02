import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { initializeNotificationEngine, syncPrayerNotifications } from './src/services/notificationManager';
import { preloadAdhanAudio } from './src/services/adhanManager';
import {
  ScheherazadeNew_400Regular,
  ScheherazadeNew_700Bold,
} from '@expo-google-fonts/scheherazade-new';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from './src/store/useAppStore';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppState } from 'react-native';

SplashScreenExpo.preventAutoHideAsync();

// Suppress excessive logging in production
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
}

// ── Error Boundary ─────────────────────────────────────────────────────────
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

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const splashHidden = useRef(false);

  // ── Font loading ──────────────────────────────────────────────
  const [fontsLoaded, fontError] = useFonts({
    'ScheherazadeNew-Regular': ScheherazadeNew_400Regular,
    'ScheherazadeNew-Bold': ScheherazadeNew_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  // ── Hide splash as soon as fonts are ready ────────────────────
  // Quran data is NOT an app dependency — it loads on user action only.
  useEffect(() => {
    if (fontsReady && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreenExpo.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  // ── Background tasks (notifications, adhan) ───────────────────
  useEffect(() => {
    let cleanupNotifications: (() => void) | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      cleanupNotifications = initializeNotificationEngine();
      // preloadAdhanAudio is now async with retry logic — fire and forget but log errors
      preloadAdhanAudio().catch((e) =>
        console.warn('[App] Adhan audio preload failed:', e)
      );
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // syncPrayerNotifications auto-detects settings changes via hash comparison
        // so we don't need forceResync here — it will re-sync when settings change
        syncPrayerNotifications().catch(() => {});
      }
    });

    return () => {
      task.cancel();
      subscription.remove();
      if (cleanupNotifications) cleanupNotifications();
    };
  }, []);

  // ── Daily prayer reset ────────────────────────────────────────
  // (Handled internally by Zustand persistence and HomeScreen)

  // ── Render: waiting for fonts ─────────────────────────────────
  if (!fontsReady) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="dark" translucent />
        <ActivityIndicator size="large" color="#0f6d5b" />
      </View>
    );
  }

  // ── Render: App ───────────────────────────────────────────────
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <View style={styles.container}>
          <StatusBar style="light" translucent />
          <RootNavigator />
        </View>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F4',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

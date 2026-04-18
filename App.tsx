import React, { useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  ScheherazadeNew_400Regular,
  ScheherazadeNew_700Bold,
} from '@expo-google-fonts/scheherazade-new';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreenExpo.preventAutoHideAsync();

// Suppress excessive logging in Production
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
}

export default function App() {
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
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style="light" translucent />
      <RootNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F4',
  },
});

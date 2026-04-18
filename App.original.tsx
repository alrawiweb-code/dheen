import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/useAppStore';

SplashScreenExpo.preventAutoHideAsync();

type AppPhase = 'splash' | 'onboarding' | 'app';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('splash');
  const { profile, setProfile } = useAppStore();

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  console.log('[App] Rendering...', { fontsLoaded, phase });

  const onLayoutRootView = useCallback(async () => {
    console.log('[App] onLayoutRootView', { fontsLoaded });
    if (fontsLoaded) {
      await SplashScreenExpo.hideAsync();
    }
  }, [fontsLoaded]);

  // Removed: if (!fontsLoaded) return null;

  const handleSplashFinish = () => {
    console.log('[App] Splash finish');
    setPhase(profile.onboardingComplete ? 'app' : 'onboarding');
  };

  const handleOnboardingComplete = () => {
    console.log('[App] Onboarding complete');
    setProfile({ onboardingComplete: true, name: 'Friend' });
    setPhase('app');
  };

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style="auto" />
      {!fontsLoaded && phase !== 'splash' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <Text style={{ color: '#000' }}>Loading spiritual experience...</Text>
        </View>
      )}
      {phase === 'splash' && (
        <SplashScreen onFinish={handleSplashFinish} />
      )}
      {phase === 'onboarding' && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}
      {phase === 'app' && (
        <RootNavigator />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';

/**
 * Requests native Foreground tracking permissions.
 * Includes explicit UX rationale as per user requirements.
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  // Check if we already have it to avoid spamming the user
  const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
  if (existingStatus === 'granted') return true;

  // Inform the user precisely WHY we want access before triggering OS prompt
  // The Promise wrapper ensures we wait for the user to tap "Continue" 
  // before the native OS block halts the JS thread.
  const userUnderstands = await new Promise<boolean>((resolve) => {
    Alert.alert(
      'Location Access',
      'This is used to get the precise timing for your daily Adhan and prayer calculations.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', style: 'default', onPress: () => resolve(true) }
      ],
      { cancelable: false }
    );
  });

  if (!userUnderstands) return false;

  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

/**
 * Coordinates fetching of lat/lon from device and syncs to Zustand Store.
 */
export const refreshDeviceCoordinates = async (): Promise<boolean> => {
  try {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) return false;

    // Use latest coordinates. Balanced accuracy ensures fast response without draining battery.
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    
    // Save to global user profile
    useAppStore.getState().setProfile({
      latitude,
      longitude,
    });

    return true;
  } catch (error) {
    console.warn('[LocationManager] Error fetching coordinates:', error);
    return false;
  }
};

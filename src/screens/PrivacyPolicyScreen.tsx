import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Colors } from '../theme';

export const PrivacyPolicyScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading && (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      )}

      <View style={{ flex: 1, paddingBottom: insets.bottom }}>
        <WebView
          source={{ uri: 'https://privacy-policy-umber-one.vercel.app/' }}
          onLoadEnd={() => setLoading(false)}
          style={[styles.webview, loading && styles.hidden]}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hidden: {
    opacity: 0,
  },
});

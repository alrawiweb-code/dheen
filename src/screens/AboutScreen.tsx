import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper, useScreenBottomInset } from '../components/ScreenWrapper';
import { Colors, Spacing } from '../theme';

const { width } = Dimensions.get('window');

export const AboutScreen = ({ navigation }: any) => {
  const bottomInset = useScreenBottomInset(false);

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Muslim Go Plus</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.description}>
            Muslim Go Plus is your personal companion for spiritual growth and peace. Designed to bring focus, faith, and clarity to your daily life.

            A product by Alrawi Ventures, built with the vision of empowering the Ummah through meaningful and modern digital experiences.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <MaterialIcons name="verified" size={20} color={Colors.primary} />
              <Text style={styles.featureText}>Accurate Prayer Times</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="menu-book" size={20} color={Colors.primary} />
              <Text style={styles.featureText}>Holy Quran with Translation</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="favorite" size={20} color={Colors.primary} />
              <Text style={styles.featureText}>Daily Duas & Remembrance</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.privacyBtn}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <MaterialIcons name="privacy-tip" size={20} color={Colors.primary} />
            <Text style={styles.privacyBtnText}>Privacy Policy</Text>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with love for the Ummah</Text>
          <Text style={styles.copyright}>© 2026 Muslim Go Plus. All rights reserved.</Text>
        </View>
      </ScrollView>
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  appName: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  version: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 40,
  },
  description: {
    fontFamily: 'Manrope',
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 24,
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(15, 109, 91, 0.05)',
    borderRadius: 12,
  },
  featureText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  copyright: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.textMuted,
  },
  privacyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  privacyBtnText: {
    flex: 1,
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    marginLeft: 12,
  },
});

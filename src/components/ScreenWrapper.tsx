import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { DarkColors, LightColors } from '../theme/darkMode';

import { TAB_BAR_HEIGHT, SCREEN_H_PADDING } from '../constants/layout';

/** Extra bottom breathing room below the tab bar */
const BOTTOM_EXTRA = 16;

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Returns the bottom padding value that screens with their own ScrollView
 * should apply to their contentContainerStyle to clear the tab bar.
 *
 * @param withTabBar - true (default) for tab-bar screens; false for full-screen modals/stacks.
 */
export function useScreenBottomInset(withTabBar = true): number {
  const insets = useSafeAreaInsets();
  return withTabBar
    ? TAB_BAR_HEIGHT + insets.bottom + BOTTOM_EXTRA
    : insets.bottom + BOTTOM_EXTRA;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ScreenWrapperProps {
  children: React.ReactNode;
  /**
   * When true, ScreenWrapper owns the ScrollView.
   * paddingTop + paddingBottom are applied automatically to the contentContainerStyle.
   */
  scrollable?: boolean;
  /** Outer container style override. */
  style?: ViewStyle;
  /** contentContainerStyle override (merged after computed padding). */
  contentContainerStyle?: ViewStyle;
  /** Remove default horizontal padding. Defaults to false. */
  noHorizontalPadding?: boolean;
  /**
   * Whether to add bottom tab-bar clearance.
   * Only applies when scrollable=true.
   * For non-scrollable screens, inner ScrollViews must call useScreenBottomInset().
   */
  withBottomInset?: boolean;
  /**
   * Content rendered ABOVE/OUTSIDE the scroll area (fixed headers, StatusBars, Modals).
   * Rendered before the scroll or inner view.
   */
  fixedContent?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ScreenWrapper({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  noHorizontalPadding = false,
  withBottomInset = true,
  fixedContent,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const darkMode = useAppStore(state => state.darkMode);
  const theme = darkMode ? DarkColors : LightColors;

  const hPad = noHorizontalPadding ? 0 : SCREEN_H_PADDING;
  const paddingTop = insets.top;
  const paddingBottom = withBottomInset
    ? TAB_BAR_HEIGHT + insets.bottom + BOTTOM_EXTRA
    : insets.bottom + BOTTOM_EXTRA;

  // Ensure Android status bar is always transparent with no background rectangle
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }, style]}>
      {fixedContent}

      {scrollable ? (
        // ── Managed scroll: wrapper owns the ScrollView ──────────────────────
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            { paddingTop, paddingBottom, paddingHorizontal: hPad },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        // ── Non-scrollable: only paddingTop applied ───────────────────────────
        // paddingBottom is intentionally omitted here so inner ScrollViews fill
        // the remaining space. Call useScreenBottomInset() in your inner ScrollView.
        <View
          style={[
            styles.inner,
            { paddingTop, paddingHorizontal: hPad },
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F4',
  },
  inner: {
    flex: 1,
  },
});

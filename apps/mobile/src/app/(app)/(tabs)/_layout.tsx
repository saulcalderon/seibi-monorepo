import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { ActionsButton } from '@/shell/actions-button';

/**
 * The app's three tabs: Inicio · Mi flota · Avisos (Estimados joins with
 * S10, by OTA). The system draws the bar: Liquid Glass on iOS 26, Material 3
 * on Android. Each tab is a stack of its own, in `(home,fleet,reminders)/`.
 * Tabs are static: adding one is a code change, never a runtime toggle (it
 * would remount the navigator and lose every tab's place).
 *
 * The [+] is drawn over the tabs, outside them (NativeTabs has no slot for
 * it). The bar never minimizes on scroll, so the [+] always sits just above
 * it.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const android = process.env.EXPO_OS === 'android';
  return (
    <View style={styles.root}>
      <NativeTabs
        minimizeBehavior="never"
        // Selected label and icon: radiant as text passes AA (radiantText); the rest are muted.
        tintColor={theme.colors.radiantText}
        iconColor={{ default: theme.colors.muted, selected: theme.colors.radiantText }}
        labelStyle={{
          default: { fontFamily: theme.fonts.sans[500], color: theme.colors.muted },
          selected: { fontFamily: theme.fonts.sans[600], color: theme.colors.radiantText },
        }}
        backgroundColor={android ? theme.colors.surface : undefined}
        indicatorColor={android ? theme.colors.radiantSoft : undefined}
        labelVisibilityMode="labeled"
      >
        <NativeTabs.Trigger name="(home)" testID="tab-home">
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
          <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(fleet)" testID="tab-fleet">
          <NativeTabs.Trigger.Icon sf={{ default: 'car', selected: 'car.fill' }} md="directions_car" />
          <NativeTabs.Trigger.Label>{t('tabs.fleet')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(reminders)" testID="tab-reminders">
          <NativeTabs.Trigger.Icon sf={{ default: 'bell', selected: 'bell.fill' }} md="notifications" />
          <NativeTabs.Trigger.Label>{t('tabs.reminders')}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <ActionsButton />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
}));

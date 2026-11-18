import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useGarage } from '@/data/garage/use-garage';
import { Button, IconButton } from '@/ui/button';
import { ErrorState, Skeleton, SkeletonGroup, TextSkeleton } from '@/ui/feedback';
import { Text } from '@/ui/text';

/*
 * The pieces Avisos' sheets share (`reminder`, `last-done`, `new-reminder`):
 * the title with «Cerrar», a message in place of the content, and an error
 * line. Perfil's sheets draw the same.
 */

/** The sheet's title, an optional line under it, and «Cerrar». */
export function SheetHeader({ title, body, testID }: { title: string; body?: string; testID: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text testID={`${testID}-title`} step="title3" family="display" heading style={styles.title}>
          {title}
        </Text>
        <IconButton testID={`${testID}-close`} icon="close" label={t('reminders.detail.close')} onPress={() => router.back()} />
      </View>
      {body ? (
        <Text step="subhead" tone="muted">
          {body}
        </Text>
      ) : null}
    </View>
  );
}

/** A sheet with a message instead of its content (loading, a load error, a stale link), and «Cerrar». */
export function SheetMessage({ children, testID }: { children: ReactNode; testID: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View testID={testID} style={styles.message}>
      {children}
      <Button variant="secondary" block label={t('reminders.detail.close')} onPress={() => router.back()} />
    </View>
  );
}

/**
 * Draws a sheet once the garage is in hand: the tab under it has usually
 * loaded it already; a sheet opened by a link waits for it, or offers
 * «Reintentar».
 */
export function WithGarage({ children, testID }: { children: (garage: ReturnType<typeof useGarage>) => ReactNode; testID: string }) {
  const { theme } = useUnistyles();
  const garage = useGarage();
  if (garage.isLoading) {
    return (
      <SheetMessage testID={`${testID}-loading`}>
        <SkeletonGroup>
          <TextSkeleton step="title3" width="55%" />
          <Skeleton width="100%" height={theme.size.field} round="xl" />
        </SkeletonGroup>
      </SheetMessage>
    );
  }
  if (garage.isError) {
    return (
      <SheetMessage testID={`${testID}-load-error`}>
        <ErrorState onRetry={garage.refetch} />
      </SheetMessage>
    );
  }
  return children(garage);
}

/** A save that failed, read out as it appears. */
export function SheetError({ message, testID }: { message: string; testID: string }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text testID={testID} step="subhead" weight={500} tone="overdue">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    gap: theme.space[1],
    paddingTop: theme.space[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
  },
  title: {
    flex: 1,
  },
  message: {
    gap: theme.space[4],
    padding: theme.space[5],
  },
}));

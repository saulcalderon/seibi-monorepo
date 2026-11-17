import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useGarage } from '@/data/garage/use-garage';
import { useCorrectReading } from '@/data/mileage/mutations';
import { formatNumber } from '@/lib/format';
import { Button, IconButton } from '@/ui/button';
import { EmptyState, ErrorState, Skeleton, SkeletonGroup, TextSkeleton } from '@/ui/feedback';
import { MileageField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { Text } from '@/ui/text';
import { notify } from '@/ui/toast';
import { useUnsavedGuard } from '@/ui/use-unsaved-guard';

/**
 * «Corregir lectura», the content of the `correct-reading` form sheet: a wrong
 * number is fixed, never deleted (CONTEXT.md), and the date stays. Ported
 * from the PWA's CorrectReadingSheet (VehicleDetail.tsx).
 */
export function CorrectReadingForm({ readingId, vehicleId }: { readingId?: string; vehicleId?: string }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const garage = useGarage();

  if (garage.isLoading) {
    return (
      <SheetMessage testID="correct-loading">
        <SkeletonGroup>
          <TextSkeleton step="title3" width="55%" />
          <Skeleton width="100%" height={theme.size.field} round="xl" />
        </SkeletonGroup>
      </SheetMessage>
    );
  }
  if (garage.isError) {
    return (
      <SheetMessage testID="correct-load-error">
        <ErrorState onRetry={garage.refetch} />
      </SheetMessage>
    );
  }

  const vehicle = garage.vehicles.find((v) => v.id === vehicleId);
  const reading = vehicle?.readings.find((r) => r.id === readingId);
  if (!vehicle || !reading) {
    return (
      <SheetMessage testID="correct-missing" onClose={() => router.back()}>
        <EmptyState icon="vehicle" title={t('vehicleDetail.missing.title')} body={t('vehicleDetail.missing.body')} />
      </SheetMessage>
    );
  }
  return <CorrectReadingBody vehicleId={vehicle.id} measure={vehicle.measure} reading={reading.reading} readingId={reading.id} />;
}

function CorrectReadingBody({ readingId, reading, measure }: { vehicleId: string; measure: 'km' | 'mi'; reading: number; readingId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const correct = useCorrectReading();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Focused after the sheet settles: `autoFocus` races the formSheet's presentation on iOS. */
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    const focus = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(focus);
  }, []);

  const { leave } = useUnsavedGuard(digits !== '', {
    title: t('vehicleDetail.correct.discard.title'),
    message: t('vehicleDetail.correct.discard.body'),
    confirmLabel: t('vehicleDetail.correct.discard.confirm'),
    cancelLabel: t('vehicleDetail.correct.discard.cancel'),
  });

  const submit = async () => {
    const n = digits ? Number(digits) : null;
    if (n === null || n < 0) {
      setError(t('vehicleDetail.correct.invalid'));
      return;
    }
    try {
      await correct.mutateAsync({ readingId, reading: n });
      notify.success(t('vehicleDetail.correct.saved'));
      leave();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <FormLayout
      testID="correct-sheet"
      footer={
        <Button
          testID="correct-save"
          block
          size="lg"
          label={t('vehicleDetail.correct.save')}
          loading={correct.isPending}
          onPress={() => void submit()}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text testID="correct-title" step="title3" family="display" heading>
            {t('vehicleDetail.correct.title')}
          </Text>
          <Text step="footnote" tone="muted" style={styles.description}>
            {t('vehicleDetail.correct.description')}
          </Text>
        </View>
        <IconButton testID="correct-close" icon="close" label={t('mileage.close')} onPress={() => router.back()} />
      </View>

      <MileageField
        testID="correct-reading"
        label={t('vehicleDetail.correct.field')}
        value={digits ? Number(digits) : null}
        onChange={(n) => {
          setError(null);
          setDigits(n === null ? '' : String(n));
        }}
        measure={measure}
        placeholder={formatNumber(reading)}
        error={error}
        errorTestID="correct-error"
        ref={input}
      />
    </FormLayout>
  );
}

/** A loading, missing or error state in the sheet, with a way to close it. */
function SheetMessage({ children, onClose, testID }: { children: ReactNode; onClose?: () => void; testID: string }) {
  const { t } = useTranslation();
  return (
    <View testID={testID} style={styles.message}>
      {children}
      {onClose ? <Button testID={`${testID}-close`} variant="secondary" block label={t('mileage.close')} onPress={onClose} /> : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
    paddingTop: theme.space[4],
  },
  titleWrap: {
    flex: 1,
    gap: theme.space[1.5],
  },
  description: {},
  message: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.space[4],
    padding: theme.space[5],
    backgroundColor: theme.colors.bg,
  },
}));

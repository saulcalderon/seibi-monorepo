import { useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useGarage } from '@/data/garage/use-garage';
import { invoiceKind } from '@/data/service/invoice';
import { useInvoiceUrl } from '@/data/service/queries';
import { Button, IconButton } from '@/ui/button';
import { EmptyState, ErrorState, Skeleton, SkeletonGroup } from '@/ui/feedback';
import { Text } from '@/ui/text';

import { InvoiceImage } from './invoice-field';
import { findService } from './service-form';

/** How far the photo zooms with a pinch (iOS's scroll view; Android shows it fitted). */
const MAX_ZOOM = 4;

/**
 * A Service's invoice (S12), the PWA's «Factura»: the photo, fitted to the
 * screen, from a link that lasts five minutes. A PDF the PWA uploaded opens
 * in the system browser, which reads PDFs. Opened from the Service's card in
 * the Vehicle's Historial.
 */
export function InvoiceViewer({ serviceId }: { serviceId?: string }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const garage = useGarage();
  const path = (serviceId && findService(garage.vehicles, serviceId)?.service.invoicePath) || null;
  const pdf = path !== null && invoiceKind(path) === 'pdf';
  const url = useInvoiceUrl(path);

  let body;
  if (garage.isLoading || (path && url.isPending)) {
    body = (
      <View style={styles.loading}>
        <SkeletonGroup testID="invoice-loading">
          <Skeleton width="100%" height={theme.size.stage.height} round="xl" />
        </SkeletonGroup>
      </View>
    );
  } else if (garage.isError || url.isError) {
    body = <ErrorState testID="invoice-error" onRetry={() => void (garage.isError ? garage.refetch() : url.refetch())} />;
  } else if (!path || !url.data) {
    body = <EmptyState testID="invoice-missing" icon="receipt" title={t('invoice.title')} body={t('invoice.missing')} />;
  } else if (pdf) {
    const link = url.data;
    body = (
      <View style={styles.pdf}>
        <Text step="body" tone="muted" align="center">
          {t('invoice.pdf')}
        </Text>
        <Button testID="invoice-open-pdf" variant="secondary" icon="external" label={t('invoice.openPdf')} onPress={() => void openBrowserAsync(link)} />
      </View>
    );
  } else {
    body = (
      <ScrollView
        maximumZoomScale={MAX_ZOOM}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.zoom}
      >
        <InvoiceImage testID="invoice-image" uri={url.data} fit="contain" label={t('invoice.photo')} style={styles.image} />
      </ScrollView>
    );
  }

  return (
    <View testID="invoice-viewer" style={styles.screen}>
      <View style={styles.header}>
        <Text step="title3" family="display" heading style={styles.title}>
          {t('invoice.title')}
        </Text>
        <IconButton testID="invoice-close" icon="close" label={t('invoice.close')} onPress={() => router.back()} />
      </View>
      {body}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    paddingBottom: rt.insets.bottom,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[5],
    paddingVertical: theme.space[4],
  },
  title: {
    flex: 1,
  },
  loading: {
    flex: 1,
    paddingHorizontal: theme.space[5],
  },
  zoom: {
    flexGrow: 1,
  },
  image: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space[4],
    padding: theme.space[6],
  },
}));

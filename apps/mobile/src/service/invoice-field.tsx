import { Image, type ImageStyle } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { invoicePreview, type InvoiceDraft, type InvoicePhoto } from '@/data/service/invoice';
import { useInvoiceUrl } from '@/data/service/queries';
import { IconButton } from '@/ui/button';
import { MenuButton } from '@/ui/controls';
import { Field } from '@/ui/fields';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { notify } from '@/ui/toast';

/**
 * The picker compresses the photo before it is uploaded (no image library in
 * the binary): JPEG at 60 %, enough to read a receipt at a fraction of the
 * camera's size. `Compatible` makes iOS hand over a JPEG, not a HEIC.
 */
const PICK: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  exif: false,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

type Source = 'camera' | 'library';

function photoOf(result: ImagePicker.ImagePickerResult): InvoicePhoto | null {
  const asset = result.canceled ? null : result.assets[0];
  return asset ? { uri: asset.uri, mimeType: asset.mimeType ?? null, fileName: asset.fileName ?? null } : null;
}

/**
 * «Factura o recibo» in the Service form (the PWA's field, S12): «Adjuntar
 * foto» opens the system menu, «Tomar foto» or «Elegir de la galería». A new
 * photo and the Service's own invoice show as a thumbnail with «Quitar
 * factura»; the saved one can also be replaced. Nothing is uploaded or
 * deleted until the form is saved. Denying the camera explains why and
 * offers the library, which needs no permission of its own (the system's
 * photo picker), and Settings.
 */
export function InvoiceField({ value, onChange, error }: { value: InvoiceDraft; onChange: (next: InvoiceDraft) => void; error?: string | null }) {
  const { t } = useTranslation();

  const pick = async (source: Source) => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return explainDenied('camera');
      }
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(PICK) : await ImagePicker.launchImageLibraryAsync(PICK);
      const photo = photoOf(result);
      if (photo) onChange({ kind: 'new', photo });
    } catch {
      // No camera (the Simulator) says so and leaves the library. The library is the system's photo
      // picker, which needs no permission; only when the phone says access was denied does it explain.
      if (source === 'library' && (await ImagePicker.getMediaLibraryPermissionsAsync()).status === 'denied') explainDenied('library');
      else notify.error(t(source === 'camera' ? 'serviceForm.invoice.cameraFailed' : 'serviceForm.invoice.libraryFailed'));
    }
  };

  const explainDenied = (source: Source) => {
    Alert.alert(t(`serviceForm.invoice.denied.${source}.title`), t(`serviceForm.invoice.denied.${source}.body`), [
      { text: t('serviceForm.invoice.denied.cancel'), style: 'cancel' },
      { text: t('serviceForm.invoice.denied.settings'), onPress: () => void Linking.openSettings() },
      source === 'camera'
        ? { text: t('serviceForm.invoice.library'), onPress: () => void pick('library') }
        : { text: t('serviceForm.invoice.camera'), onPress: () => void pick('camera') },
    ]);
  };

  const menu = (text: string, testID: string) => (
    <MenuButton
      testID={testID}
      text={text}
      icon="camera"
      actions={[
        { id: 'camera', title: t('serviceForm.invoice.camera'), icon: 'camera' },
        { id: 'library', title: t('serviceForm.invoice.library'), icon: 'photo' },
      ]}
      onAction={(id) => void pick(id === 'camera' ? 'camera' : 'library')}
    />
  );

  return (
    <Field label={t('serviceForm.invoice.label')} optional error={error} errorTestID="service-invoice-error">
      {value.kind === 'none' ? (
        menu(t('serviceForm.invoice.attach'), 'service-invoice-attach')
      ) : (
        <View style={styles.stack}>
          <View testID="service-invoice" style={styles.row}>
            <Thumbnail invoice={value} />
            <Text step="subhead" weight={500} style={styles.rowText}>
              {t(value.kind === 'new' ? 'serviceForm.invoice.new' : 'serviceForm.invoice.saved')}
            </Text>
            <IconButton testID="service-invoice-remove" icon="close" label={t('serviceForm.invoice.remove')} onPress={() => onChange({ kind: 'none' })} />
          </View>
          {value.kind === 'saved' ? menu(t('serviceForm.invoice.replace'), 'service-invoice-replace') : null}
        </View>
      )}
    </Field>
  );
}

/** The invoice's picture: a new photo from the phone, a saved one through a signed link, a PDF as an icon. */
function Thumbnail({ invoice }: { invoice: InvoiceDraft }) {
  const preview = invoicePreview(invoice);
  const url = useInvoiceUrl(preview?.source === 'signed' ? preview.path : null);
  const uri = preview?.source === 'local' ? preview.uri : url.data;
  if (!uri) {
    return (
      <View style={styles.thumb}>
        <Icon name={preview?.source === 'pdf' ? 'document' : 'receipt'} size="md" tone="muted" />
      </View>
    );
  }
  return <InvoiceImage uri={uri} fit="cover" style={styles.thumb} />;
}

/**
 * An invoice photo. Invoices are personal, so `expo-image` keeps them in
 * memory only, never in its disk cache. Silent for VoiceOver and TalkBack
 * unless it has a label.
 */
export function InvoiceImage({ uri, fit, label, style, testID }: { uri: string; fit: 'cover' | 'contain'; label?: string; style?: ImageStyle; testID?: string }) {
  return (
    <Image
      testID={testID}
      source={{ uri }}
      cachePolicy="memory"
      contentFit={fit}
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      accessibilityIgnoresInvertColors
      style={style}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  stack: {
    gap: theme.space[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    padding: theme.space[2],
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    borderWidth: theme.size.border.thin,
    borderColor: theme.colors.line,
  },
  rowText: {
    flex: 1,
  },
  thumb: {
    width: theme.size.tile.lg,
    height: theme.size.tile.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: theme.colors.surface2,
  },
}));

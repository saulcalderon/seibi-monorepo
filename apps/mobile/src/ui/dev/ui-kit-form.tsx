import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, IconButton } from '@/ui/button';
import { DateField } from '@/ui/controls';
import { MileageField, NumberField, TextAreaField, TextField } from '@/ui/fields';
import { FormLayout } from '@/ui/form';
import { Text } from '@/ui/text';
import { notify } from '@/ui/toast';

/**
 * A sample form in a `formSheet` (the PWA's Sheet becomes a native sheet):
 * fields of every kind and a save button that rides above the keyboard.
 * Saving checks the Mileage, shows a toast and closes the sheet. Seibi Dev
 * only, like the sample screen (`src/app/ui-kit/form.tsx`).
 */
export function UIKitFormSheet() {
  const { t } = useTranslation();
  const [shop, setShop] = useState('');
  const [mileage, setMileage] = useState<number | null>(null);
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(() => new Date(2026, 10, 12));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (mileage === null) {
      setError(t('uiKit.form.mileageRequired'));
      return;
    }
    notify.success(t('uiKit.form.saved'));
    router.back();
  };

  return (
    <FormLayout
      testID="kit-form"
      footer={<Button testID="kit-form-save" block size="lg" label={t('uiKit.form.save')} onPress={save} />}
    >
      <View style={styles.header}>
        <View style={styles.title}>
          <Text step="title3" family="display" heading>
            {t('uiKit.form.title')}
          </Text>
          <Text step="subhead" tone="muted">
            {t('uiKit.form.description')}
          </Text>
        </View>
        <IconButton testID="kit-form-close" icon="close" label={t('uiKit.form.close')} onPress={() => router.back()} />
      </View>
      <TextField testID="kit-form-shop" label={t('uiKit.fields.shop')} value={shop} onChangeText={setShop} returnKeyType="next" />
      <MileageField
        testID="kit-form-mileage"
        label={t('uiKit.fields.mileage')}
        placeholder={t('uiKit.fields.mileagePlaceholder')}
        measure="km"
        value={mileage}
        error={error}
        onChange={(value) => {
          setMileage(value);
          setError(null);
        }}
      />
      <NumberField
        testID="kit-form-cost"
        label={t('uiKit.fields.cost')}
        kind="decimal"
        optional
        placeholder={t('uiKit.fields.costPlaceholder')}
        suffix={t('uiKit.fields.costSuffix')}
        value={cost}
        onChangeText={setCost}
      />
      <DateField label={t('uiKit.native.date')} value={date} onChange={setDate} />
      <TextAreaField
        testID="kit-form-notes"
        label={t('uiKit.fields.notes')}
        optional
        placeholder={t('uiKit.fields.notesPlaceholder')}
        value={notes}
        onChangeText={setNotes}
      />
    </FormLayout>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
    paddingTop: theme.space[4],
  },
  title: {
    flex: 1,
    gap: theme.space[1],
  },
}));

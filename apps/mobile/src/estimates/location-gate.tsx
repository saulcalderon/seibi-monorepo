import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { errorMessage } from '@/data/errors';
import { COUNTRIES, countryName, type Country } from '@/data/profile/countries';
import { useProfile, useUpdateProfile } from '@/data/profile/queries';
import { canContinueCity, CITY_MAX } from '@/onboarding/flow';
import { Button } from '@/ui/button';
import { Card, IconTile } from '@/ui/card';
import { SelectField } from '@/ui/controls';
import { ErrorState } from '@/ui/feedback';
import { TextField } from '@/ui/fields';
import { Text } from '@/ui/text';

/** Whether Estimados knows where the Vehicle is: both panels wait for the profile's country. */
export function useLocated() {
  return Boolean(useProfile().data?.country);
}

/**
 * Estimates need a country and city: asks right here when the profile has
 * none, as the PWA. It guards both panels, the price form and the chat.
 */
export function LocationGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const profile = useProfile();
  const update = useUpdateProfile();
  const [country, setCountry] = useState<Country>('SV');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (profile.isLoading) return null;
  // Without the profile the form could save over a location the person already has.
  if (profile.isError) return <ErrorState testID="estimates-profile-error" onRetry={() => void profile.refetch()} />;
  if (profile.data?.country) return children;

  const save = () => {
    if (!canContinueCity(city) || update.isPending) return;
    setError(null);
    update.mutate({ country, city }, { onError: (cause) => setError(errorMessage(cause, t)) });
  };

  return (
    <Card testID="estimates-location" style={styles.location}>
      <View style={styles.locationHead}>
        <IconTile icon="location" />
        <View style={styles.grow}>
          <Text step="callout" weight={700} heading>
            {t('estimates.location.title')}
          </Text>
          <Text step="footnote" tone="muted">
            {t('estimates.location.body')}
          </Text>
        </View>
      </View>
      <SelectField
        testID="estimates-location-country"
        label={t('estimates.location.country')}
        value={country}
        onChange={setCountry}
        options={COUNTRIES.map((c) => ({ value: c.id, label: t('estimates.location.countryOption', { flag: c.flag, name: countryName(c.id, t) }) }))}
      />
      <TextField
        testID="estimates-location-city"
        label={t('estimates.location.city')}
        placeholder={t('estimates.location.cityPlaceholder')}
        value={city}
        onChangeText={(text) => {
          setCity(text);
          setError(null);
        }}
        error={error}
        autoCapitalize="words"
        maxLength={CITY_MAX}
        textContentType="addressCity"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <Button
        testID="estimates-location-save"
        variant="secondary"
        block
        loading={update.isPending}
        disabled={!canContinueCity(city)}
        label={t('estimates.location.save')}
        onPress={save}
      />
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  grow: {
    flex: 1,
    minWidth: 0,
    gap: theme.space[0.5],
  },
  location: {
    gap: theme.space[4],
    padding: theme.space[5],
  },
  locationHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
  },
}));

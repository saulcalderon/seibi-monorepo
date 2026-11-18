import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { errorMessage } from '@/data/errors';
import { COUNTRIES, countryName } from '@/data/profile/countries';
import { useUpdateProfile } from '@/data/profile/queries';
import { canContinueCity, CITY_MAX } from '@/onboarding/flow';
import { useFirstRun, useStep } from '@/onboarding/state';
import { FirstRunStep } from '@/onboarding/step';
import { Button } from '@/ui/button';
import { SelectField } from '@/ui/controls';
import { TextField } from '@/ui/fields';
import { Text } from '@/ui/text';

/** «¿Dónde usas tu Vehículo?»: country and city (`profiles.country`, `profiles.city`), for Estimates and the plan. */
export default function LocationStep() {
  const { t } = useTranslation();
  const { country, setCountry, city, setCity } = useFirstRun();
  const { advance } = useStep('location');
  const update = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);
  const ready = canContinueCity(city);

  const next = () => {
    if (!ready || update.isPending) return;
    setError(null);
    // Unlike the name, the PWA waits for this save before moving on.
    update.mutateAsync({ country, city }).then(advance, (cause: unknown) => setError(errorMessage(cause, t)));
  };

  return (
    <FirstRunStep
      step="location"
      title={t('onboarding.location.title')}
      body={t('onboarding.location.body')}
      footer={
        <Button
          testID="first-run-location-continue"
          block
          size="lg"
          variant="inverse"
          trailingIcon="next"
          disabled={!ready}
          loading={update.isPending}
          label={t('onboarding.continue')}
          onPress={next}
        />
      }
    >
      <SelectField
        testID="first-run-location-country"
        label={t('onboarding.location.country')}
        value={country}
        onChange={setCountry}
        options={COUNTRIES.map((c) => ({ value: c.id, label: t('onboarding.location.countryOption', { flag: c.flag, name: countryName(c.id, t) }) }))}
      />
      <TextField
        testID="first-run-location-city"
        label={t('onboarding.location.city')}
        placeholder={t(country === 'SV' ? 'onboarding.location.cityPlaceholderSV' : 'onboarding.location.cityPlaceholderUS')}
        value={city}
        onChangeText={(text) => {
          setCity(text);
          setError(null);
        }}
        autoCapitalize="words"
        maxLength={CITY_MAX}
        textContentType="addressCity"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={next}
      />
      {error ? (
        <Text testID="first-run-location-error" step="subhead" weight={500} tone="overdue" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </FirstRunStep>
  );
}

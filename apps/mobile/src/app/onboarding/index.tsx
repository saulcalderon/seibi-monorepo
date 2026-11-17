import { useTranslation } from 'react-i18next';

import { useUpdateProfile } from '@/data/profile/queries';
import { canContinueName, NAME_MAX } from '@/onboarding/flow';
import { useFirstRun, useStep } from '@/onboarding/state';
import { FirstRunStep } from '@/onboarding/step';
import { Button } from '@/ui/button';
import { TextField } from '@/ui/fields';

/** «¡Bienvenido a Seibi!»: the name Seibi calls you by (`profiles.display_name`). */
export default function NameStep() {
  const { t } = useTranslation();
  const { name, setName } = useFirstRun();
  const { advance } = useStep('name');
  const update = useUpdateProfile();
  const ready = canContinueName(name);

  const next = () => {
    if (!ready) return;
    // Saved in the background, as the PWA does; the next step doesn't wait for it.
    update.mutate({ displayName: name });
    advance();
  };

  return (
    <FirstRunStep
      step="name"
      title={t('onboarding.name.title')}
      body={t('onboarding.name.body')}
      footer={
        <Button testID="first-run-name-continue" block size="lg" variant="inverse" trailingIcon="next" disabled={!ready} label={t('onboarding.continue')} onPress={next} />
      }
    >
      <TextField
        testID="first-run-name-field"
        label={t('onboarding.name.label')}
        placeholder={t('onboarding.name.placeholder')}
        value={name}
        onChangeText={setName}
        maxLength={NAME_MAX}
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={next}
      />
    </FirstRunStep>
  );
}

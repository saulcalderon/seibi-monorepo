import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useGarage } from '@/data/garage/use-garage';
import { defaultMeasure } from '@/data/profile/countries';
import { useProfile } from '@/data/profile/queries';
import { useSaveRoutine } from '@/data/routine/mutations';
import { knowledgeProfile } from '@/lib/knowledge';
import { routineFromUsage, USAGE_PRESETS, type UsagePreset } from '@/onboarding/flow';
import { Option, OptionGroup } from '@/onboarding/option';
import { useFirstRun, useStep } from '@/onboarding/state';
import { FirstRunStep } from '@/onboarding/step';
import { Button } from '@/ui/button';
import { NumberField } from '@/ui/fields';

/** «¿Cómo usas tu Vehículo?»: a Routine for the new Vehicle, so Reminders can be projected before any reading. */
export default function UsageStep() {
  const { t } = useTranslation();
  const { vehicleId, level, country } = useFirstRun();
  const { advance } = useStep('usage');
  const profile = useProfile();
  const garage = useGarage();
  const save = useSaveRoutine();
  const [preset, setPreset] = useState<UsagePreset | null>(null);
  const [distance, setDistance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const explain = knowledgeProfile(level ?? profile.data?.knowledgeLevel).explain;
  // The Vehicle's measure, from the garage once it has refetched; until then the country's.
  const measure = garage.vehicles.find((v) => v.id === vehicleId)?.measure ?? defaultMeasure(country);

  const next = () => {
    if (!preset || !vehicleId || save.isPending) return;
    const result = routineFromUsage({ vehicleId, preset, distance }, t);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    save.mutateAsync(result.routine).then(advance, () => setError(t('onboarding.usage.saveFailed')));
  };

  return (
    <FirstRunStep
      step="usage"
      title={t('onboarding.usage.title')}
      body={t('onboarding.usage.body')}
      footer={
        <>
          <Button
            testID="first-run-usage-continue"
            block
            size="lg"
            variant="inverse"
            trailingIcon="next"
            disabled={!preset}
            loading={save.isPending}
            label={t('onboarding.continue')}
            onPress={next}
          />
          <Button testID="first-run-usage-skip" block size="lg" variant="ghost" label={t('onboarding.usage.skip')} onPress={advance} />
        </>
      }
    >
      <OptionGroup label={t('onboarding.usage.title')}>
        {USAGE_PRESETS.map((p) => (
          <Option
            key={p.id}
            testID={`first-run-usage-${p.id}`}
            title={t(`onboarding.usage.presets.${p.id}`)}
            selected={preset === p.id}
            onPress={() => setPreset(p.id)}
          />
        ))}
      </OptionGroup>
      {preset ? (
        <NumberField
          testID="first-run-usage-distance"
          errorTestID="first-run-usage-error"
          kind="decimal"
          label={t('onboarding.usage.distance')}
          suffix={t(`units.${measure}`)}
          hint={explain ? t('onboarding.usage.distanceHint') : undefined}
          error={error}
          value={distance}
          onChangeText={(text) => {
            setDistance(text);
            setError(null);
          }}
        />
      ) : null}
    </FirstRunStep>
  );
}

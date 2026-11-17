import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useGarage } from '@/data/garage/use-garage';
import { useSaveRoutine } from '@/data/routine/mutations';
import { routineFromUsage, USAGE_PRESETS, type UsagePreset } from '@/onboarding/flow';
import { Option, OptionGroup } from '@/onboarding/option';
import { useExplain, useFirstRun, useStep } from '@/onboarding/state';
import { FirstRunStep } from '@/onboarding/step';
import { Button } from '@/ui/button';
import { NumberField } from '@/ui/fields';

/** «¿Cómo usas tu Vehículo?»: a Routine for the new Vehicle, so Reminders can be projected before any reading. */
export default function UsageStep() {
  const { t } = useTranslation();
  const { vehicleId } = useFirstRun();
  const { advance } = useStep('usage');
  const garage = useGarage();
  const save = useSaveRoutine();
  const [preset, setPreset] = useState<UsagePreset | null>(null);
  const [distance, setDistance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const explain = useExplain();
  // The distance is in the Vehicle's measure, so it waits for the Vehicle (the PWA draws the step only then).
  const vehicle = garage.vehicles.find((v) => v.id === vehicleId);

  const next = () => {
    if (!preset || !vehicle || save.isPending) return;
    const result = routineFromUsage({ vehicleId: vehicle.id, preset, distance }, t);
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
            disabled={!preset || !vehicle}
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
      {preset && vehicle ? (
        <NumberField
          testID="first-run-usage-distance"
          errorTestID="first-run-usage-error"
          kind="decimal"
          label={t('onboarding.usage.distance')}
          suffix={t(`units.${vehicle.measure}`)}
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

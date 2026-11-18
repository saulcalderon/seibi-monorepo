import { useTranslation } from 'react-i18next';

import { useExplain, useStep } from '@/onboarding/state';
import { FirstRunScreen, StepDots, StepHeading } from '@/onboarding/step';
import { Button } from '@/ui/button';
import { VehicleForm } from '@/vehicle/vehicle-form';

/**
 * «Agrega tu Vehículo»: the first Vehicle, with S5's Vehicle form, or «Lo
 * agrego después». Either way the questions end here, as in the live PWA:
 * «Se guardó tu información», then Inicio.
 */
export default function VehicleStep() {
  const { t } = useTranslation();
  const { advance } = useStep('vehicle');
  const explain = useExplain();
  return (
    <FirstRunScreen testID="first-run-vehicle">
      <VehicleForm
        vehicle={null}
        firstRun
        testID="first-run-vehicle-form"
        submitLabel={t('onboarding.vehicle.submit')}
        onSaved={advance}
        header={<StepHeading step="vehicle" title={t('onboarding.vehicle.title')} body={t(explain ? 'onboarding.vehicle.bodyExplain' : 'onboarding.vehicle.body')} />}
        footerExtra={
          <>
            <Button testID="first-run-vehicle-later" block size="lg" variant="ghost" label={t('onboarding.vehicle.later')} onPress={advance} />
            <StepDots step="vehicle" />
          </>
        }
      />
    </FirstRunScreen>
  );
}

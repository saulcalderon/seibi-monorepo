import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useProfile } from '@/data/profile/queries';
import { knowledgeProfile } from '@/lib/knowledge';
import { useFirstRun, useStep } from '@/onboarding/state';
import { FirstRunScreen, FirstRunStep, StepDots, StepHeading } from '@/onboarding/step';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { VehicleForm } from '@/vehicle/vehicle-form';

/**
 * «Agrega tu Vehículo»: the first Vehicle, with S5's Vehicle form, or «Lo
 * agrego después». Coming back to it after adding one shows «Vehículo
 * agregado» instead of a second form.
 */
export default function VehicleStep() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile();
  const { level, vehicleId, setVehicleId } = useFirstRun();
  const { advance } = useStep('vehicle');
  const explain = knowledgeProfile(level ?? profile.data?.knowledgeLevel).explain;
  const title = t('onboarding.vehicle.title');
  const body = t(explain ? 'onboarding.vehicle.bodyExplain' : 'onboarding.vehicle.body');

  // With a Vehicle, how it is used comes next (`nextStep` with a Vehicle).
  const onSaved = useCallback(
    (id: string) => {
      setVehicleId(id);
      router.push('/onboarding/usage');
    },
    [router, setVehicleId],
  );

  if (vehicleId) {
    return (
      <FirstRunStep
        step="vehicle"
        title={title}
        body={body}
        footer={<Button testID="first-run-vehicle-continue" block size="lg" variant="inverse" trailingIcon="next" label={t('onboarding.continue')} onPress={advance} />}
      >
        <View style={styles.added} accessible accessibilityRole="text" testID="first-run-vehicle-added">
          <Icon name="check" size="md" tone="ok" />
          <Text step="body" weight={600} tone="ok">
            {t('onboarding.vehicle.added')}
          </Text>
        </View>
      </FirstRunStep>
    );
  }

  return (
    <FirstRunScreen testID="first-run-vehicle">
      <VehicleForm
        vehicle={null}
        firstRun
        testID="first-run-vehicle-form"
        submitLabel={t('onboarding.vehicle.submit')}
        onSaved={onSaved}
        header={<StepHeading step="vehicle" title={title} body={body} />}
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

const styles = StyleSheet.create((theme) => ({
  added: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    padding: theme.space[4],
    borderRadius: theme.radius['2xl'],
    borderCurve: 'continuous',
    backgroundColor: theme.colors.okSoft,
  },
}));

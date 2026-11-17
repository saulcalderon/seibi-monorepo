import { useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { VehicleView } from '@/data/garage/types';
import { paintLabel } from '@/lib/paint';
import { useWithdrawWithConfirm } from '@/vehicle/use-withdraw';
import { Button } from '@/ui/button';
import { Card, RowDivider, SectionHeader } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * Datos: the Vehicle's facts, «Editar datos», the maintenance plan's sources
 * (each opens in the system browser), the illustration note and «Retirar de
 * mi flota», which withdraws after the native confirm and leaves for Mi flota.
 * Ported from the PWA's DataTab.
 */
export function DataTab({ vehicle }: { vehicle: VehicleView }) {
  const { t } = useTranslation();
  const router = useRouter();
  const withdraw = useWithdrawWithConfirm();

  const rows: Array<[string, string | null]> = [
    [t('vehicleDetail.data.rows.brand'), vehicle.brand],
    [t('vehicleDetail.data.rows.model'), vehicle.model],
    [t('vehicleDetail.data.rows.year'), String(vehicle.year)],
    [t('vehicleDetail.data.rows.trim'), vehicle.trimLevel],
    [t('vehicleDetail.data.rows.engine'), vehicle.engine],
    [t('vehicleDetail.data.rows.color'), vehicle.color ? paintLabel(vehicle.color, t) : null],
    [t('vehicleDetail.data.rows.plate'), vehicle.plate],
    [t('vehicleDetail.data.rows.measure'), vehicle.measure === 'km' ? t('vehicleDetail.data.rows.km') : t('vehicleDetail.data.rows.mi')],
  ];

  const retire = async () => {
    if (await withdraw.run(vehicle)) router.replace('/fleet');
  };

  return (
    <View style={styles.tab}>
      <Card testID="data-rows">
        {rows.map(([label, value], index) => (
          <View key={label}>
            {index > 0 ? <RowDivider /> : null}
            <View style={styles.row} testID={`data-row-${index}`}>
              <Text step="subhead" tone="muted">
                {label}
              </Text>
              <Text step="subhead" weight={value ? 600 : 400} tone={value ? 'ink' : 'subtle'} style={styles.rowValue}>
                {value ?? t('vehicleDetail.data.rows.none')}
              </Text>
            </View>
          </View>
        ))}
      </Card>
      <Button
        testID="data-edit"
        variant="secondary"
        icon="edit"
        block
        label={t('vehicleDetail.data.edit')}
        onPress={() => router.push(`/vehicle/${vehicle.id}/edit`)}
      />

      {vehicle.schedule && vehicle.schedule.sources.length > 0 ? (
        <View style={styles.section} testID="data-sources">
          <SectionHeader title={t('vehicleDetail.data.sources')} />
          <Card>
            {vehicle.schedule.sources.map((source, index) => (
              <View key={source.url}>
                {index > 0 ? <RowDivider /> : null}
                <Pressable
                  testID={`data-source-${index}`}
                  accessibilityRole="link"
                  accessibilityLabel={t('vehicleDetail.data.openA11y', { title: source.title })}
                  onPress={() => void openBrowserAsync(source.url)}
                  style={styles.row}
                >
                  <Text step="footnote" weight={600} style={styles.rowValue} numberOfLines={1}>
                    {source.title}
                  </Text>
                  <Icon name="external" size="sm" tone="muted" />
                </Pressable>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <Text step="footnote" tone="subtle" style={styles.artNote}>
        {t('vehicleDetail.data.artNote')}
      </Text>

      <Button
        testID="data-withdraw"
        variant="danger"
        icon="archive"
        block
        loading={withdraw.isPending}
        label={t('vehicleDetail.data.withdraw')}
        onPress={() => void retire()}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  tab: {
    gap: theme.space[6],
  },
  section: {
    gap: theme.space[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    minHeight: theme.size.target,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  artNote: {
    paddingHorizontal: theme.space[1],
  },
}));

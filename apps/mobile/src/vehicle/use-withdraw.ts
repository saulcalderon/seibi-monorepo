import { useTranslation } from 'react-i18next';

import { errorMessage } from '@/data/errors';
import type { VehicleView } from '@/data/garage/types';
import { useRestoreVehicle, useWithdrawVehicle } from '@/data/vehicle/mutations';
import { todayIso, vehicleName } from '@/lib/format';
import { confirm, notify } from '@/ui/toast';

import { withdrawMessage } from './withdraw-message';

/**
 * Withdraws a Vehicle after the native alert asks first (the PWA's withdraw
 * sheet). It leaves Mi flota and Inicio and can be restored for 30 days.
 * Resolves `true` once it is withdrawn. Vehicle detail (S6) uses it too.
 */
export function useWithdrawWithConfirm() {
  const { t } = useTranslation();
  const withdraw = useWithdrawVehicle();
  const run = async (vehicle: VehicleView) => {
    const ok = await confirm({
      title: t('withdraw.title', { name: vehicleName(vehicle) }),
      message: withdrawMessage(vehicle, todayIso(), t),
      confirmLabel: t('withdraw.confirm'),
      cancelLabel: t('withdraw.cancel'),
      destructive: true,
    });
    if (!ok) return false;
    try {
      await withdraw.mutateAsync(vehicle.id);
      notify.success(t('withdraw.done'));
      return true;
    } catch (error) {
      notify.error(errorMessage(error, t));
      return false;
    }
  };
  return { run, isPending: withdraw.isPending };
}

/** Puts a withdrawn Vehicle back in Mi flota, with a toast either way. */
export function useRestoreWithToast() {
  const { t } = useTranslation();
  const restore = useRestoreVehicle();
  const run = async (vehicleId: string) => {
    try {
      await restore.mutateAsync(vehicleId);
      notify.success(t('fleet.withdrawn.restored'));
    } catch (error) {
      notify.error(errorMessage(error, t));
    }
  };
  return { run, isPending: restore.isPending, pendingId: restore.isPending ? restore.variables : undefined };
}

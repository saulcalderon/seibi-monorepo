import { daysBetween } from '@seibi/maintenance-engine/days';
import type { TFunction } from 'i18next';

/** What the withdraw question says about the Vehicle's record (the PWA's `recordSpan`). */
export type WithdrawSubject = {
  createdAt: string;
  services: { performedOn: string }[];
};

/** How long the Vehicle has a record: from its first Service (or when it was added) to today. */
export function recordSpan(vehicle: WithdrawSubject, today: string, t: TFunction) {
  const start = [...vehicle.services.map((service) => service.performedOn), vehicle.createdAt.slice(0, 10)].sort()[0] ?? today;
  const days = Math.max(0, daysBetween(start, today));
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return years === 1 ? t('withdraw.spanYearOne') : t('withdraw.spanYears', { count: years });
  }
  return days === 1 ? t('withdraw.spanDayOne') : t('withdraw.spanDays', { count: days });
}

/** The withdraw question's body: the record it keeps, and the 30 days to restore it. */
export function withdrawMessage(vehicle: WithdrawSubject, today: string, t: TFunction) {
  const count = vehicle.services.length;
  const services = count === 0 ? '' : count === 1 ? t('withdraw.servicesOne') : t('withdraw.servicesMany', { count });
  return t('withdraw.body', { span: recordSpan(vehicle, today, t), services });
}

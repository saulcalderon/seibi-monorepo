// One line of plain words for a derived Reminder, ported from the PWA's
// lib/reminderText.ts. The words are in es.json; numbers use format.ts.
import { daysBetween } from '@seibi/maintenance-engine/days';
import type { OdometerMeasure } from '@seibi/maintenance-engine/odometer';
import type { Reminder } from '@seibi/maintenance-engine/reminders';
import type { TFunction } from 'i18next';

import { formatNumber, relativeDays, relativeDaysLead, todayIso } from '@/lib/format';

/** Where a derived Reminder stands: «Vencido por 1,200 km», «En 450 km · aprox. en 20 días». */
export function reminderDueText(r: Reminder, measure: OdometerMeasure, t: TFunction, today = todayIso()): string {
  if (r.status === 'unknown') {
    return r.unknownReason === 'dont_know' ? t('reminderText.unknownDontKnow') : t('reminderText.unknownAsk');
  }
  const distance = r.remainingDistance;
  const days = r.remainingDays;
  if (r.status === 'overdue') {
    if (distance != null && distance <= 0) {
      return t('reminderText.overdueBy', { distance: formatNumber(Math.abs(distance)), measure });
    }
    if (r.dueOn) {
      const ago = daysBetween(r.dueOn, today);
      return ago <= 0 ? t('reminderText.dueToday') : t('reminderText.overdueSince', { when: relativeDays(-ago, t) });
    }
    return t('reminderText.overdue');
  }
  const byDistance = distance != null ? t('reminderText.inDistance', { distance: formatNumber(Math.max(0, distance)), measure }) : null;
  if (byDistance && days != null) {
    return t('reminderText.both', { distance: byDistance, time: t('reminderText.about', { when: relativeDays(days, t) }) });
  }
  if (byDistance) return byDistance;
  if (days != null) return relativeDaysLead(days, t);
  return t('reminderText.ok');
}

/** The interval a Reminder applies: «Cada 5,000 km o 6 meses, lo que llegue primero». */
export function intervalText(r: Reminder, measure: OdometerMeasure, t: TFunction): string | null {
  const parts: string[] = [];
  if (r.interval.distance) {
    parts.push(t('reminderText.everyDistance', { distance: formatNumber(r.interval.distance), measure }));
  }
  if (r.interval.months) {
    parts.push(r.interval.months === 1 ? t('reminderText.everyMonth') : t('reminderText.everyMonths', { n: r.interval.months }));
  }
  if (parts.length === 2) return t('reminderText.everyEither', { first: parts[0], second: parts[1] });
  if (parts.length === 1) return t('reminderText.every', { interval: parts[0] });
  return null;
}

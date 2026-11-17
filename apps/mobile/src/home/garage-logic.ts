// What Inicio decides, as plain functions (no React Native), so the unit
// tests cover it: the status cards and their summary, the Mileage hint and
// the carousel's steps. Ported from the PWA's apps/app/src/screens/Home.tsx.
import type { MileagePrompt } from '@seibi/maintenance-engine/mileage-prompt';
import type { Reminder } from '@seibi/maintenance-engine/reminders';
import type { TFunction } from 'i18next';

import { relativeDays } from '@/lib/format';

const RANK = { overdue: 0, soon: 1, ok: 2, unknown: 3 } as const;

/** Inicio shows at most this many status cards (a 2 × 2). */
export const STATUS_CARDS = 4;

export interface GarageStatus {
  /** Reminders with a known last Service and not snoozed: overdue first, then the most used. */
  known: Reminder[];
  /** How many of them need attention (overdue or soon). Zero is «Todo al día». */
  attention: number;
  /** Whether any of them is overdue: the summary turns red. */
  overdue: boolean;
}

/** The «Estado» section: which Reminders it shows and its summary. */
export function garageStatus(reminders: readonly Reminder[]): GarageStatus {
  const known = reminders
    .filter((r) => r.status !== 'unknown' && !r.snoozed)
    .sort((a, b) => RANK[a.status] - RANK[b.status] || b.used - a.used);
  const attention = known.filter((r) => r.status !== 'ok');
  return { known, attention: attention.length, overdue: attention.some((r) => r.status === 'overdue') };
}

/** How full a card's bar is, 0–100: an overdue task's is full. */
export function usedPercent(reminder: Pick<Reminder, 'status' | 'used'>) {
  if (reminder.status === 'overdue') return 100;
  return Math.round(Math.min(1, Math.max(0, reminder.used)) * 100);
}

/** The line under the odometer when Seibi wants a new reading; null when it doesn't. */
export function mileageHint(prompt: MileagePrompt, t: TFunction): string | null {
  if (!prompt.due) return null;
  if (prompt.reason === 'no_readings') return t('home.mileage.hintNoReadings');
  if (prompt.reason === 'no_usage') return t('home.mileage.hintNoUsage');
  return t('home.mileage.hintStale', { when: relativeDays(-(prompt.daysSinceLast ?? 0), t) });
}

/** The page a step lands on: the carousel wraps around at both ends, as the PWA's arrows do. */
export function stepIndex(index: number, delta: number, count: number) {
  if (count === 0) return 0;
  return (((index + delta) % count) + count) % count;
}

/** The page a scroll offset rests on, kept inside the pages. */
export function pageAt(offset: number, width: number, count: number) {
  if (width <= 0 || count === 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offset / width)));
}

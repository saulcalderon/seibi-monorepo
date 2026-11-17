// The first-run questions (Onboarding, CONTEXT.md), as plain functions: which
// screen opens, which step comes next, what each answer saves. Ported from
// the PWA's apps/app/src/screens/Onboarding.tsx and lib/routing.ts; the
// screens in src/app/onboarding/ only draw them.

import type { TFunction } from 'i18next';

import type { RememberedTask } from '@/data/reminder/mutations';
import type { RoutineInput } from '@/data/routine/mutations';
import { isoDate } from '@/lib/format';
import { calibrateLevel, type KnowledgeLevel } from '@/lib/knowledge';
import { parseNumber } from '@/lib/number';

/**
 * Where a signed-in person lands: the questions until Onboarding is finished
 * (`profiles.onboarded_at`), then Inicio. A profile that can't load opens
 * Inicio, as the PWA's `homePathFor` does: Inicio shows its own error.
 */
export function firstRunStatus({
  signedIn,
  profile,
  failed,
}: {
  signedIn: boolean;
  profile: { onboardedAt: string | null } | undefined;
  failed: boolean;
}): 'unknown' | 'due' | 'done' {
  if (!signedIn) return 'done';
  if (profile) return profile.onboardedAt ? 'done' : 'due';
  return failed ? 'done' : 'unknown';
}

export type Step = 'name' | 'level' | 'check' | 'result' | 'location' | 'vehicle' | 'usage' | 'history' | 'notifications';

/** The PWA's `ORDER`. Each step's eyebrow is `onboarding.category.<step>`. */
const ORDER: readonly Step[] = ['name', 'level', 'check', 'result', 'location', 'vehicle', 'usage', 'history', 'notifications'];

/** How the Vehicle is used and its last maintenance need a Vehicle; without one they are skipped. */
function stepsFor({ hasVehicle }: { hasVehicle: boolean }) {
  return ORDER.filter((step) => hasVehicle || (step !== 'usage' && step !== 'history'));
}

/** The step after `from`, or `done`: the confirmation, then Inicio. */
export function nextStep(from: Step, context: { hasVehicle: boolean }): Step | 'done' {
  const steps = stepsFor(context);
  return steps[steps.indexOf(from) + 1] ?? 'done';
}

/** Where `step` sits among the steps the person sees: «Paso N de M» and the dots. */
export function stepPosition(step: Step, context: { hasVehicle: boolean }) {
  const steps = stepsFor(context);
  return { index: steps.indexOf(step), count: steps.length };
}

/** «¿Cómo te llamamos?» starts from the saved name, else the first word of the account's full name. */
export function initialName(displayName: string | null | undefined, fullName: string | null | undefined) {
  return displayName ?? fullName?.split(' ')[0] ?? '';
}

/** The longest name the profile keeps (`profiles_display_name_length`). */
export const NAME_MAX = 60;

/** The longest city the profile keeps (`profiles_city_length`). */
export const CITY_MAX = 80;

export function canContinueName(name: string) {
  return name.trim().length > 0;
}

export function canContinueCity(city: string) {
  return city.trim().length >= 2;
}

/**
 * The Knowledge level saved after the last check question: the self-assessment
 * calibrated by the right answers (`calibrateLevel`). `picked[i]` is whether
 * the answer to question `i` was right; going back and answering again
 * replaces it.
 */
export function levelFromChecks(self: KnowledgeLevel, picked: readonly (boolean | undefined)[]): KnowledgeLevel {
  return calibrateLevel(self, picked.filter(Boolean).length);
}

/** «¿Cómo usas tu Vehículo?»: three patterns, each a Routine with its days per week. Labels: `onboarding.usage.presets.<id>`. */
export const USAGE_PRESETS = [
  { id: 'daily', days: 5 },
  { id: 'some', days: 3 },
  { id: 'weekend', days: 2 },
] as const;

export type UsagePreset = (typeof USAGE_PRESETS)[number]['id'];

/**
 * The Routine a usage answer saves, or the error to show under the distance.
 * The Routine's name is stored as text in Spanish, as the PWA saves it
 * (`onboarding.usage.routineNames.<id>`).
 */
export function routineFromUsage(
  { vehicleId, preset, distance }: { vehicleId: string; preset: UsagePreset; distance: string },
  t: TFunction,
): { routine: RoutineInput } | { error: string } {
  const roundTripDistance = parseNumber(distance);
  if (roundTripDistance === null || roundTripDistance <= 0) return { error: t('onboarding.usage.distanceRequired') };
  const days = USAGE_PRESETS.find((p) => p.id === preset)!.days;
  return { routine: { vehicleId, name: t(`onboarding.usage.routineNames.${preset}`), roundTripDistance, daysPerWeek: days } };
}

/** «Tu último mantenimiento» asks about these tasks. Questions: `onboarding.history.questions.<code>`. */
export const HISTORY_TASKS = ['engine_oil', 'tire_rotation', 'battery'] as const;

export type HistoryTask = (typeof HISTORY_TASKS)[number];

/** The answers, each a rough number of months ago (`null`: «No sé»). Labels: `onboarding.history.when.<id>`. */
export const WHEN = [
  { id: 'under3', months: 1 },
  { id: '3to6', months: 4 },
  { id: '6to12', months: 9 },
  { id: 'over12', months: 18 },
  { id: 'unknown', months: null },
] as const;

export type WhenAnswer = (typeof WHEN)[number]['id'];

function monthsAgo(months: number, today: Date) {
  const day = new Date(today);
  day.setMonth(day.getMonth() - months);
  return isoDate(day);
}

/**
 * What «Tu último mantenimiento» saves (`reminder_states`, through
 * `rememberTasks`): the answered tasks, in order, each dated that many months
 * back or kept as unknown. The oil filter is changed with the oil, so it is
 * remembered with it.
 */
export function rememberedFromHistory(answers: Partial<Record<HistoryTask, WhenAnswer>>, today: Date): RememberedTask[] {
  return HISTORY_TASKS.flatMap((task) => {
    const answer = answers[task];
    if (!answer) return [];
    const months = WHEN.find((w) => w.id === answer)!.months;
    const codes = task === 'engine_oil' ? ['engine_oil', 'oil_filter'] : [task];
    return codes.map((taskCode) => ({
      taskCode,
      rememberedOn: months === null ? null : monthsAgo(months, today),
      reading: null,
      unknown: months === null,
    }));
  });
}

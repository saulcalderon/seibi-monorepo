// The first-run questions (Onboarding, CONTEXT.md), as plain functions: which
// screen opens, which step comes next, what each answer saves. Ported from
// the PWA's apps/app/src/screens/Onboarding.tsx and lib/routing.ts; the
// screens in src/app/onboarding/ only draw them.

import { calibrateLevel, type KnowledgeLevel } from '@/lib/knowledge';

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

export type Step = 'name' | 'level' | 'check' | 'result' | 'location' | 'vehicle';

/**
 * The steps in the order the PWA asks them. Its code also has a Routine, a
 * last-maintenance and a push step, but the live PWA never shows them
 * (leaving the Vehicle step goes straight to the confirmation), and the port
 * follows the live PWA. Each step's eyebrow is `onboarding.category.<step>`.
 */
const ORDER: readonly Step[] = ['name', 'level', 'check', 'result', 'location', 'vehicle'];

/** The step after `from`, or `done`: «Se guardó tu información», then Inicio. The Vehicle step, added or skipped, ends the questions. */
export function nextStep(from: Step): Step | 'done' {
  return ORDER[ORDER.indexOf(from) + 1] ?? 'done';
}

/** Where `step` sits among the steps: «Paso N de M» and the dots. */
export function stepPosition(step: Step) {
  return { index: ORDER.indexOf(step), count: ORDER.length };
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

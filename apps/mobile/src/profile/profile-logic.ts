// Perfil (S11), as plain functions: what its rows say and what its sheets
// save. Ported from the PWA's apps/app/src/screens/Perfil.tsx; the screens in
// src/profile/ only draw them.
import type { TFunction } from 'i18next';

import { countryName, type Country } from '@/data/profile/countries';
import type { Profile } from '@/data/profile/queries';

/** The name on Perfil's card: the name Seibi calls you by, else the account's name, else its email. */
export function headerName(
  profile: Pick<Profile, 'displayName'> | undefined,
  identity: { fullName: string | null; email: string | null },
  t: TFunction,
) {
  return profile?.displayName ?? identity.fullName ?? identity.email ?? t('profile.fallbackName');
}

/** «Ubicación»'s subtitle: «Santa Ana, El Salvador», the country alone, or «Sin definir» without a country. */
export function locationSummary(profile: Pick<Profile, 'country' | 'city'> | undefined, t: TFunction) {
  const country: Country | null = profile?.country ?? null;
  if (!country) return t('profile.location.unset');
  const name = countryName(country, t);
  return profile?.city ? t('profile.location.summary', { city: profile.city, country: name }) : name;
}

/** «¿Cómo te llamamos?» starts from the saved name. */
export function nameDraft(profile: Pick<Profile, 'displayName'> | undefined) {
  return profile?.displayName ?? '';
}

/** «Ubicación» starts from the saved country and city; El Salvador when no country is saved, as the PWA. */
export function locationDraft(profile: Pick<Profile, 'country' | 'city'> | undefined): { country: Country; city: string } {
  return { country: profile?.country ?? 'SV', city: profile?.city ?? '' };
}

/**
 * Whether a sheet holds input it would lose on closing: a value that differs
 * from where the sheet started. Spaces at the ends don't count; the save
 * trims them (`useUpdateProfile`).
 */
export function unsaved<T extends Record<string, string>>(start: T, draft: T) {
  return Object.keys(start).some((key) => start[key].trim() !== draft[key].trim());
}

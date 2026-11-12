/** The name parts Apple returns, the first time only. */
export type AppleNameParts = {
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
  nickname?: string | null;
};

export type AppleName = {
  /** For `user_metadata.full_name`, which the PWA's Perfil reads. */
  fullName: string;
  givenName: string | null;
  familyName: string | null;
  /** For `profiles.display_name`: the first name, as the signup trigger writes it. Max 60 characters. */
  displayName: string;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** The name to save after the first Apple sign-in, or null when Apple sent none. */
export function appleName(parts: AppleNameParts | null | undefined): AppleName | null {
  const givenName = clean(parts?.givenName);
  const familyName = clean(parts?.familyName);
  const fullName = [givenName, clean(parts?.middleName), familyName].filter(Boolean).join(' ');
  const first = givenName ?? clean(parts?.nickname) ?? (fullName.split(' ')[0] || null);
  if (!fullName && !first) return null;
  return {
    fullName: fullName || (first as string),
    givenName,
    familyName,
    displayName: (first as string).slice(0, 60),
  };
}

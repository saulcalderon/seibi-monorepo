// Who is signed in, as the header avatar shows it. Ported from the PWA's
// apps/app/src/lib/identity.ts.
import type { User } from '@supabase/supabase-js';

function nonempty(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The name, email and picture Apple or Google gave the account, when they did. */
export function identityFromUser(user: User | null) {
  const metadata = user?.user_metadata ?? {};
  return {
    fullName: nonempty(metadata.full_name) ?? nonempty(metadata.name),
    email: nonempty(user?.email),
    avatarUrl: nonempty(metadata.avatar_url) ?? nonempty(metadata.picture),
  };
}

/** Up to two capital letters: «Ana López» → «AL», «e2e@seibi.test» → «E». */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

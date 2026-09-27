import type { User } from '@supabase/supabase-js'

function nonempty(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function identityFromUser(user: User | null) {
  const metadata = user?.user_metadata ?? {}
  const email = nonempty(user?.email)
  return {
    fullName: nonempty(metadata.full_name) ?? nonempty(metadata.name),
    email,
    avatarUrl: nonempty(metadata.avatar_url) ?? nonempty(metadata.picture),
  }
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

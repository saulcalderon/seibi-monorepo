import type { User } from '@supabase/supabase-js'

export type AuthIdentity = {
  displayName: string | null
  email: string | null
  avatarUrl: string | null
}

function nonempty(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function emailLocalPart(email: string | null): string | null {
  if (!email) return null
  const local = email.split('@')[0]?.trim() ?? ''
  return local.length > 0 ? local : null
}

export function authIdentityFromUser(user: User | null): AuthIdentity {
  if (!user) {
    return { displayName: null, email: null, avatarUrl: null }
  }

  const metadata = user.user_metadata
  const email = nonempty(user.email)
  const displayName =
    nonempty(metadata.full_name) ?? nonempty(metadata.name) ?? emailLocalPart(email)
  const avatarUrl = nonempty(metadata.avatar_url) ?? nonempty(metadata.picture)

  return { displayName, email, avatarUrl }
}

export function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

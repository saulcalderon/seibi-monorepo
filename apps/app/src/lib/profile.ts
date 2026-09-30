import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthSession } from './authSession'
import type { TablesUpdate } from './database.types'
import type { KnowledgeLevel } from './knowledge'
import { supabase } from './supabase'

export type Country = 'SV' | 'US'

export type Profile = {
  userId: string
  displayName: string | null
  country: Country | null
  city: string | null
  knowledgeLevel: KnowledgeLevel | null
  onboardedAt: string | null
  notificationsEnabled: boolean
}

export const COUNTRIES: Array<{ id: Country; name: string; flag: string }> = [
  { id: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { id: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
]

/** New Vehicles default to the measure on the dashboards sold in each country. */
export function defaultMeasure(country: Country | null | undefined) {
  return country === 'US' ? 'mi' : 'km'
}

export function profileQueryKey(userId: string) {
  return ['profile', userId] as const
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return {
    userId,
    displayName: data?.display_name ?? null,
    country: data?.country ?? null,
    city: data?.city ?? null,
    knowledgeLevel: data?.knowledge_level ?? null,
    onboardedAt: data?.onboarded_at ?? null,
    notificationsEnabled: data?.notifications_enabled ?? true,
  }
}

export function useProfile() {
  const { user } = useAuthSession()
  return useQuery({
    queryKey: profileQueryKey(user?.id ?? 'signed-out'),
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
  })
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    'displayName' | 'country' | 'city' | 'knowledgeLevel' | 'onboardedAt' | 'notificationsEnabled'
  >
>

export function useUpdateProfile() {
  const { user } = useAuthSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      if (!user) throw new Error('signed-out')
      const row: TablesUpdate<'profiles'> = {}
      if ('displayName' in patch) row.display_name = patch.displayName?.trim() || null
      if ('country' in patch) row.country = patch.country ?? null
      if ('city' in patch) row.city = patch.city?.trim() || null
      if ('knowledgeLevel' in patch) row.knowledge_level = patch.knowledgeLevel ?? null
      if ('onboardedAt' in patch) row.onboarded_at = patch.onboardedAt ?? null
      if ('notificationsEnabled' in patch) row.notifications_enabled = patch.notificationsEnabled
      const { error } = await supabase.from('profiles').update(row).eq('user_id', user.id)
      if (error) throw error
    },
    onMutate: async (patch) => {
      if (!user) return
      const key = profileQueryKey(user.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Profile>(key)
      if (previous) queryClient.setQueryData<Profile>(key, { ...previous, ...patch })
      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (user && context?.previous) {
        queryClient.setQueryData(profileQueryKey(user.id), context.previous)
      }
    },
    onSettled: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: profileQueryKey(user.id) })
    },
  })
}

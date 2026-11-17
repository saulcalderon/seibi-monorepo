import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { KnowledgeLevel } from '@/lib/knowledge';
import type { TablesUpdate } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { useUserId } from '../user';

import type { Country } from './countries';
import { profileKeys } from './keys';

export type Profile = {
  userId: string;
  displayName: string | null;
  country: Country | null;
  city: string | null;
  knowledgeLevel: KnowledgeLevel | null;
  /** Set when Onboarding is finished; until then the app opens Onboarding. */
  onboardedAt: string | null;
  notificationsEnabled: boolean;
};

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return {
    userId,
    displayName: data?.display_name ?? null,
    country: data?.country ?? null,
    city: data?.city ?? null,
    knowledgeLevel: data?.knowledge_level ?? null,
    onboardedAt: data?.onboarded_at ?? null,
    notificationsEnabled: data?.notifications_enabled ?? true,
  };
}

export function useProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: profileKeys.user(userId ?? 'signed-out'),
    queryFn: () => fetchProfile(userId!),
    enabled: userId !== null,
    staleTime: 5 * 60_000,
  });
}

export type ProfilePatch = Partial<
  Pick<Profile, 'displayName' | 'country' | 'city' | 'knowledgeLevel' | 'onboardedAt' | 'notificationsEnabled'>
>;

/** Saves part of the profile. The change shows at once and goes back if the save fails. */
export function useUpdateProfile() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      if (!userId) throw new Error('signed-out');
      const row: TablesUpdate<'profiles'> = {};
      if ('displayName' in patch) row.display_name = patch.displayName?.trim() || null;
      if ('country' in patch) row.country = patch.country ?? null;
      if ('city' in patch) row.city = patch.city?.trim() || null;
      if ('knowledgeLevel' in patch) row.knowledge_level = patch.knowledgeLevel ?? null;
      if ('onboardedAt' in patch) row.onboarded_at = patch.onboardedAt ?? null;
      if ('notificationsEnabled' in patch) row.notifications_enabled = patch.notificationsEnabled;
      const { error } = await supabase.from('profiles').update(row).eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      if (!userId) return;
      const key = profileKeys.user(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Profile>(key);
      if (previous) queryClient.setQueryData<Profile>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (userId && context?.previous) queryClient.setQueryData(profileKeys.user(userId), context.previous);
    },
    onSettled: () => {
      if (userId) return queryClient.invalidateQueries({ queryKey: profileKeys.user(userId) });
    },
  });
}

/** How long «Se guardó tu información» stays up before Inicio (the PWA's 2 s). */
const CONFIRMATION_MS = 2000;

/**
 * Finishes Onboarding: saves `onboarded_at`, then, once the confirmation has
 * been up its 2 s, puts it in the profile, which moves the root layout from
 * the questions to Inicio. Not optimistic, unlike `useUpdateProfile`: the
 * questions stay open until the save lands, so a failed save can be retried
 * there instead of starting over.
 */
export function useFinishFirstRun() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('signed-out');
      // A refetch still running from an earlier answer must not land after this with the old profile.
      await queryClient.cancelQueries({ queryKey: profileKeys.user(userId) });
      const onboardedAt = new Date().toISOString();
      const save = async () => {
        const { error } = await supabase.from('profiles').update({ onboarded_at: onboardedAt }).eq('user_id', userId);
        if (error) throw error;
      };
      await Promise.all([save(), new Promise((resolve) => setTimeout(resolve, CONFIRMATION_MS))]);
      return onboardedAt;
    },
    onSuccess: (onboardedAt) => {
      if (!userId) return;
      const key = profileKeys.user(userId);
      if (queryClient.getQueryData<Profile>(key)) {
        queryClient.setQueryData<Profile>(key, (previous) => (previous ? { ...previous, onboardedAt } : previous));
      } else {
        return queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

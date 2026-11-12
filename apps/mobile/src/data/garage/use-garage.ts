import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { todayIso } from '@/lib/format';

import { useTasks } from '../task/queries';
import { useUserId } from '../user';

import { splitGarage } from './derive';
import { fetchGarage } from './fetch';
import { garageKeys } from './keys';

/** While a schedule or a render is being generated, check back this often (the PWA's pace). */
const GENERATING_POLL_MS = 8_000;

/**
 * Every Vehicle the person owns, derived, with the withdrawn ones apart.
 * Every Vehicle screen reads this one query, so they never disagree.
 */
export function useGarage() {
  const userId = useUserId();
  const tasks = useTasks();

  const query = useQuery({
    queryKey: garageKeys.user(userId ?? 'signed-out'),
    queryFn: () => fetchGarage(userId!),
    enabled: userId !== null,
    refetchInterval: (q) =>
      (q.state.data ?? []).some((v) => !v.withdrawnAt && (v.schedule?.status === 'pending' || v.render?.generating))
        ? GENERATING_POLL_MS
        : false,
  });

  const today = todayIso();
  const derived = useMemo(
    () => (query.data && tasks.data ? splitGarage(query.data, tasks.data, today) : null),
    [query.data, tasks.data, today],
  );

  return {
    vehicles: derived?.vehicles ?? [],
    withdrawn: derived?.withdrawn ?? [],
    tasks: tasks.data ?? [],
    isLoading: userId !== null && (query.isPending || tasks.isPending),
    isError: query.isError || tasks.isError,
    error: query.error ?? tasks.error,
    isFetching: query.isFetching,
    refetch: () => {
      void query.refetch();
      void tasks.refetch();
    },
  };
}

/** A write to anything in the garage. However it ends, the garage refetches so every screen sees it. */
export function useGarageMutation<TInput, TResult>(write: (input: TInput) => Promise<TResult>) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSettled: () => {
      if (userId) return queryClient.invalidateQueries({ queryKey: garageKeys.user(userId) });
    },
  });
}

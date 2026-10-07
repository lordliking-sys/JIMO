import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WorkoutDetail } from '@jimo/schemas';
import { useOffline } from '../db/Provider';
export function useWorkoutActions() {
  return useOffline().runtime;
}
export function useCachedProgram() {
  const { runtime } = useOffline();
  return useQuery({
    queryKey: ['local', runtime.owner, 'active-program'],
    queryFn: () =>
      runtime.owner ? runtime.programs.active(runtime.owner) : null,
    networkMode: 'always',
  });
}
export function useActiveWorkout() {
  const { runtime } = useOffline();
  return useQuery({
    queryKey: ['local', runtime.owner, 'active-workout'],
    queryFn: async () => ({
      workout: runtime.owner
        ? await runtime.workouts.active(runtime.owner)
        : null,
    }),
    networkMode: 'always',
  });
}
export function useWorkout(id: string) {
  const { runtime } = useOffline();
  return useQuery({
    queryKey: ['local', runtime.owner, 'workout', id],
    queryFn: () => runtime.detail(id),
    enabled: !!id && !!runtime.owner,
    networkMode: 'always',
    retry: false,
  });
}
export function useHistory(
  since?: string,
  until?: string,
  dateField: 'started' | 'completed' = 'started',
) {
  const { runtime } = useOffline();
  return useQuery({
    queryKey: [
      'local',
      runtime.owner,
      'history',
      since ?? '',
      until ?? '',
      dateField,
    ],
    queryFn: () => runtime.history(since, until, dateField),
    networkMode: 'always',
  });
}
export function useWorkoutMutation<T>(
  action: (input: T) => Promise<WorkoutDetail>,
  onSuccess?: (workout: WorkoutDetail) => void,
) {
  const cache = useQueryClient(),
    { runtime } = useOffline(),
    busy = useRef(false);
  const mutation = useMutation({
    mutationFn: action,
    networkMode: 'always',
    onSuccess: async (workout) => {
      onSuccess?.(workout);
      runtime.changed();
      cache.setQueryData(
        ['local', runtime.owner, 'workout', workout.id],
        workout,
      );
      cache.setQueryData(['local', runtime.owner, 'active-workout'], {
        workout: workout.status === 'in_progress' ? workout : null,
      });
      await cache.invalidateQueries({ queryKey: ['local', runtime.owner] });
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const mutate: typeof mutation.mutate = (...args) => {
    if (busy.current) return;
    busy.current = true;
    mutation.mutate(...args);
  };
  return { ...mutation, mutate };
}

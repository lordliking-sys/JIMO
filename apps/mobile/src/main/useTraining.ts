import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useOffline } from '../db/Provider';
import { useActiveWorkout, useCachedProgram } from '../workouts/queries';
import { useClock } from '../workouts/useClock';

/** Reuses the existing local cache and refresh behavior; no new sync path. */
export function useTraining() {
  const { runtime } = useOffline(),
    cache = useQueryClient(),
    program = useCachedProgram(),
    session = useActiveWorkout();
  const refresh = useCallback(() => {
    for (const key of ['active-program', 'active-workout', 'history'])
      void cache.invalidateQueries({ queryKey: ['local', runtime.owner, key] });
    void runtime.engine.request(true);
  }, [cache, runtime]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const now = useClock(refresh);
  return { program, session, runtime, refresh, now: new Date(now) };
}

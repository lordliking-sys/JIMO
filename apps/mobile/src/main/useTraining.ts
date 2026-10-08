import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useOffline } from '../db/Provider';
import { useActiveWorkout, useCachedProgram } from '../workouts/queries';
import { useClock } from '../workouts/useClock';

/** Reuses the existing local cache and refresh behavior; no new sync path. */
export function useTraining() {
  const { runtime } = useOffline(),
    program = useCachedProgram(),
    session = useActiveWorkout();
  const { refetch } = session;
  const refresh = useCallback(() => {
    void refetch();
    void runtime.engine.request(true);
  }, [refetch, runtime]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const now = useClock(refresh);
  return { program, session, runtime, refresh, now: new Date(now) };
}

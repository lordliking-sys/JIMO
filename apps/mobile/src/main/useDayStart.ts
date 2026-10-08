import { useRouter } from 'expo-router';
import { ApiClientError } from '../api/client';
import { LocalWorkoutConflict } from '../db/repositories/workouts';
import { useWorkoutActions, useWorkoutMutation } from '../workouts/queries';

/** Presentation adapter for the same start/resume action used by StartWorkout. */
export function useDayStart(dayId?: string) {
  const runtime = useWorkoutActions(),
    router = useRouter();
  const open = (id: string) =>
    router.push({ pathname: '/workout/[id]', params: { id } });
  const mutation = useWorkoutMutation(
    (id: string) => runtime.start(id),
    (workout) => open(workout.id),
  );
  const conflict =
    mutation.error instanceof LocalWorkoutConflict ||
    (mutation.error instanceof ApiClientError &&
      mutation.error.code === 'ACTIVE_WORKOUT_EXISTS');
  const conflictId =
    conflict &&
    (mutation.error instanceof LocalWorkoutConflict ||
      mutation.error instanceof ApiClientError)
      ? mutation.error.sessionId
      : null;
  return {
    pending: mutation.isPending,
    error: mutation.error,
    conflict,
    start: () => {
      if (conflictId) open(conflictId);
      else if (dayId) mutation.mutate(dayId);
    },
  };
}

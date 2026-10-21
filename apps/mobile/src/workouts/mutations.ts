import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import type { WorkoutDetail } from '@jimo/schemas';
import type { LocalChange } from '../db/invalidation';
import { invalidateLocal } from '../db/invalidation';

/** Capture the owner before the async write, including before logout/unmount. */
export function workoutMutationOptions<T>(
  action: (input: T) => Promise<WorkoutDetail>,
  cache: QueryClient,
  runtime: { owner: string | null; changed(change?: LocalChange): void },
  onSuccess?: (workout: WorkoutDetail) => void,
): UseMutationOptions<WorkoutDetail, Error, T, { owner: string | null }> {
  return {
    mutationFn: action,
    networkMode: 'always',
    onMutate: () => ({ owner: runtime.owner }),
    onSuccess: async (workout, _input, context) => {
      const owner = context?.owner;
      if (!owner || owner !== runtime.owner) return;
      cache.setQueryData(['local', owner, 'workout', workout.id], workout);
      cache.setQueryData(['local', owner, 'active-workout'], {
        workout: workout.status === 'in_progress' ? workout : null,
      });
      runtime.changed('status');
      onSuccess?.(workout);
      await invalidateLocal(cache, owner, 'workout');
    },
  };
}

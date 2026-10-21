import type { QueryClient } from '@tanstack/react-query';

export type LocalChange =
  'status' | 'program' | 'workout' | 'reconcile' | 'identity';
/** Owner is always the second key segment, including sync status. */
export function localChangeKeys(owner: string, change: LocalChange) {
  if (change === 'identity') return [['local', owner]];
  const result: unknown[][] = [
    ['local', owner, 'sync-status'],
    ['local', owner, 'progress-pending'],
  ];
  if (change === 'program' || change === 'reconcile')
    result.push(['local', owner, 'active-program']);
  if (change === 'workout' || change === 'reconcile')
    for (const key of ['active-workout', 'workout', 'history'])
      result.push(['local', owner, key]);
  return result;
}
export async function invalidateLocal(
  cache: QueryClient,
  owner: string | null,
  change: LocalChange,
) {
  if (!owner) return;
  await Promise.all(
    localChangeKeys(owner, change).map((queryKey) =>
      cache.invalidateQueries({ queryKey }),
    ),
  );
}

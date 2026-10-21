import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import type { WorkoutDetail } from '@jimo/schemas';
import { cachedProgram } from './offline-fixtures';
import { sqliteAdapter } from './sqlite-adapter';
import {
  makeLocalWorkout,
  WorkoutLocalRepository,
} from '../src/db/repositories/workouts';
import { SyncOutboxRepository } from '../src/db/repositories/outbox';
import { prepareProgramChange } from '../src/db/sync/program-change';
import { ApiClientError } from '../src/api/client';
import { workoutMutationOptions } from '../src/workouts/mutations';
import { invalidateLocal } from '../src/db/invalidation';

test('a workout mutation resolving after logout cannot populate the next account cache or navigate', async () => {
  const cache = new QueryClient(),
    a = randomUUID(),
    b = randomUUID();
  const p = cachedProgram(),
    w = makeLocalWorkout(
      p,
      p.days[0]!.id,
      randomUUID,
      new Date().toISOString(),
    );
  const runtime: { owner: string | null; changed(): void } = {
    owner: a,
    changed: () => {},
  };
  let resolve!: (w: WorkoutDetail) => void,
    started!: () => void,
    navigations = 0;
  const begun = new Promise<void>((r) => {
    started = r;
  });
  const mutation = new MutationObserver(
    cache,
    workoutMutationOptions(
      async () => {
        started();
        return new Promise<WorkoutDetail>((r) => {
          resolve = r;
        });
      },
      cache,
      runtime,
      () => {
        navigations++;
      },
    ),
  );
  try {
    const pending = mutation.mutate(undefined);
    await begun;
    runtime.owner = null;
    cache.clear();
    runtime.owner = b;
    cache.setQueryData(['local', b, 'active-workout'], { workout: null });
    resolve(w);
    await pending;
    assert.equal(navigations, 0);
    assert.equal(cache.getQueryData(['local', b, 'workout', w.id]), undefined);
    assert.deepEqual(cache.getQueryData(['local', b, 'active-workout']), {
      workout: null,
    });
    assert.equal(cache.getQueryData(['local', a, 'workout', w.id]), undefined);
  } finally {
    cache.clear();
  }
});

test('workout results invalidate their history and sync state without refetching programs or another account', async () => {
  const cache = new QueryClient(),
    owner = randomUUID(),
    other = randomUUID(),
    p = cachedProgram();
  const w = makeLocalWorkout(
    p,
    p.days[0]!.id,
    randomUUID,
    new Date().toISOString(),
  );
  const watched = [
    ['local', owner, 'history'],
    ['local', owner, 'sync-status'],
    ['local', owner, 'progress-pending'],
    ['local', owner, 'active-program'],
    ['program', owner, p.id],
    ['local', other, 'history'],
  ];
  for (const key of watched) cache.setQueryData(key, {});
  const mutation = new MutationObserver(
    cache,
    workoutMutationOptions(async () => w, cache, { owner, changed: () => {} }),
  );
  try {
    await mutation.mutate(undefined);
    assert.equal(
      cache.getQueryData<WorkoutDetail>(['local', owner, 'workout', w.id])?.id,
      w.id,
    );
    for (const key of watched.slice(0, 3))
      assert.equal(cache.getQueryState(key)?.isInvalidated, true);
    for (const key of watched.slice(3))
      assert.equal(cache.getQueryState(key)?.isInvalidated, false);
    cache.setQueryData(['local', owner, 'history'], {});
    await invalidateLocal(cache, owner, 'program');
    assert.equal(
      cache.getQueryState(['local', owner, 'history'])?.isInvalidated,
      false,
    );
    assert.equal(
      cache.getQueryState(['local', owner, 'active-program'])?.isInvalidated,
      true,
    );
  } finally {
    cache.clear();
  }
});

test('program edits wait for a pending offline start and fail safely without dropping the workout', async () => {
  const c = sqliteAdapter(),
    owner = randomUUID(),
    p = cachedProgram();
  await c.db.migrate();
  const repo = new WorkoutLocalRepository(c.db, randomUUID),
    outbox = new SyncOutboxRepository(c.db);
  let activeOwner: string | null = owner,
    flushes = 0;
  try {
    const w = await repo.start(owner, p, p.days[0]!.id);
    const options = {
      owner,
      currentOwner: () => activeOwner,
      outbox,
      flush: async () => {
        flushes++;
      },
    };
    await assert.rejects(
      () => prepareProgramChange(options),
      (e) => e instanceof ApiClientError && e.code === 'PROGRAM_SYNC_PENDING',
    );
    assert.equal((await repo.active(owner))?.id, w.id);
    assert.equal((await outbox.list(owner)).length, 1);
    await prepareProgramChange({ ...options, programId: randomUUID() });
    assert.equal(flushes, 1);
    // Reactivating the pending start's own source repairs an archived-source
    // conflict; it must remain possible before that start can be acknowledged.
    await prepareProgramChange({ ...options, activatingProgramId: p.id });
    assert.equal(flushes, 1);
    await prepareProgramChange({
      ...options,
      flush: async () => {
        const batch = await outbox.batch(owner);
        await outbox.acknowledge(owner, batch, {
          acknowledged: batch.map((o) => o.operationId),
          failed: [],
        });
      },
    });
    p.days[0]!.exercises[0]!.targetSets = 5;
    p.days[0]!.exercises[0]!.targetReps = 10;
    assert.equal(
      (await repo.detail(owner, w.id))?.exercises[0]!.sets.length,
      3,
    );
    assert.equal(
      (await repo.detail(owner, w.id))?.exercises[0]!.sets[0]!.targetReps,
      8,
    );
    activeOwner = randomUUID();
    await assert.rejects(
      () => prepareProgramChange(options),
      (e) => e instanceof ApiClientError && e.code === 'IDENTITY_CHANGED',
    );
  } finally {
    c.sqlite.close();
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  WorkoutLocalRepository,
  LocalSaveError,
} from '../src/db/repositories/workouts';
import { ProgramCacheRepository } from '../src/db/repositories/programs';
import { SyncOutboxRepository } from '../src/db/repositories/outbox';
import { SyncEngine, retryDelay } from '../src/db/sync/engine';
import { recoverRest, nextPending } from '../src/workouts/helpers';
import { cachedProgram } from './offline-fixtures';
import { sqliteAdapter } from './sqlite-adapter';
const actual = {
  actualReps: 7,
  actualDurationSeconds: null,
  actualLoadKg: '82.5',
  actualAssistanceKg: null,
  actualRpe: '9',
};
const owner = randomUUID(),
  other = randomUUID(),
  time = '2026-10-06T10:00:00.000Z';
async function setup(path?: string) {
  const connection = sqliteAdapter(path);
  await connection.db.migrate();
  return {
    ...connection,
    repo: new WorkoutLocalRepository(connection.db, randomUUID, () => time),
    programs: new ProgramCacheRepository(connection.db),
    outbox: new SyncOutboxRepository(connection.db),
    p: cachedProgram(),
  };
}
test('SQLite migration is versioned, repeatable, preserves canonical TEXT and FK constraints', async () => {
  const c = await setup();
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id);
    await c.repo.save(owner, w.exercises[0]!.sets[0]!.id, actual);
    await c.db.migrate();
    const data = c.sqlite
      .prepare(
        'SELECT typeof(actual_load_kg) AS kind,actual_load_kg,actual_rpe,target_load_kg,target_rpe FROM local_workout_sets WHERE actual_load_kg IS NOT NULL',
      )
      .get();
    assert.deepEqual(
      { ...data },
      {
        kind: 'text',
        actual_load_kg: '82.50',
        actual_rpe: '9.0',
        target_load_kg: '80.00',
        target_rpe: '8.0',
      },
    );
    assert.equal(
      c.sqlite.prepare('PRAGMA user_version').get()?.user_version,
      2,
    );
    assert.throws(() =>
      c.sqlite
        .prepare('DELETE FROM local_workout_sessions WHERE id=?')
        .run(w.id),
    );
    assert.equal(c.sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally {
    c.sqlite.close();
  }
});
test('offline CHECK writes actual + outbox atomically and starts timestamp-derived timer', async () => {
  const c = await setup();
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id),
      id = w.exercises[0]!.sets[0]!.id;
    const changed = await c.repo.save(owner, id, actual),
      s = changed.exercises[0]!.sets[0]!;
    assert.deepEqual(
      [
        s.targetReps,
        s.targetLoadKg,
        s.targetRpe,
        s.actualReps,
        s.actualLoadKg,
        s.actualRpe,
      ],
      [8, '80.00', '8.0', 7, '82.50', '9.0'],
    );
    assert.equal(s.completedAt, time);
    assert.equal(recoverRest(changed, Date.parse(time) + 1000)?.remaining, 179);
    const operations = await c.outbox.batch(owner);
    assert.deepEqual(
      operations.map((o) => [o.sequence, o.operationType]),
      [
        [1, 'START_WORKOUT'],
        [2, 'COMPLETE_SET'],
      ],
    );
    assert.equal((await c.outbox.list(other)).length, 0);
  } finally {
    c.sqlite.close();
  }
});
test('failed SQLite outbox insertion rolls back actual and preserves pending set', async () => {
  const c = await setup();
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id),
      id = w.exercises[0]!.sets[0]!.id;
    c.sqlite.exec(
      "CREATE TRIGGER fail_outbox BEFORE INSERT ON sync_outbox BEGIN SELECT RAISE(ABORT,'disk write failed'); END;",
    );
    await assert.rejects(c.repo.save(owner, id, actual), LocalSaveError);
    const stored = (await c.repo.detail(owner, w.id))!;
    assert.equal(stored.exercises[0]!.sets[0]!.status, 'pending');
    assert.equal(stored.exercises[0]!.sets[0]!.actualReps, null);
    assert.equal(recoverRest(stored, Date.parse(time)), null);
    assert.equal((await c.outbox.list(owner)).length, 1);
  } finally {
    c.sqlite.close();
  }
});
test('kill/reopen restores active workout, two completed sets, next target, timer and interrupted outbox', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jimo-offline-')),
    path = join(directory, 'workout.db');
  let c = await setup(path);
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id);
    for (const s of w.exercises[0]!.sets.slice(0, 2))
      await c.repo.save(owner, s.id, actual);
    await c.outbox.batch(owner);
    c.sqlite.close();
    c = await setup(path);
    const restored = (await c.repo.active(owner))!;
    assert.equal(restored.id, w.id);
    assert.equal(restored.completedSets, 2);
    assert.equal(nextPending(restored)?.set.setNumber, 3);
    assert.equal(nextPending(restored)?.set.targetLoadKg, '80.00');
    assert.equal(
      recoverRest(restored, Date.parse(time) + 60000)?.remaining,
      120,
    );
    assert.equal((await c.outbox.list(owner)).length, 3);
    assert.ok(
      (await c.outbox.list(owner)).every((o) => o.status === 'pending'),
    );
  } finally {
    c.sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test('offline start freezes cached targets and scopes both cache and workouts to identity', async () => {
  const c = await setup();
  try {
    await c.programs.replaceActive(owner, c.p);
    assert.equal(await c.programs.active(other), null);
    assert.equal(await c.programs.day(other, c.p.days[0]!.id), null);
    const p = (await c.programs.active(owner))!,
      w = await c.repo.start(owner, p, p.days[0]!.id);
    c.p.days[0]!.exercises[0]!.targetReps = 10;
    await c.programs.replaceActive(owner, c.p);
    assert.equal(
      (await c.repo.detail(owner, w.id))?.exercises[0]!.sets[0]!.targetReps,
      8,
    );
    assert.equal(await c.repo.detail(other, w.id), null);
    assert.equal(await c.repo.active(other), null);
    await assert.rejects(
      c.repo.save(other, w.exercises[0]!.sets[0]!.id, actual),
    );
    assert.equal((await c.outbox.list(other)).length, 0);
  } finally {
    c.sqlite.close();
  }
});
test('complete then correct is FIFO, preserves completion time, and partial ACK cannot lose unacknowledged writes', async () => {
  const c = await setup();
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id),
      s = w.exercises[0]!.sets[0]!;
    await c.repo.save(owner, s.id, { ...actual, actualReps: 8 });
    await c.repo.save(owner, s.id, actual, true);
    const batch = await c.outbox.batch(owner);
    assert.deepEqual(
      batch.map((o) => o.operationType),
      ['START_WORKOUT', 'COMPLETE_SET', 'UPDATE_SET'],
    );
    await c.outbox.acknowledge(owner, batch, {
      acknowledged: [batch[0]!.operationId],
      failed: [],
    });
    assert.deepEqual(
      (await c.outbox.batch(owner)).map((o) => o.sequence),
      [2, 3],
    );
    await assert.rejects(
      c.outbox.acknowledge(owner, batch, {
        acknowledged: [batch[2]!.operationId],
        failed: [],
      }),
    );
    assert.equal(
      (await c.repo.detail(owner, w.id))?.exercises[0]!.sets[0]!.actualReps,
      7,
    );
    assert.equal(
      (await c.repo.detail(owner, w.id))?.exercises[0]!.sets[0]!.completedAt,
      time,
    );
  } finally {
    c.sqlite.close();
  }
});
test('offline completion survives restart and keeps original event timestamp', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jimo-finish-')),
    path = join(directory, 'workout.db');
  let c = await setup(path);
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id);
    for (const s of w.exercises[0]!.sets)
      await c.repo.save(owner, s.id, actual);
    await c.repo.finish(owner, w.id);
    c.sqlite.close();
    c = await setup(path);
    assert.equal(await c.repo.active(owner), null);
    const closed = (await c.repo.detail(owner, w.id))!;
    assert.equal(closed.status, 'completed');
    assert.equal(closed.completedAt, time);
    const batch = await c.outbox.batch(owner);
    assert.equal(batch.at(-1)?.operationType, 'COMPLETE_WORKOUT');
    assert.equal(batch.at(-1)?.createdAt, time);
    assert.equal((await c.repo.history(owner)).length, 1);
  } finally {
    c.sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test('offline cancel/skip preserve null actual; duplicate CHECK produces no extra outbox operation', async () => {
  const c = await setup();
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id),
      id = w.exercises[0]!.sets[0]!.id;
    await c.repo.save(owner, id, actual);
    await c.repo.save(owner, id, { ...actual, actualReps: 6 });
    assert.equal((await c.outbox.list(owner)).length, 2);
    await c.repo.skip(owner, w.exercises[0]!.sets[1]!.id);
    const cancelled = await c.repo.finish(owner, w.id, true, true);
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.skippedSets, 2);
    assert.equal(cancelled.exercises[0]!.sets[1]!.actualLoadKg, null);
    assert.deepEqual(
      (await c.outbox.batch(owner)).map((o) => o.operationType),
      ['START_WORKOUT', 'COMPLETE_SET', 'SKIP_SET', 'CANCEL_WORKOUT'],
    );
  } finally {
    c.sqlite.close();
  }
});
test('reconciliation preserves pending local writes and refuses to overwrite a different active workout', async () => {
  const c = await setup();
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id);
    const old = structuredClone(w);
    await c.repo.save(owner, w.exercises[0]!.sets[0]!.id, actual);
    assert.equal(await c.repo.import(owner, old), false);
    assert.equal((await c.repo.detail(owner, w.id))?.completedSets, 1);
    const different = { ...old, id: randomUUID() };
    assert.equal(await c.repo.import(owner, different), false);
    assert.equal((await c.repo.active(owner))?.id, w.id);
    assert.equal((await c.outbox.list(owner)).length, 2);
  } finally {
    c.sqlite.close();
  }
});
test('sync mutex coalesces triggers, ACK compacts safely and permanent conflict blocks later operations', async () => {
  const c = await setup();
  let concurrent = 0,
    max = 0,
    sends = 0;
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id);
    await c.repo.save(owner, w.exercises[0]!.sets[0]!.id, actual);
    const engine = new SyncEngine({
      outbox: c.outbox,
      owner: () => owner,
      verifyIdentity: async () => owner,
      network: () => true,
      reconcile: async () => {},
      changed: () => {},
      error: () => {},
      send: async (_owner, operations) => {
        concurrent++;
        max = Math.max(max, concurrent);
        sends++;
        await Promise.resolve();
        concurrent--;
        return {
          acknowledged: operations.map((o) => o.operationId),
          failed: [],
        };
      },
    });
    await Promise.all([engine.request(), engine.request(), engine.request()]);
    engine.stop();
    assert.equal(max, 1);
    assert.equal(sends, 1);
    assert.equal((await c.outbox.list(owner)).length, 0);
    await c.repo.save(owner, w.exercises[0]!.sets[1]!.id, actual);
    const batch = await c.outbox.batch(owner);
    await c.outbox.acknowledge(owner, batch, {
      acknowledged: [],
      failed: [
        {
          operationId: batch[0]!.operationId,
          sessionId: w.id,
          status: 'conflict',
          code: 'WORKOUT_SYNC_CONFLICT',
        },
      ],
    });
    await c.repo.save(owner, w.exercises[0]!.sets[2]!.id, actual);
    assert.equal((await c.outbox.batch(owner)).length, 0);
    assert.equal((await c.repo.detail(owner, w.id))?.completedSets, 3);
  } finally {
    c.sqlite.close();
  }
});
test('retry planner uses bounded backoff, releases interrupted batch and does not hammer permanent failures', async () => {
  assert.deepEqual(
    [1, 2, 3, 4, 12].map(retryDelay),
    [2000, 5000, 15000, 30000, 30000],
  );
  const c = await setup();
  try {
    await c.repo.start(owner, c.p, c.p.days[0]!.id);
    let sends = 0;
    const engine = new SyncEngine({
      outbox: c.outbox,
      owner: () => owner,
      verifyIdentity: async () => owner,
      network: () => true,
      reconcile: async () => {},
      changed: () => {},
      error: () => {},
      send: async () => {
        sends++;
        throw Object.assign(new Error('network'), { status: 0 });
      },
    });
    await engine.request();
    await engine.request();
    engine.stop();
    assert.equal(sends, 1);
    assert.equal((await c.outbox.list(owner))[0]?.status, 'pending');
    assert.equal((await c.outbox.list(owner))[0]?.attempt_count, 1);
  } finally {
    c.sqlite.close();
  }
});

test('downloaded server workout seeds its sync sequence and remains operational offline', async () => {
  const c = await setup();
  try {
    const source = await c.repo.start(other, c.p, c.p.days[0]!.id);
    const downloaded = { ...source, syncSequence: 12 };
    assert.equal(await c.repo.import(owner, downloaded), true);
    await c.repo.save(owner, downloaded.exercises[0]!.sets[0]!.id, actual);
    assert.equal((await c.outbox.batch(owner))[0]?.sequence, 13);
    assert.equal((await c.repo.active(owner))?.id, source.id);
  } finally {
    c.sqlite.close();
  }
});

test('unknown SQLite schema version fails without clearing workout or queued operations', async () => {
  const c = await setup();
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id);
    c.sqlite.exec('PRAGMA user_version=3');
    await assert.rejects(c.db.migrate(), /LOCAL_SCHEMA_NEWER/);
    assert.equal((await c.repo.active(owner))?.id, w.id);
    assert.equal((await c.outbox.list(owner)).length, 1);
  } finally {
    c.sqlite.close();
  }
});

test('session FIFO uses enqueue order, not random UUID or clock order, so finish precedes the next start', async () => {
  const c = await setup();
  let nextId: string | null = 'ffffffff-ffff-4fff-8fff-fffffffffff1';
  const repo = new WorkoutLocalRepository(
    c.db,
    () => {
      const id = nextId ?? randomUUID();
      nextId = null;
      return id;
    },
    () => time,
  );
  try {
    const first = await repo.start(owner, c.p, c.p.days[0]!.id);
    await repo.finish(owner, first.id, true, true);
    nextId = '00000000-0000-4000-8000-000000000001';
    const second = await repo.start(owner, c.p, c.p.days[0]!.id);
    const batch = await c.outbox.batch(owner);
    assert.deepEqual(
      batch.map((o) => [o.sessionId, o.operationType]),
      [
        [first.id, 'START_WORKOUT'],
        [first.id, 'CANCEL_WORKOUT'],
        [second.id, 'START_WORKOUT'],
      ],
    );
  } finally {
    c.sqlite.close();
  }
});

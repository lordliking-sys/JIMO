import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  prescriptionFor,
  offlineSnapshotSchema,
  workoutOperationSchema,
} from '@jimo/schemas';
import {
  WorkoutLocalRepository,
  LocalSaveError,
  snapshotOf,
} from '../src/db/repositories/workouts';
import { SyncOutboxRepository } from '../src/db/repositories/outbox';
import { SyncEngine } from '../src/db/sync/engine';
import { emomClock } from '../src/workouts/modes';
import { recoverRest, prefillDraft } from '../src/workouts/helpers';
import { sqliteAdapter } from './sqlite-adapter';
import { cachedProgram } from './offline-fixtures';
import { thumbnailGeometry } from '../src/programs/thumbnail-geometry';
const time = Date.parse('2026-10-12T10:00:00Z');
const actual = {
  actualReps: 4,
  actualDurationSeconds: null,
  actualLoadKg: '80.00',
  actualAssistanceKg: null,
  actualRpe: '8.0',
};
function program(mode: 'emom' | 'pyramid') {
  const p = cachedProgram(),
    e = p.days[0]!.exercises[0]!;
  e.workoutMode = mode;
  if (mode === 'emom') {
    e.targetReps = 5;
    e.emomIntervalSeconds = 60;
  } else
    e.setTargets = [12, 10, 8].map((reps, index) => ({
      targetReps: reps,
      targetDurationSeconds: null,
      targetLoadKg: ['60.00', '70.00', '80.00'][index]!,
      targetAssistanceKg: null,
      targetRpe: index === 1 ? null : '8.0',
      restSeconds: index === 1 ? null : 90,
    }));
  return p;
}
async function setup(mode: 'emom' | 'pyramid', path?: string) {
  const c = sqliteAdapter(path);
  await c.db.migrate();
  let now = time;
  const owner = randomUUID(),
    p = program(mode),
    repo = new WorkoutLocalRepository(c.db, randomUUID, () =>
      new Date(now).toISOString(),
    ),
    outbox = new SyncOutboxRepository(c.db);
  return {
    ...c,
    owner,
    p,
    repo,
    outbox,
    clock: (ms: number) => {
      now = ms;
    },
  };
}
test('EMOM snapshots, starts once and advances from its durable timestamp without inventing actuals', async () => {
  const c = await setup('emom');
  try {
    const w = await c.repo.start(c.owner, c.p, c.p.days[0]!.id);
    const e = w.exercises[0]!;
    assert.equal(e.emomStartedAt, null);
    const started = await c.repo.startEmom(c.owner, w.id, e.id);
    await c.repo.startEmom(c.owner, w.id, e.id);
    assert.equal((await c.outbox.list(c.owner)).length, 2);
    const ex = started.exercises[0]!;
    assert.equal(emomClock(ex, time).remaining, 60);
    assert.equal(emomClock(ex, time + 59_001).remaining, 1);
    assert.equal(emomClock(ex, time + 60_000).index, 1);
    assert.equal(emomClock(ex, time + 125_000).remaining, 55);
    assert.equal(emomClock(ex, time + 180_000).finished, true);
    assert.ok(
      ex.sets.every((s) => s.actualReps === null && s.status === 'pending'),
    );
    assert.equal(prefillDraft(ex, ex.sets[0]!, 'it').reps, '5');
    await assert.rejects(c.repo.save(c.owner, ex.sets[1]!.id, actual));
    const result = await c.repo.save(c.owner, ex.sets[0]!.id, actual);
    assert.equal(result.exercises[0]!.sets[0]!.targetReps, 5);
    assert.equal(result.exercises[0]!.sets[0]!.actualReps, 4);
    assert.equal(recoverRest(result, time + 1000), null);
    assert.deepEqual(
      (await c.outbox.batch(c.owner)).map((o) => o.operationType),
      ['START_WORKOUT', 'START_EMOM', 'COMPLETE_SET'],
    );
  } finally {
    c.sqlite.close();
  }
});
test('EMOM kill/reopen restores clock, actuals and ordered pending operations; background catches up', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jimo-emom-'));
  const path = join(directory, 'workout.db');
  let c = await setup('emom', path);
  const owner = c.owner;
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id),
      e = w.exercises[0]!;
    await c.repo.startEmom(owner, w.id, e.id);
    await c.repo.save(owner, e.sets[0]!.id, actual);
    c.sqlite.close();
    c = await setup('emom', path);
    const restored = (await c.repo.active(owner))!;
    assert.equal(restored.id, w.id);
    assert.equal(
      restored.exercises[0]!.emomStartedAt,
      new Date(time).toISOString(),
    );
    assert.equal(emomClock(restored.exercises[0]!, time + 75_000).index, 1);
    assert.equal(restored.exercises[0]!.sets[0]!.actualReps, 4);
    assert.equal((await c.outbox.batch(owner)).length, 3);
  } finally {
    c.sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test('EMOM start transaction rolls back timestamp when outbox write fails', async () => {
  const c = await setup('emom');
  try {
    const w = await c.repo.start(c.owner, c.p, c.p.days[0]!.id);
    c.sqlite.exec(
      "CREATE TRIGGER fail_emom BEFORE INSERT ON sync_outbox BEGIN SELECT RAISE(ABORT,'disk'); END;",
    );
    await assert.rejects(
      c.repo.startEmom(c.owner, w.id, w.exercises[0]!.id),
      LocalSaveError,
    );
    assert.equal(
      (await c.repo.detail(c.owner, w.id))!.exercises[0]!.emomStartedAt,
      null,
    );
  } finally {
    c.sqlite.close();
  }
});
test('Pyramid snapshots distinct targets; source edits, actual and correction never mutate targets', async () => {
  const c = await setup('pyramid');
  try {
    const w = await c.repo.start(c.owner, c.p, c.p.days[0]!.id),
      e = w.exercises[0]!;
    assert.deepEqual(
      e.sets.map((s) => [s.targetReps, s.targetLoadKg]),
      [
        [12, '60.00'],
        [10, '70.00'],
        [8, '80.00'],
      ],
    );
    c.p.days[0]!.exercises[0]!.setTargets![0]!.targetReps = 99;
    let changed = await c.repo.save(c.owner, e.sets[0]!.id, actual);
    assert.equal(changed.exercises[0]!.sets[0]!.targetReps, 12);
    assert.equal(recoverRest(changed, time + 1000)?.remaining, 89);
    changed = await c.repo.save(
      c.owner,
      e.sets[0]!.id,
      { ...actual, actualReps: 3 },
      true,
    );
    assert.equal(changed.exercises[0]!.sets[0]!.actualReps, 3);
    assert.equal(changed.exercises[0]!.sets[0]!.targetReps, 12);
    await c.repo.save(c.owner, e.sets[1]!.id, actual);
    assert.equal(
      recoverRest((await c.repo.detail(c.owner, w.id))!, time + 1000),
      null,
    );
    const snap = snapshotOf(w);
    assert.equal(offlineSnapshotSchema.safeParse(snap).success, true);
    assert.equal(snap.exercises[0]!.sets[0]!.targetRestSeconds, 90);
  } finally {
    c.sqlite.close();
  }
});
for (const mode of ['pyramid', 'emom'] as const)
  test(`${mode} network/401 retain pending outbox, FIFO retry and acknowledgement are idempotent`, async () => {
    const c = await setup(mode);
    let fail = 503;
    try {
      const w = await c.repo.start(c.owner, c.p, c.p.days[0]!.id);
      if (mode === 'emom')
        await c.repo.startEmom(c.owner, w.id, w.exercises[0]!.id);
      await c.repo.save(c.owner, w.exercises[0]!.sets[0]!.id, actual);
      const receipts = new Set<string>();
      const engine = new SyncEngine({
        outbox: c.outbox,
        owner: () => c.owner,
        verifyIdentity: async () => c.owner,
        network: () => true,
        reconcile: async () => {},
        changed: () => {},
        error: () => {},
        send: async (_, ops) => {
          if (fail) throw { status: fail };
          for (const o of ops) {
            assert.equal(workoutOperationSchema.safeParse(o).success, true);
            receipts.add(o.operationId);
          }
          return { acknowledged: ops.map((o) => o.operationId), failed: [] };
        },
      });
      await engine.request();
      assert.ok(
        (await c.outbox.list(c.owner)).every((o) => o.status === 'pending'),
      );
      fail = 401;
      await engine.request(true);
      assert.ok((await c.outbox.list(c.owner)).length > 0);
      fail = 0;
      await engine.request(true);
      const count = receipts.size;
      await engine.request(true);
      assert.equal(receipts.size, count);
      assert.equal((await c.outbox.list(c.owner)).length, 0);
      engine.stop();
      assert.equal(
        (await c.repo.detail(c.owner, w.id))!.exercises[0]!.sets[0]!.actualReps,
        4,
      );
    } finally {
      c.sqlite.close();
    }
  });
test('Pyramid kill/reopen preserves per-set rest, targets, actual and history metrics inputs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jimo-pyramid-')),
    path = join(dir, 'workout.db');
  let c = await setup('pyramid', path);
  const owner = c.owner;
  try {
    const w = await c.repo.start(owner, c.p, c.p.days[0]!.id);
    await c.repo.save(owner, w.exercises[0]!.sets[0]!.id, actual);
    await c.repo.finish(owner, w.id, true);
    c.sqlite.close();
    c = await setup('pyramid', path);
    const restored = (await c.repo.detail(owner, w.id))!;
    assert.equal(restored.status, 'completed');
    assert.equal(restored.exercises[0]!.sets[1]!.targetLoadKg, '70.00');
    assert.equal(restored.exercises[0]!.sets[0]!.actualReps, 4);
    assert.equal((await c.repo.history(owner)).length, 1);
  } finally {
    c.sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('Mode validation rejects malformed per-set count, tracking mismatch and arbitrary configuration', () => {
  const e = program('pyramid').days[0]!.exercises[0]!;
  const input = {
    exerciseId: e.exerciseId,
    loadMode: e.loadMode,
    targetSets: e.targetSets,
    targetReps: e.targetReps,
    targetLoadKg: e.targetLoadKg,
    workoutMode: e.workoutMode,
    setTargets: e.setTargets,
  };
  assert.ok(prescriptionFor('reps').safeParse(input).success);
  assert.ok(
    !prescriptionFor('reps').safeParse({ ...input, targetSets: 4 }).success,
  );
  assert.ok(!prescriptionFor('duration').safeParse(input).success);
  assert.ok(
    !prescriptionFor('reps').safeParse({
      ...input,
      workoutMode: 'emom',
      setTargets: null,
      targetReps: null,
    }).success,
  );
  assert.ok(
    !prescriptionFor('reps').safeParse({ ...input, emomIntervalSeconds: 60 })
      .success,
  );
});
test('Shared thumbnail geometry contains measured character bounds with margins for every original pose', () => {
  for (const variant of ['male', 'female'])
    for (const key of [
      'pull_up',
      'dip',
      'push_up',
      'glute_bridge',
      'plank',
      'squat',
    ]) {
      const g = thumbnailGeometry(key, variant, 56);
      assert.ok(g.width >= 56);
      assert.ok(g.height >= 56);
      assert.ok(g.image.width > 0 && g.image.height > 0);
    }
  assert.ok(
    thumbnailGeometry('push_up', 'male', 56).width >
      thumbnailGeometry('pull_up', 'male', 56).width,
  );
});

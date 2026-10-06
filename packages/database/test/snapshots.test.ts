import assert from 'node:assert/strict';
import { test } from 'node:test';
import { snapshotExercise, snapshotSets } from '../src/snapshots';
import { workoutSets } from '../src/schema';
import type { exercises, programExercises } from '../src/schema';
import { isDatabaseUrl, safeDatabaseError } from '../src/client';

const exercise: typeof exercises.$inferSelect = {
  id: 'exercise',
  canonicalName: 'Pull-Up',
  createdByUserId: null,
  slug: 'pull-up',
  isCustom: false,
  trackingMode: 'reps',
  defaultLoadMode: 'bodyweight',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const source: typeof programExercises.$inferSelect = {
  id: 'source',
  programDayId: 'day',
  exerciseId: exercise.id,
  position: 0,
  loadMode: 'weighted',
  targetSets: 3,
  targetReps: 8,
  targetRepMin: null,
  targetRepMax: null,
  targetDurationSeconds: null,
  targetLoadKg: '20.00',
  targetAssistanceKg: null,
  targetRpe: '8.0',
  restSeconds: 90,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
test('targets, identity and modes are copied independently of later source edits', () => {
  const prescription = { ...source },
    identity = { ...exercise };
  const snapshot = snapshotExercise(prescription, identity, 'session');
  const sets = snapshotSets(prescription, 'workout-exercise');
  prescription.targetReps = 10;
  prescription.targetLoadKg = '25.00';
  identity.canonicalName = 'Renamed';
  assert.equal(snapshot.exerciseNameSnapshot, 'Pull-Up');
  assert.equal(snapshot.loadModeSnapshot, 'weighted');
  assert.deepEqual(
    sets.map((set) => [
      set.setNumber,
      set.targetReps,
      set.targetLoadKg,
      set.actualReps,
    ]),
    [
      [1, 8, '20.00', null],
      [2, 8, '20.00', null],
      [3, 8, '20.00', null],
    ],
  );
});
test('range targets and timed targets preserve their own fields', () => {
  const range = snapshotSets(
    { ...source, targetReps: null, targetRepMin: 8, targetRepMax: 12 },
    'range',
  );
  assert.equal(range[0]?.targetReps, null);
  assert.equal(range[0]?.targetRepMin, 8);
  assert.equal(range[0]?.targetRepMax, 12);
  const timed = { ...source, targetReps: null, targetDurationSeconds: 60 };
  const snapshot = snapshotExercise(
    timed,
    { ...exercise, trackingMode: 'duration' },
    'session',
  );
  assert.equal(snapshot.trackingModeSnapshot, 'duration');
  assert.equal(snapshotSets(timed, 'timed')[0]?.targetDurationSeconds, 60);
});
test('snapshot mapping rejects mismatched identities and tracking targets', () => {
  assert.throws(() =>
    snapshotExercise(source, { ...exercise, id: 'different' }, 'session'),
  );
  assert.throws(() =>
    snapshotExercise(
      source,
      { ...exercise, trackingMode: 'duration' },
      'session',
    ),
  );
  assert.throws(() =>
    snapshotExercise(
      { ...source, targetReps: null, targetDurationSeconds: 60 },
      exercise,
      'session',
    ),
  );
});
test('configuration and driver error metadata never expose sensitive details', () => {
  assert.ok(isDatabaseUrl('postgresql://test@example.invalid/test'));
  assert.ok(!isDatabaseUrl('https://example.invalid/test'));
  assert.deepEqual(
    safeDatabaseError({
      message: 'sensitive-url',
      cause: { code: '23514', detail: 'sensitive-data' },
    }),
    { category: 'postgres', code: '23514' },
  );
  assert.deepEqual(safeDatabaseError(new Error('sensitive-url')), {
    category: 'database_unavailable',
  });
});

test('numeric decoders normalize flat and relational reads including precision boundaries', () => {
  for (const value of ['20.00', '20', 20])
    assert.equal(workoutSets.targetLoadKg.mapFromDriverValue(value), '20.00');
  assert.equal(
    workoutSets.targetLoadKg.mapFromDriverValue(9999999.99),
    '9999999.99',
  );
  assert.equal(workoutSets.targetLoadKg.mapFromDriverValue(1.25), '1.25');
  assert.equal(workoutSets.targetRpe.mapFromDriverValue(7), '7.0');
  assert.throws(() =>
    workoutSets.targetLoadKg.mapToDriverValue(22.5 as unknown as string),
  );
  assert.throws(() => workoutSets.targetLoadKg.mapToDriverValue('1.234'));
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  actualFor,
  actualFieldsSchema,
  startWorkoutSchema,
  finishWorkoutSchema,
} from '../src/workouts';
const base = {
  actualReps: 8,
  actualDurationSeconds: null,
  actualLoadKg: '82.5',
  actualAssistanceKg: null,
  actualRpe: '9',
};
test('actual contracts are strict and normalize decimal strings without accepting targets or identity', () => {
  assert.deepEqual(
    actualFor({
      trackingModeSnapshot: 'reps',
      loadModeSnapshot: 'external',
    }).parse(base),
    { ...base, actualLoadKg: '82.50', actualRpe: '9.0' },
  );
  assert.equal(
    actualFieldsSchema.safeParse({ ...base, targetReps: 10 }).success,
    false,
  );
  assert.equal(
    startWorkoutSchema.safeParse({ programDayId: 'a', userId: 'b' }).success,
    false,
  );
  assert.deepEqual(finishWorkoutSchema.parse({}), { skipPending: false });
  assert.equal(
    actualFieldsSchema.safeParse({ ...base, actualLoadKg: 82.5 }).success,
    false,
  );
});
test('actual requires the field matching snapshot tracking and load, and RPE half steps', () => {
  for (const mode of ['weighted', 'external'] as const) {
    const s = actualFor({
      trackingModeSnapshot: 'reps',
      loadModeSnapshot: mode,
    });
    assert.ok(s.safeParse(base).success);
    assert.equal(s.safeParse({ ...base, actualLoadKg: null }).success, false);
  }
  const bw = actualFor({
    trackingModeSnapshot: 'reps',
    loadModeSnapshot: 'bodyweight',
  });
  assert.ok(
    bw.safeParse({
      ...base,
      actualLoadKg: null,
      actualRpe: null,
      actualReps: 0,
    }).success,
  );
  assert.equal(bw.safeParse(base).success, false);
  const assisted = actualFor({
    trackingModeSnapshot: 'reps',
    loadModeSnapshot: 'assisted',
  });
  assert.ok(
    assisted.safeParse({
      ...base,
      actualLoadKg: null,
      actualAssistanceKg: '15.25',
    }).success,
  );
  assert.equal(assisted.safeParse(base).success, false);
  const duration = actualFor({
    trackingModeSnapshot: 'duration',
    loadModeSnapshot: 'bodyweight',
  });
  assert.ok(
    duration.safeParse({
      ...base,
      actualLoadKg: null,
      actualReps: null,
      actualDurationSeconds: 60,
    }).success,
  );
  for (const rpe of ['0', '10.5', '8.2'])
    assert.equal(
      bw.safeParse({ ...base, actualLoadKg: null, actualRpe: rpe }).success,
      false,
    );
  assert.equal(
    bw.safeParse({ ...base, actualLoadKg: null, actualReps: null }).success,
    false,
  );
});

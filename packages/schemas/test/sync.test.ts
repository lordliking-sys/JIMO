import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  clientTimestampSchema,
  syncRequestSchema,
  workoutOperationSchema,
  offlineSnapshotSchema,
} from '../src/sync';
const owner = randomUUID(),
  sessionId = randomUUID();
const base = {
  operationId: randomUUID(),
  sessionId,
  entityId: randomUUID(),
  sequence: 1,
  createdAt: '2026-10-06T10:00:00.000Z',
  operationType: 'COMPLETE_SET' as const,
  payload: {
    actualReps: 7,
    actualDurationSeconds: null,
    actualLoadKg: '82.5',
    actualAssistanceKg: null,
    actualRpe: '9',
  },
};
test('sync input is strict, bounded, canonical and never accepts client identity as authority', () => {
  const parsed = workoutOperationSchema.parse(base);
  if (parsed.operationType === 'COMPLETE_SET') {
    assert.equal(parsed.payload.actualLoadKg, '82.50');
    assert.equal(parsed.payload.actualRpe, '9.0');
  }
  assert.equal(
    workoutOperationSchema.safeParse({ ...base, userId: owner }).success,
    false,
  );
  assert.equal(
    workoutOperationSchema.safeParse({
      ...base,
      payload: { ...base.payload, targetLoadKg: '5' },
    }).success,
    false,
  );
  assert.equal(
    syncRequestSchema.safeParse({
      expectedUserId: owner,
      operations: Array.from({ length: 51 }, (_, i) => ({
        ...base,
        operationId: randomUUID(),
        sequence: i + 1,
      })),
    }).success,
    false,
  );
  assert.equal(
    syncRequestSchema.safeParse({
      expectedUserId: owner,
      operations: [base, { ...base, operationId: randomUUID(), sequence: 3 }],
    }).success,
    false,
  );
  assert.equal(
    syncRequestSchema.safeParse({
      expectedUserId: owner,
      operations: [base, { ...base, operationId: randomUUID(), sequence: 2 }],
    }).success,
    true,
  );
  for (const time of [
    'invalid',
    'NaN',
    '2026-02-30T10:00:00Z',
    '2026-10-06 10:00:00',
    '1969-01-01T00:00:00Z',
  ])
    assert.equal(clientTimestampSchema.safeParse(time).success, false);
});
test('offline snapshot validates tracking/targets, identities, series order and excludes actual fields', () => {
  const e = {
    id: randomUUID(),
    exerciseId: randomUUID(),
    programExerciseId: null,
    position: 0,
    exerciseNameSnapshot: 'Panca',
    trackingModeSnapshot: 'reps',
    loadModeSnapshot: 'external',
    restSecondsSnapshot: 180,
    notes: null,
    sets: [
      {
        id: randomUUID(),
        setNumber: 1,
        targetReps: 8,
        targetRepMin: null,
        targetRepMax: null,
        targetDurationSeconds: null,
        targetLoadKg: '80',
        targetAssistanceKg: null,
        targetRpe: '8',
      },
    ],
  };
  const snapshot = {
    programId: randomUUID(),
    programDayId: randomUUID(),
    name: 'PUSH',
    notes: null,
    exercises: [e],
  };
  assert.equal(
    offlineSnapshotSchema.parse(snapshot).exercises[0]!.sets[0]!.targetLoadKg,
    '80.00',
  );
  for (const bad of [
    { ...snapshot, exercises: [e, e] },
    {
      ...snapshot,
      exercises: [{ ...e, sets: [{ ...e.sets[0], setNumber: 2 }] }],
    },
    { ...snapshot, exercises: [{ ...e, trackingModeSnapshot: 'duration' }] },
    {
      ...snapshot,
      exercises: [{ ...e, sets: [{ ...e.sets[0], actualReps: 7 }] }],
    },
  ])
    assert.equal(offlineSnapshotSchema.safeParse(bad).success, false);
});

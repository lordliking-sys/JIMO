import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  kg,
  rpe,
  kilogramsSchema,
  rpeSchema,
  programCreateSchema,
  programDayCreateSchema,
  programExerciseCreateSchema,
  workoutSessionCreateSchema,
  workoutSetActualFor,
  userCreateSchema,
  userUpdateSchema,
} from '../src/database';
import { localePreferenceSchema } from '../src/onboarding';
import { localePreferences, type LocalePreference } from '@jimo/types';
const id = 'c3a11c13-7992-4e9d-b169-35b09096b4c1';
const prescription = {
  programDayId: id,
  exerciseId: id,
  position: 0,
  loadMode: 'weighted',
  targetSets: 3,
  targetReps: 8,
  targetLoadKg: '20',
  targetRpe: '8',
};
test('user locale shares application validation and defaults to system', () => {
  assert.equal(userCreateSchema.parse({}).locale, 'system');
  assert.deepEqual(userUpdateSchema.parse({}), {});
  const supported: readonly LocalePreference[] = localePreferences;
  for (const locale of supported) {
    assert.equal(localePreferenceSchema.parse(locale), locale);
    assert.equal(userCreateSchema.parse({ locale }).locale, locale);
    assert.equal(userUpdateSchema.parse({ locale }).locale, locale);
  }
  for (const locale of ['es', 'fr', 'de', 'pt', '', 'IT', null, 42]) {
    assert.ok(!localePreferenceSchema.safeParse(locale).success);
    assert.ok(!userCreateSchema.safeParse({ locale }).success);
    assert.ok(!userUpdateSchema.safeParse({ locale }).success);
  }
});
test('decimal strings are normalized without binary floating point', () => {
  for (const [input, expected] of [
    ['1.25', '1.25'],
    ['2.5', '2.50'],
    ['22.5', '22.50'],
    ['102.5', '102.50'],
    ['002', '2.00'],
  ])
    assert.equal(kg(input!), expected);
  assert.equal(rpe('7.5'), '7.5');
  assert.equal(rpe('8'), '8.0');
  for (const value of [-1, 22.5, '-1', '1.234', 'NaN', '1e3', '10000000'])
    assert.ok(!kilogramsSchema.safeParse(value).success);
  for (const value of [7.5, '0', '10.1', '7.55'])
    assert.ok(!rpeSchema.safeParse(value).success);
});
test('program and ordered day input validates names, dates, positions and weekdays', () => {
  assert.equal(
    programCreateSchema.parse({
      userId: id,
      name: '  Strength  ',
      startsOn: '2026-10-06',
    }).name,
    'Strength',
  );
  assert.ok(
    programDayCreateSchema.safeParse({
      programId: id,
      name: 'Day A',
      position: 0,
    }).success,
  );
  for (const value of [
    { userId: id, name: ' ' },
    { userId: id, name: 'A', durationWeeks: 0 },
    { userId: id, name: 'A', startsOn: '2026-02-30' },
  ])
    assert.ok(!programCreateSchema.safeParse(value).success);
  assert.ok(
    !programDayCreateSchema.safeParse({
      programId: id,
      name: 'A',
      position: -1,
      dayOfWeek: 8,
    }).success,
  );
});
test('prescriptions support exact, range, timed and assisted targets with matching load modes', () => {
  assert.equal(
    programExerciseCreateSchema.parse(prescription).targetLoadKg,
    '20.00',
  );
  assert.ok(
    programExerciseCreateSchema.safeParse({
      ...prescription,
      targetReps: null,
      targetRepMin: 8,
      targetRepMax: 12,
    }).success,
  );
  assert.ok(
    programExerciseCreateSchema.safeParse({
      ...prescription,
      loadMode: 'bodyweight',
      targetLoadKg: null,
      targetReps: null,
      targetDurationSeconds: 60,
    }).success,
  );
  assert.ok(
    programExerciseCreateSchema.safeParse({
      ...prescription,
      loadMode: 'assisted',
      targetLoadKg: null,
      targetAssistanceKg: '20',
    }).success,
  );
  for (const patch of [
    { targetSets: 0 },
    { targetRepMin: 8 },
    { targetReps: null, targetRepMin: 12, targetRepMax: 8 },
    { targetRepMin: 8, targetRepMax: 12 },
    { targetDurationSeconds: 60 },
    { loadMode: 'bodyweight' },
    { targetAssistanceKg: '2' },
    { targetRpe: '11' },
    { restSeconds: -1 },
  ])
    assert.ok(
      !programExerciseCreateSchema.safeParse({ ...prescription, ...patch })
        .success,
    );
});
test('session completion is validated and free workouts are supported', () => {
  assert.ok(
    workoutSessionCreateSchema.safeParse({ userId: id, name: 'Free workout' })
      .success,
  );
  assert.ok(
    !workoutSessionCreateSchema.safeParse({
      userId: id,
      name: 'Workout',
      status: 'completed',
    }).success,
  );
  assert.ok(
    !workoutSessionCreateSchema.safeParse({
      userId: id,
      name: 'Workout',
      startedAt: new Date('2026-10-06'),
      completedAt: new Date('2026-10-05'),
    }).success,
  );
});
test('actual results use stored tracking/load context and cannot accept target edits', () => {
  const reps = workoutSetActualFor({
    trackingMode: 'reps',
    loadMode: 'weighted',
  });
  const result = reps.parse({
    status: 'completed',
    actualReps: 7,
    actualLoadKg: '20',
    actualRpe: '9',
    completedAt: new Date(),
    targetReps: 10,
  });
  assert.equal(result.actualLoadKg, '20.00');
  assert.ok(!('targetReps' in result));
  assert.ok(
    !reps.safeParse({ status: 'completed', completedAt: new Date() }).success,
  );
  assert.ok(!reps.safeParse({ actualDurationSeconds: 60 }).success);
  assert.ok(!reps.safeParse({ actualAssistanceKg: '10' }).success);
  const timed = workoutSetActualFor({
    trackingMode: 'duration',
    loadMode: 'bodyweight',
  });
  assert.ok(
    timed.safeParse({
      status: 'completed',
      actualDurationSeconds: 55,
      completedAt: new Date(),
    }).success,
  );
  assert.ok(!timed.safeParse({ actualReps: 8 }).success);
  assert.ok(!timed.safeParse({ actualLoadKg: '2' }).success);
});

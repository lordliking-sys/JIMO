import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type {
  WorkoutDetail,
  WorkoutExercise,
  WorkoutSet,
  DayDto,
  WorkoutSummary,
} from '@jimo/schemas';
import { resources } from '../src/i18n/resources';
import {
  actualPayload,
  prefillDraft,
  nextPending,
  recoverRest,
  restRemaining,
  weekSchedule,
  weekBounds,
  actualDiffers,
  countdown,
} from '../src/workouts/helpers';
const audit = {
  createdAt: '2026-10-06T08:00:00Z',
  updatedAt: '2026-10-06T08:00:00Z',
};
const set = (n = 1): WorkoutSet => ({
  id: randomUUID(),
  setNumber: n,
  status: 'pending',
  targetReps: 8,
  targetRepMin: null,
  targetRepMax: null,
  targetDurationSeconds: null,
  targetLoadKg: '80.00',
  targetAssistanceKg: null,
  targetRpe: '8.0',
  actualReps: null,
  actualDurationSeconds: null,
  actualLoadKg: null,
  actualAssistanceKg: null,
  actualRpe: null,
  completedAt: null,
  ...audit,
});
const exercise = (sets = [set(), set(2)]): WorkoutExercise => ({
  id: randomUUID(),
  exerciseId: randomUUID(),
  programExerciseId: null,
  position: 0,
  exerciseNameSnapshot: 'Panca',
  trackingModeSnapshot: 'reps',
  loadModeSnapshot: 'external',
  restSecondsSnapshot: 180,
  notes: null,
  sets,
  ...audit,
});
const workout = (exercises = [exercise()]): WorkoutDetail => ({
  id: randomUUID(),
  programId: randomUUID(),
  programDayId: null,
  name: 'PUSH',
  status: 'in_progress',
  startedAt: audit.createdAt,
  completedAt: null,
  notes: null,
  exercisesCount: exercises.length,
  completedSets: 0,
  skippedSets: 0,
  pendingSets: 2,
  exercises,
  ...audit,
});
test('pending target prefill is a draft: all modes, range minimum, duration and optional RPE', () => {
  for (const mode of [
    'weighted',
    'external',
    'bodyweight',
    'assisted',
  ] as const) {
    const e = exercise();
    e.loadModeSnapshot = mode;
    const s = e.sets[0]!;
    s.targetLoadKg = ['weighted', 'external'].includes(mode) ? '20.00' : null;
    s.targetAssistanceKg = mode === 'assisted' ? '15.00' : null;
    const before = structuredClone(s),
      draft = prefillDraft(e, s, 'it');
    assert.equal(draft.reps, '8');
    assert.equal(draft.rpe, '8');
    assert.deepEqual(s, before);
    assert.equal(s.actualReps, null);
    const actual = actualPayload(e, draft);
    assert.equal(actual.actualLoadKg, s.targetLoadKg);
    assert.equal(actual.actualAssistanceKg, s.targetAssistanceKg);
    assert.equal(actual.actualRpe, '8.0');
  }
  const e = exercise(),
    s = e.sets[0]!;
  s.targetReps = null;
  s.targetRepMin = 8;
  s.targetRepMax = 12;
  s.targetRpe = null;
  assert.equal(prefillDraft(e, s, 'en').reps, '8');
  assert.equal(prefillDraft(e, s, 'en').rpe, '');
  e.trackingModeSnapshot = 'duration';
  e.loadModeSnapshot = 'bodyweight';
  s.targetRepMin = null;
  s.targetRepMax = null;
  s.targetDurationSeconds = 60;
  s.targetLoadKg = null;
  const d = prefillDraft(e, s, 'en');
  assert.equal(d.duration, '60');
  assert.equal(d.reps, '');
  assert.equal(actualPayload(e, d).actualDurationSeconds, 60);
});
test('modified draft keeps targets immutable and completed editing starts from actual, not target', () => {
  const e = exercise(),
    s = e.sets[0]!,
    d = prefillDraft(e, s, 'it');
  const actual = actualPayload(e, { ...d, reps: '7', load: '82,5', rpe: '9' });
  assert.deepEqual(actual, {
    actualReps: 7,
    actualDurationSeconds: null,
    actualLoadKg: '82.50',
    actualAssistanceKg: null,
    actualRpe: '9.0',
  });
  assert.equal(s.targetLoadKg, '80.00');
  assert.equal(s.actualLoadKg, null);
  Object.assign(s, actual, {
    status: 'completed',
    completedAt: audit.createdAt,
  });
  assert.equal(prefillDraft(e, s, 'it').load, '82,5');
  assert.equal(prefillDraft(e, s, 'it').reps, '7');
  assert.equal(actualDiffers(s), true);
  assert.throws(() => actualPayload(e, { ...d, rpe: '8,2' }));
});
test('timestamp timer handles background, expiration and corrected sets without extending rest', () => {
  const t0 = '2026-10-06T10:00:00Z';
  assert.equal(restRemaining(t0, 180, Date.parse(t0) + 60000), 120);
  assert.equal(restRemaining(t0, 180, Date.parse(t0) + 181000), 0);
  assert.equal(restRemaining(null, 180), 0);
  assert.equal(countdown(157), '02:37');
  const e = exercise(),
    w = workout([e]);
  Object.assign(e.sets[0]!, { status: 'completed', completedAt: t0 });
  assert.equal(recoverRest(w, Date.parse(t0) + 60000)?.remaining, 120);
  assert.equal(recoverRest(w, Date.parse(t0) + 60000, e.sets[0]!.id), null);
  Object.assign(e.sets[0]!, {
    actualReps: 7,
    updatedAt: '2026-10-06T10:01:00Z',
  });
  assert.equal(recoverRest(w, Date.parse(t0) + 60000)?.remaining, 120);
  e.sets[1]!.status = 'skipped';
  w.exercises.push(exercise());
  assert.equal(recoverRest(w, Date.parse(t0) + 1000), null);
});
test('progression skips resolved sets, starts each set from its own target and ends deterministically', () => {
  const e = exercise(),
    w = workout([e, exercise()]);
  assert.equal(nextPending(w)?.set.id, e.sets[0]!.id);
  Object.assign(e.sets[0]!, {
    status: 'completed',
    actualReps: 7,
    actualLoadKg: '82.50',
  });
  assert.equal(nextPending(w)?.set.id, e.sets[1]!.id);
  assert.equal(prefillDraft(e, e.sets[1]!, 'en').load, '80');
  e.sets[1]!.status = 'skipped';
  assert.equal(nextPending(w)?.exerciseIndex, 1);
  w.exercises[1]!.sets.forEach((s) => (s.status = 'completed'));
  assert.equal(nextPending(w), null);
});
test('local week maps Monday/Wednesday/Friday schedule, today separately and completed sessions within week', () => {
  const now = new Date(2026, 9, 7, 12),
    programId = randomUUID();
  const days = [1, 3, 5].map(
    (dayOfWeek, index) =>
      ({
        id: randomUUID(),
        name: ['Push', 'Pull', 'Legs'][index]!,
        dayOfWeek,
        position: index,
        notes: null,
        exercises: [],
        ...audit,
      }) satisfies DayDto,
  );
  const completed = {
    ...workout(),
    programId,
    programDayId: days[0]!.id,
    status: 'completed',
    startedAt: new Date(2026, 9, 5, 12).toISOString(),
    completedAt: new Date(2026, 9, 5, 13).toISOString(),
  } satisfies WorkoutSummary;
  const week = weekSchedule(days, [completed], programId, now);
  assert.deepEqual(
    week.filter((d) => d.days.length).map((d) => d.weekday),
    [1, 3, 5],
  );
  assert.equal(week[0]!.completed, true);
  assert.equal(week[2]!.today, true);
  assert.equal(week[2]!.completed, false);
  assert.equal(
    weekSchedule(
      days,
      [{ ...completed, programId: randomUUID() }],
      programId,
      now,
    )[0]!.completed,
    false,
  );
  assert.equal(
    weekSchedule(
      days,
      [{ ...completed, completedAt: new Date(2026, 8, 28, 12).toISOString() }],
      programId,
      now,
    )[0]!.completed,
    false,
  );
  assert.equal(weekBounds(new Date(2026, 9, 11, 23)).start.getDate(), 5);
  assert.deepEqual(
    weekSchedule([{ ...days[0]!, dayOfWeek: null }], [], programId, now).map(
      (d) => d.days.length,
    ),
    [0, 0, 0, 0, 0, 0, 0],
  );
  assert.equal(resources.it.programs.weekdaysShort[1], 'Lun');
  assert.equal(resources.en.programs.weekdaysShort[1], 'Mon');
});

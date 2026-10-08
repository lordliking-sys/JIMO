import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { WorkoutDetail, WorkoutSummary } from '@jimo/schemas';
import { cachedProgram } from './offline-fixtures';
import {
  completedDay,
  completedExerciseCount,
  dayArtworkKey,
  dayStates,
  homeDay,
  programWeek,
  selectedWeekBounds,
} from '../src/main/helpers';

test('decorative day artwork follows known names and unknown days have no invented category', () => {
  for (const name of ['Push', 'Spinta A'])
    assert.equal(dayArtworkKey(name), 'push');
  for (const name of ['Pull', 'Tirata'])
    assert.equal(dayArtworkKey(name), 'pull');
  for (const name of ['Gambe', 'Legs', 'Lower body'])
    assert.equal(dayArtworkKey(name), 'legs');
  for (const name of ['Full Body', 'Full-body', 'Total Body'])
    assert.equal(dayArtworkKey(name), 'full');
  assert.equal(dayArtworkKey('Mobilità'), null);
});
test('program week selection uses actual dates across DST and never invents a duration/start date', () => {
  const original = process.env.TZ;
  process.env.TZ = 'Europe/Rome';
  try {
    const program = cachedProgram();
    program.startsOn = '2026-10-19';
    const now = new Date('2026-10-26T09:00:00+01:00');
    assert.deepEqual(programWeek(program, now), {
      current: 2,
      total: 8,
      anchored: true,
    });
    const bounds = selectedWeekBounds(program, 2, now);
    assert.equal(bounds.start.getDate(), 26);
    assert.equal(bounds.end.getDate(), 2);
    assert.equal(bounds.end.getMonth(), 10);
    program.startsOn = null;
    assert.deepEqual(programWeek(program, now), {
      current: 1,
      total: 1,
      anchored: false,
    });
    program.startsOn = '2026-10-19';
    program.durationWeeks = null;
    assert.equal(programWeek(program, now).anchored, false);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
test('day completion requires the same program/day, a completed session and the selected calendar week', () => {
  const program = cachedProgram(),
    day = program.days[0]!,
    start = new Date('2026-10-05T12:00:00Z');
  const summary = {
    id: randomUUID(),
    programId: program.id,
    programDayId: day.id,
    status: 'completed',
    completedAt: '2026-10-06T12:00:00Z',
  } as WorkoutSummary;
  assert.equal(
    completedDay(day, program.id, [summary], start, 'Europe/Rome'),
    true,
  );
  for (const invalid of [
    { ...summary, programId: randomUUID() },
    { ...summary, programDayId: randomUUID() },
    { ...summary, status: 'cancelled' as const },
    { ...summary, completedAt: '2026-09-29T12:00:00Z' },
    { ...summary, completedAt: null },
  ])
    assert.equal(
      completedDay(day, program.id, [invalid], start, 'Europe/Rome'),
      false,
    );
});
test('current day follows the active session, while historical weeks and draft programs do not pretend to be current', () => {
  const program = cachedProgram(),
    day = program.days[0]!,
    now = new Date('2026-10-05T12:00:00Z');
  const active = {
    programId: program.id,
    programDayId: day.id,
  } as WorkoutDetail;
  assert.equal(
    dayStates(program, [], active, now, true, now).get(day.id),
    'current',
  );
  assert.equal(
    dayStates(program, [], active, now, false, now).get(day.id),
    'future',
  );
  program.status = 'draft';
  assert.equal(
    dayStates(program, [], null, now, true, now).get(day.id),
    'future',
  );
  assert.deepEqual(homeDay(null, now, new Set()), {
    day: null,
    scheduledToday: false,
  });
  day.dayOfWeek = null;
  assert.equal(homeDay(program, now, new Set()).scheduledToday, false);
});
test('Home exercise progress counts finished exercises rather than completed sets or entirely skipped exercises', () => {
  const workout = {
    exercises: [
      { sets: [{ status: 'completed' }, { status: 'completed' }] },
      { sets: [{ status: 'completed' }, { status: 'pending' }] },
      { sets: [{ status: 'skipped' }] },
      { sets: [] },
    ],
  } as WorkoutDetail;
  assert.equal(completedExerciseCount(workout), 1);
});

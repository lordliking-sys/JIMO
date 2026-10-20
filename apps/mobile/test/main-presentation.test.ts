import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { WorkoutDetail, WorkoutSummary } from '@jimo/schemas';
import { cachedProgram } from './offline-fixtures';
import {
  completedDay,
  completedExerciseCount,
  completedProgramExercises,
  dayArtworkKey,
  dayStates,
  homeDay,
  homePlanForDate,
  programWeek,
  selectedWeekBounds,
} from '../src/main/helpers';

test('selected Home date uses live weekday data and date-specific completions, including DST', () => {
  const original = process.env.TZ;
  process.env.TZ = 'Europe/Rome';
  try {
    const program = cachedProgram();
    program.days[0]!.dayOfWeek = 1;
    const monday = new Date('2026-10-26T12:00:00+01:00'),
      tuesday = new Date('2026-10-27T12:00:00+01:00');
    program.days = program.days.slice(0, 1);
    assert.equal(
      homePlanForDate(program, monday, [], 'Europe/Rome').state,
      'workout',
    );
    assert.equal(
      homePlanForDate(program, tuesday, [], 'Europe/Rome').state,
      'rest',
    );
    const done = {
      programId: program.id,
      programDayId: program.days[0]!.id,
      status: 'completed',
      completedAt: '2026-10-26T22:30:00Z',
    } as WorkoutSummary;
    assert.equal(
      homePlanForDate(program, monday, [done], 'Europe/Rome').completed,
      true,
    );
    assert.equal(
      homePlanForDate(
        program,
        monday,
        [{ ...done, completedAt: '2026-10-26T23:30:00Z' }],
        'Europe/Rome',
      ).completed,
      false,
    );
    assert.equal(
      homePlanForDate(
        program,
        monday,
        [{ ...done, status: 'cancelled' }],
        'Europe/Rome',
      ).completed,
      false,
    );
    program.days[0]!.exercises = [];
    assert.equal(
      homePlanForDate(program, monday, [], 'Europe/Rome').state,
      'empty',
    );
    program.days = [];
    assert.equal(
      homePlanForDate(program, monday, [], 'Europe/Rome').state,
      'rest',
    );
    program.status = 'draft';
    assert.equal(
      homePlanForDate(program, monday, [], 'Europe/Rome').state,
      'no-program',
    );
    assert.equal(
      homePlanForDate(null, monday, [], 'Europe/Rome').state,
      'no-program',
    );
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

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

test('Home never borrows exercises from another weekday or an unscheduled day', () => {
  const program = cachedProgram(),
    now = new Date('2026-10-08T12:00:00');
  program.days[0]!.dayOfWeek = 1;
  assert.deepEqual(homeDay(program, now, new Set()), {
    day: null,
    scheduledToday: false,
  });
  program.days[0]!.dayOfWeek = null;
  assert.deepEqual(homeDay(program, now, new Set()), {
    day: null,
    scheduledToday: false,
  });
  program.days[0]!.dayOfWeek = 4;
  assert.equal(homeDay(program, now, new Set()).day?.id, program.days[0]!.id);
  program.status = 'archived';
  assert.deepEqual(homeDay(program, now, new Set()), {
    day: null,
    scheduledToday: false,
  });
});

test('Home selects an unfinished session only among today’s real days', () => {
  const program = cachedProgram(),
    now = new Date('2026-10-08T12:00:00');
  const first = program.days[0]!;
  first.dayOfWeek = 4;
  program.days.push({
    ...structuredClone(first),
    id: randomUUID(),
    position: 1,
  });
  const second = program.days[1]!;
  assert.equal(homeDay(program, now, new Set([first.id])).day?.id, second.id);
  assert.equal(
    homeDay(program, now, new Set([first.id, second.id])).day?.id,
    first.id,
  );
  assert.equal(
    homeDay(program, new Date('2026-10-09T12:00:00'), new Set()).day,
    null,
  );
});

test('Home uses the device’s local date near midnight and across daylight saving time', () => {
  const original = process.env.TZ;
  process.env.TZ = 'Europe/Rome';
  try {
    const program = cachedProgram();
    program.days[0]!.dayOfWeek = 1;
    assert.equal(
      homeDay(program, new Date('2026-10-25T23:30:00Z'), new Set()).day?.id,
      program.days[0]!.id,
    );
    assert.equal(
      homeDay(program, new Date('2026-10-25T00:30:00Z'), new Set()).day,
      null,
    );
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('Home completion checks require every set and exact program entry, day and program', () => {
  const workout = {
    status: 'in_progress',
    programId: 'program',
    programDayId: 'monday',
    exercises: [
      {
        programExerciseId: 'entry-a',
        exerciseId: 'same-catalog',
        sets: [{ status: 'completed' }, { status: 'completed' }],
      },
      {
        programExerciseId: 'entry-b',
        exerciseId: 'same-catalog',
        sets: [{ status: 'completed' }, { status: 'pending' }],
      },
      {
        programExerciseId: 'entry-c',
        sets: [{ status: 'completed' }, { status: 'skipped' }],
      },
      { programExerciseId: 'entry-d', sets: [{ status: 'skipped' }] },
      { programExerciseId: 'entry-e', sets: [] },
      { programExerciseId: null, sets: [{ status: 'completed' }] },
    ],
  } as WorkoutDetail;
  assert.deepEqual(
    [...completedProgramExercises(workout, 'program', 'monday')],
    ['entry-a'],
  );
  assert.equal(
    completedProgramExercises(workout, 'program', 'wednesday').size,
    0,
  );
  assert.equal(completedProgramExercises(workout, 'other', 'monday').size, 0);
  assert.equal(completedProgramExercises(null, 'program', 'monday').size, 0);
  workout.status = 'completed';
  assert.deepEqual(
    [...completedProgramExercises(workout, 'program', 'monday')],
    ['entry-a'],
  );
  workout.status = 'cancelled';
  assert.equal(completedProgramExercises(workout, 'program', 'monday').size, 0);
});

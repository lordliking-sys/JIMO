import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  progressQuerySchema,
  progressListQuerySchema,
  workoutHistoryQuerySchema,
  timeZoneSchema,
  calendarWeekStart,
  zonedDateKey,
  currentWeekAdherence,
  scheduledDayCompleted,
} from '../src';
test('progress ranges default to eight weeks; IANA zones, dates, cursors and limits are strict', () => {
  assert.deepEqual(progressQuerySchema.parse({ timeZone: 'Europe/Rome' }), {
    range: '8w',
    timeZone: 'Europe/Rome',
  });
  for (const range of ['4w', '8w', '12w', '6m', 'all'])
    assert.equal(
      progressQuerySchema.parse({ range, timeZone: 'UTC' }).range,
      range,
    );
  for (const zone of [
    '+02:00',
    'Europe/Nope',
    'EST',
    '',
    'UTC;DROP TABLE users',
  ])
    assert.equal(timeZoneSchema.safeParse(zone).success, false);
  for (const input of [
    { timeZone: 'UTC', range: '200y' },
    { timeZone: 'UTC', userId: 'foreign' },
    { timeZone: 'UTC', from: '1800-01-01' },
    { range: '8w' },
  ])
    assert.equal(progressQuerySchema.safeParse(input).success, false);
  assert.equal(
    progressListQuerySchema.safeParse({ timeZone: 'UTC', limit: 51 }).success,
    false,
  );
  assert.equal(
    progressListQuerySchema.safeParse({
      timeZone: 'UTC',
      search: 'x'.repeat(101),
    }).success,
    false,
  );
  assert.equal(
    workoutHistoryQuerySchema.safeParse({ cursorAt: '2026-10-01T00:00:00Z' })
      .success,
    false,
  );
  assert.equal(
    workoutHistoryQuerySchema.safeParse({
      since: '2026-10-07T00:00:00Z',
      until: '2026-10-01T00:00:00Z',
    }).success,
    false,
  );
});
test('local date and Monday week cross UTC midnight correctly including DST and year boundaries', () => {
  assert.equal(
    zonedDateKey('2026-10-04T23:30:00Z', 'Europe/Rome'),
    '2026-10-05',
  );
  assert.equal(
    calendarWeekStart(zonedDateKey('2026-10-04T23:30:00Z', 'Europe/Rome')),
    '2026-10-05',
  );
  assert.equal(
    calendarWeekStart(zonedDateKey('2026-10-04T23:30:00Z', 'UTC')),
    '2026-09-28',
  );
  assert.equal(
    zonedDateKey('2026-03-28T23:30:00Z', 'Europe/Rome'),
    '2026-03-29',
  );
  assert.equal(
    zonedDateKey('2026-10-25T00:30:00Z', 'Europe/Rome'),
    '2026-10-25',
  );
  assert.equal(
    zonedDateKey('2026-10-25T01:30:00Z', 'Europe/Rome'),
    '2026-10-25',
  );
  assert.equal(calendarWeekStart('2027-01-01'), '2026-12-28');
});
test('current-week adherence shares Home rule: 2/3; ownership, day, status and completion date; duplicates never inflate', () => {
  const days = [
      { id: 'push', dayOfWeek: 1 },
      { id: 'pull', dayOfWeek: 3 },
      { id: 'legs', dayOfWeek: 5 },
    ],
    now = new Date('2026-10-07T12:00:00Z');
  const push = {
    programId: 'p',
    programDayId: 'push',
    status: 'completed',
    completedAt: '2026-10-04T23:30:00Z',
  };
  const pull = {
    ...push,
    programDayId: 'pull',
    completedAt: '2026-10-07T10:00:00Z',
  };
  const sessions = [
    push,
    push,
    pull,
    { ...push, programId: 'foreign' },
    { ...push, status: 'cancelled' },
    { ...push, completedAt: '2026-09-28T10:00:00Z' },
    { ...pull, programDayId: 'legs' },
  ];
  const adherence = currentWeekAdherence(
    days,
    sessions,
    'p',
    now,
    'Europe/Rome',
  );
  assert.deepEqual(adherence, {
    weekStart: '2026-10-05',
    planned: 3,
    completed: 2,
    percentage: (2 / 3) * 100,
  });
  assert.equal(
    scheduledDayCompleted(days[0]!, [push], 'p', '2026-10-05', 'Europe/Rome'),
    true,
  );
  assert.equal(
    scheduledDayCompleted(days[0]!, [push], 'p', '2026-10-05', 'UTC'),
    false,
  );
  assert.equal(
    currentWeekAdherence(
      [{ id: 'p', dayOfWeek: null }],
      sessions,
      'p',
      now,
      'UTC',
    ),
    null,
  );
  assert.equal(currentWeekAdherence([], sessions, 'p', now, 'UTC'), null);
});

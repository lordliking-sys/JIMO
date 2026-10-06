import assert from 'node:assert/strict';
import { test } from 'node:test';
import { greetingPeriod } from '../src/home/greeting';
test('greeting changes at local 05:00, 12:00 and 18:00, including midnight', () => {
  for (const [hour, minute, expected] of [
    [0, 0, 'evening'],
    [4, 59, 'evening'],
    [5, 0, 'morning'],
    [11, 59, 'morning'],
    [12, 0, 'afternoon'],
    [17, 59, 'afternoon'],
    [18, 0, 'evening'],
    [23, 59, 'evening'],
  ] as const)
    assert.equal(greetingPeriod(new Date(2026, 9, 6, hour, minute)), expected);
});
test('greeting uses the device timezone rather than UTC or the server timezone', () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'Europe/Rome';
    assert.equal(greetingPeriod(new Date('2026-10-06T10:30:00Z')), 'afternoon');
    process.env.TZ = 'America/New_York';
    assert.equal(greetingPeriod(new Date('2026-10-06T18:30:00Z')), 'afternoon');
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

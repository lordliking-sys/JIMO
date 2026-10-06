import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calendarDateLabel,
  calendarDateValue,
  parseCalendarDate,
} from '../src/programs/date';
import { stepInteger } from '../src/programs/helpers';
import { scrollToReveal } from '../../../packages/ui/src/keyboard';

test('quick adjustments respect domain bounds and preserve manual values', () => {
  const weeks = { min: 1, max: 520, initial: 4 };
  assert.equal(stepInteger('', 1, weeks), '4');
  assert.equal(stepInteger('1', -1, weeks), '1');
  assert.equal(stepInteger('520', 1, weeks), '520');
  assert.equal(stepInteger('7', 1, weeks), '8');
  assert.equal(stepInteger('75', 1, { min: 0, max: 86400, step: 30 }), '105');
  assert.equal(stepInteger('15', -1, { min: 0, max: 86400, step: 30 }), '0');
  assert.equal(stepInteger('100', 1, { min: 1, max: 100 }), '100');
  assert.throws(() => stepInteger('3.5', 1, weeks));
  assert.throws(() => stepInteger('1e3', 1, weeks));
});
test('calendar dates reject impossible dates and format in the selected language', () => {
  for (const value of [
    '2026-02-30',
    '2026-13-01',
    '2026-00-10',
    '2026-01-00',
    '06/10/2026',
    '',
  ])
    assert.equal(parseCalendarDate(value), null);
  assert.equal(
    calendarDateValue(parseCalendarDate('2028-02-29')!),
    '2028-02-29',
  );
  assert.equal(calendarDateLabel('2026-10-06', 'it'), '6 ottobre 2026');
  assert.equal(calendarDateLabel('2026-10-06', 'en'), 'October 6, 2026');
  assert.equal(calendarDateLabel('', 'it'), '');
});
test('calendar dates stay unchanged across device timezones and DST boundaries', () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of [
      'Europe/Rome',
      'America/Los_Angeles',
      'Pacific/Auckland',
    ]) {
      process.env.TZ = timezone;
      for (const value of ['2026-03-29', '2026-10-25', '2028-02-29']) {
        const date = parseCalendarDate(value)!;
        assert.equal(date.getHours(), 12);
        assert.equal(calendarDateValue(date), value);
      }
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test('form scroll reveals covered fields, accounts for the footer and avoids unnecessary movement', () => {
  const viewport = { viewportTop: 30, viewportBottom: 350, offset: 100 };
  assert.equal(
    scrollToReveal({ ...viewport, fieldTop: 150, fieldHeight: 48 }),
    100,
  );
  assert.equal(
    scrollToReveal({ ...viewport, fieldTop: 330, fieldHeight: 48 }),
    144,
  );
  assert.equal(
    scrollToReveal({ ...viewport, fieldTop: 15, fieldHeight: 48 }),
    69,
  );
  assert.equal(
    scrollToReveal({ ...viewport, fieldTop: 15, fieldHeight: 48, offset: 0 }),
    0,
  );
  assert.equal(
    scrollToReveal({ ...viewport, fieldTop: 46, fieldHeight: 500 }),
    100,
  );
});

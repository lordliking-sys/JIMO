import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInstance } from 'i18next';
import type { Prescription } from '@jimo/schemas';
import { resources } from '../src/i18n/resources';
import { exerciseSummary } from '../src/programs/summary';
import { weekdayNumbers, weekdayValue } from '../src/programs/weekdays';
import { decimalInput, decimalDisplay } from '../src/programs/helpers';
import { tabLabelKey } from '../src/components/tab-labels';

const base: Prescription = {
  exerciseId: '3c9e1b7d-7596-4f15-a11c-48b8ef237413',
  loadMode: 'external',
  targetSets: 4,
  targetReps: 8,
  targetLoadKg: '80.00',
  targetRpe: '8.0',
  restSeconds: 180,
};
test('FORZA summaries clearly distinguish external load, added weight, range and rest', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'it', resources });
  const t = i18n.getFixedT('it', 'programs');
  assert.deepEqual(exerciseSummary(base, 'it', t), {
    target: '4 × 8',
    load: '80 kg',
    primary: '4 × 8 · 80 kg',
    details: 'RPE 8 · Recupero 3:00',
  });
  assert.equal(
    exerciseSummary(
      { ...base, loadMode: 'weighted', targetLoadKg: '20.00' },
      'it',
      t,
    ).primary,
    '4 × 8 · +20 kg',
  );
  const dip = exerciseSummary(
    {
      ...base,
      loadMode: 'weighted',
      targetSets: 3,
      targetReps: null,
      targetRepMin: 8,
      targetRepMax: 12,
      targetLoadKg: '10.00',
      restSeconds: 120,
    },
    'it',
    t,
  );
  assert.equal(dip.primary, '3 × 8–12 · +10 kg');
  assert.equal(dip.details, 'RPE 8 · Recupero 2:00');
  assert.equal(
    exerciseSummary(
      { ...base, targetReps: 10, targetLoadKg: '70.00', restSeconds: 120 },
      'it',
      t,
    ).primary,
    '4 × 10 · 70 kg',
  );
});
test('bodyweight, assistance and timed summaries use the correct fields and optional values', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'it', resources });
  const it = i18n.getFixedT('it', 'programs'),
    en = i18n.getFixedT('en', 'programs');
  assert.equal(
    exerciseSummary(
      { ...base, loadMode: 'bodyweight', targetLoadKg: null, targetReps: 15 },
      'it',
      it,
    ).primary,
    '4 × 15 · Corpo libero',
  );
  const assisted: Prescription = {
    ...base,
    loadMode: 'assisted',
    targetSets: 3,
    targetReps: 10,
    targetLoadKg: null,
    targetAssistanceKg: '15.00',
    targetRpe: null,
    restSeconds: null,
  };
  assert.deepEqual(exerciseSummary(assisted, 'it', it), {
    target: '3 × 10',
    load: 'Assistenza 15 kg',
    primary: '3 × 10 · Assistenza 15 kg',
    details: '',
  });
  assert.equal(
    exerciseSummary(assisted, 'en', en).primary,
    '3 × 10 · Assistance 15 kg',
  );
  assert.equal(
    exerciseSummary(
      {
        ...base,
        loadMode: 'bodyweight',
        targetLoadKg: null,
        targetSets: 3,
        targetReps: null,
        targetDurationSeconds: 60,
      },
      'it',
      it,
    ).primary,
    '3 × 60 sec · Corpo libero',
  );
  assert.equal(
    exerciseSummary(
      { ...base, targetLoadKg: '1.25', targetRpe: '8.5', restSeconds: 0 },
      'it',
      it,
    ).details,
    'RPE 8,5 · Recupero 0 sec',
  );
  assert.equal(
    exerciseSummary(
      { ...base, targetLoadKg: null, targetRpe: null, restSeconds: null },
      'it',
      it,
    ).primary,
    '4 × 8 · Carico esterno',
  );
});
test('manual added weights retain all requested exact decimal values', () => {
  for (const value of ['1.25', '2.50', '5.00', '7.50', '12.50', '22.50']) {
    assert.equal(decimalInput(value.replace('.', ','), 2), value);
    assert.equal(decimalInput(decimalDisplay(value, 'it'), 2), value);
  }
});
test('weekday chips map Monday through Sunday to the existing database values, with a nullable choice', () => {
  assert.deepEqual(weekdayNumbers, [1, 2, 3, 4, 5, 6, 7]);
  for (const number of weekdayNumbers)
    assert.equal(weekdayValue(String(number)), number);
  assert.equal(weekdayValue(''), null);
  for (const invalid of ['0', '8', '-1', 'Monday', '1.5', '01'])
    assert.throws(() => weekdayValue(invalid));
});
test('tab captions shorten before wrapping on narrow screens or with larger text', () => {
  assert.equal(tabLabelKey('program', 320, 1), 'compact.program');
  assert.equal(tabLabelKey('workout', 320, 1), 'compact.workout');
  assert.equal(tabLabelKey('progress', 320, 1), 'progress');
  assert.equal(tabLabelKey('progress', 320, 1.1), 'compact.progress');
  assert.equal(tabLabelKey('workout', 320, 1.3), 'short.workout');
  assert.equal(tabLabelKey('program', 320, 1.5), 'short.program');
  assert.equal(tabLabelKey('profile', 320, 1.5), 'short.profile');
  assert.equal(tabLabelKey('progress', 280, 1), 'compact.progress');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  initialPrescriptionMode,
  initialPrescriptionRpe,
  manualLoadModes,
} from '../src/programs/prescription-ui';
import { decimalDisplay, stepDecimal } from '../src/programs/helpers';

test('new manual prescriptions offer three modes, without altering existing assistance', () => {
  assert.deepEqual(manualLoadModes, ['bodyweight', 'weighted', 'external']);
  assert.equal(initialPrescriptionMode('assisted'), 'bodyweight');
  assert.equal(initialPrescriptionMode('weighted'), 'weighted');
  assert.equal(initialPrescriptionMode('external'), 'external');
  assert.equal(initialPrescriptionMode(null), 'bodyweight');
  assert.equal(
    initialPrescriptionMode(null, { loadMode: 'assisted' }),
    'assisted',
  );
  assert.equal(initialPrescriptionMode('weighted', { loadMode: null }), '');
});
test('RPE defaults to eight only for a new manual prescription', () => {
  for (const locale of ['it', 'en']) {
    assert.equal(initialPrescriptionRpe(undefined, false, locale), '8');
    assert.equal(
      initialPrescriptionRpe({ targetRpe: null }, false, locale),
      '',
    );
    assert.equal(initialPrescriptionRpe({}, false, locale), '');
    assert.equal(initialPrescriptionRpe(undefined, true, locale), '');
    assert.equal(initialPrescriptionRpe({ targetRpe: null }, true, locale), '');
  }
  assert.equal(
    initialPrescriptionRpe({ targetRpe: '7.5' }, false, 'it'),
    '7,5',
  );
  assert.equal(
    initialPrescriptionRpe({ targetRpe: '7.5' }, false, 'en'),
    '7.5',
  );
});
test('RPE controls keep half-point increments and existing valid bounds', () => {
  assert.equal(decimalDisplay(stepDecimal('8.0', '0.5', 1, 1), 'it'), '8,5');
  assert.equal(decimalDisplay(stepDecimal('8.0', '0.5', -1, 1), 'en'), '7.5');
  assert.equal(stepDecimal('10.0', '0.5', 1, 1), '10.0');
  assert.equal(stepDecimal('1.0', '0.5', -1, 1), '1.0');
});

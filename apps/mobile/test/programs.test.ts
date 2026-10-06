import assert from 'node:assert/strict';
import { test } from 'node:test';
import { programInputSchema, prescriptionFor } from '@jimo/schemas';
import {
  decimalInput,
  decimalDisplay,
  stepDecimal,
  integerInput,
  restDisplay,
  moved,
  loadFields,
  statusKey,
} from '../src/programs/helpers';
import { createApiClient, ApiClientError } from '../src/api/client';
import { z } from 'zod';
test('program forms validate calendar dates, name and duration', () => {
  assert.equal(
    programInputSchema.parse({
      name: ' Upper ',
      startsOn: '2026-10-06',
      durationWeeks: 6,
    }).name,
    'Upper',
  );
  for (const patch of [
    { name: ' ' },
    { durationWeeks: 0 },
    { startsOn: '2026-02-30' },
  ])
    assert.ok(
      !programInputSchema.safeParse({ name: 'Upper', ...patch }).success,
    );
  assert.equal(integerInput('180'), 180);
  assert.throws(() => integerInput('3.5'));
  assert.throws(() => integerInput('1e3'));
});
test('UI decimal conversion and exact 2.5 kg steps preserve 1.25 and comma input', () => {
  assert.equal(decimalInput('22,5', 2), '22.50');
  assert.equal(decimalDisplay('22.50', 'it'), '22,5');
  assert.equal(decimalDisplay('8.0', 'en'), '8');
  assert.equal(stepDecimal('1.25', '2.50', 1, 2), '3.75');
  assert.equal(stepDecimal('3.75', '2.50', -1, 2), '1.25');
  assert.equal(stepDecimal('0.00', '2.50', -1, 2), '0.00');
  assert.throws(() => decimalInput('1.234', 2));
  assert.equal(stepDecimal('9999997.49', '2.50', 1, 2), '9999999.99');
  assert.throws(() => stepDecimal('9999999.99', '2.50', 1, 2));
});
test('RPE half steps, bounds and load conditional fields', () => {
  assert.equal(stepDecimal('8.0', '0.5', 1, 1), '8.5');
  assert.equal(stepDecimal('10.0', '0.5', 1, 1), '10.0');
  assert.equal(stepDecimal('1.0', '0.5', -1, 1), '1.0');
  assert.deepEqual(loadFields('bodyweight'), {
    load: false,
    assistance: false,
  });
  assert.deepEqual(loadFields('assisted'), { load: false, assistance: true });
  assert.deepEqual(loadFields('weighted'), { load: true, assistance: false });
  const base = {
    exerciseId: '3c9e1b7d-7596-4f15-a11c-48b8ef237413',
    targetSets: 3,
    targetReps: 8,
    loadMode: 'weighted',
    targetLoadKg: '20.00',
  };
  assert.ok(
    prescriptionFor('reps').safeParse({ ...base, targetRpe: '8.5' }).success,
  );
  assert.ok(
    !prescriptionFor('reps').safeParse({ ...base, targetRpe: '8.3' }).success,
  );
  assert.ok(!prescriptionFor('duration').safeParse(base).success);
  assert.ok(
    !prescriptionFor('reps').safeParse({ ...base, targetDurationSeconds: 60 })
      .success,
  );
});
test('rest format, reorder and status presentation', () => {
  assert.equal(restDisplay(30), '30');
  assert.equal(restDisplay(60), '1:00');
  assert.equal(restDisplay(90), '1:30');
  assert.equal(restDisplay(180), '3:00');
  assert.equal(restDisplay(null), '');
  assert.deepEqual(moved(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
  assert.deepEqual(moved(['a'], 0, -1), ['a']);
  for (const status of ['draft', 'active', 'archived'] as const)
    assert.equal(statusKey(status), `status.${status}`);
});
test('API client parses responses and hides raw network/server details', async () => {
  const ok = createApiClient(
    'https://api.example.invalid',
    async () => new Response(JSON.stringify({ value: 1 }), { status: 200 }),
  );
  assert.deepEqual(await ok('/test', z.object({ value: z.number() })), {
    value: 1,
  });
  for (const [fetcher, code] of [
    [
      async () =>
        new Response(
          JSON.stringify({
            error: { code: 'CONFLICT', message: 'server detail' },
          }),
          { status: 409 },
        ),
      'CONFLICT',
    ],
    [async () => new Response('invalid', { status: 200 }), 'INVALID_RESPONSE'],
    [
      async () => {
        throw new Error('sensitive-network-detail');
      },
      'NETWORK_ERROR',
    ],
  ] as const) {
    const request = createApiClient('https://api.example.invalid', fetcher);
    await assert.rejects(
      request('/test', z.object({ value: z.number() })),
      (error: unknown) =>
        error instanceof ApiClientError &&
        error.code === code &&
        !error.message.includes('sensitive'),
    );
  }
  await assert.rejects(
    createApiClient(undefined)('/test', z.unknown()),
    (error: unknown) =>
      error instanceof ApiClientError && error.code === 'API_NOT_CONFIGURED',
  );
});

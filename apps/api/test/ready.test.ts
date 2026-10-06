import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app';
import { readEnv } from '../src/env';

test('readiness checks database; liveness stays available during failure', async () => {
  let available = true;
  const app = buildApp({
    checkDatabase: async () => {
      if (!available) throw new Error('sensitive-driver-details');
    },
  });
  try {
    const ready = await app.inject('/ready');
    assert.equal(ready.statusCode, 200);
    assert.deepEqual(ready.json(), { status: 'ready', database: 'ok' });
    available = false;
    const unavailable = await app.inject('/ready');
    assert.equal(unavailable.statusCode, 503);
    assert.deepEqual(unavailable.json(), {
      status: 'not_ready',
      database: 'unavailable',
    });
    assert.ok(!unavailable.body.includes('sensitive-driver-details'));
    assert.equal((await app.inject('/health')).statusCode, 200);
  } finally {
    await app.close();
  }
});
test('production configuration fails fast without revealing invalid values', () => {
  assert.throws(() => readEnv({ NODE_ENV: 'production' }), /DATABASE_URL/);
  assert.throws(
    () => readEnv({ DATABASE_URL: 'sensitive-value' }),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes('DATABASE_URL') &&
      !error.message.includes('sensitive-value'),
  );
});

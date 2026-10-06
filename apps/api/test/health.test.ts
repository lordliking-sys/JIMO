import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app';
import { readEnv } from '../src/env';
test('GET /health returns the service contract', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok', service: 'jimo-api' });
  } finally {
    await app.close();
  }
});
test('PORT defaults and overrides are validated', () => {
  const DATABASE_URL = 'postgresql://test:test@example.invalid/test';
  assert.equal(readEnv({ DATABASE_URL }).PORT, 3001);
  assert.equal(readEnv({ PORT: '4321', DATABASE_URL }).PORT, 4321);
  for (const PORT of ['', '0', '65536', '3.5', 'invalid']) {
    assert.throws(() => readEnv({ PORT, DATABASE_URL }));
  }
});

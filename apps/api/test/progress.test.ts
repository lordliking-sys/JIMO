import { createDatabase } from '@jimo/database';
import { buildApp } from '../src/app';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionFrequency } from '../src/progress-service';
test('frequency uses effective partial weeks, preserves precision and cannot divide by zero', () => {
  assert.equal(sessionFrequency(3, 1.5), 2);
  assert.equal(sessionFrequency(16, 8), 2);
  assert.equal(sessionFrequency(0, 8), 0);
  assert.equal(sessionFrequency(3, 7.95), 3 / 7.95);
  for (const weeks of [0, -1, NaN, Infinity])
    assert.throws(() => sessionFrequency(3, weeks), /INVALID_PROGRESS_PERIOD/);
});
test('expected owner header is a namespace guard, never CurrentUser authority', async () => {
  const database = createDatabase(
      'postgresql://test:test@example.invalid/test',
    ),
    id = '3c9e1b7d-7596-4f15-a11c-48b8ef237413',
    foreign = '5c9e1b7d-7596-4f15-a11c-48b8ef237413';
  const app = buildApp({
    database,
    currentUser: async () => ({ id }),
    logger: false,
  });
  try {
    for (const url of [
      '/progress/summary?timeZone=UTC',
      '/progress/weekly?timeZone=UTC',
      '/progress/prs?timeZone=UTC',
      '/progress/exercises?timeZone=UTC',
      `/progress/exercises/${id}?timeZone=UTC`,
      `/progress/workouts/${id}/records`,
      '/workouts',
    ]) {
      const response = await app.inject({
        url,
        headers: { 'x-jimo-owner': foreign },
      });
      assert.equal(response.statusCode, 403);
      assert.equal(response.json().error.code, 'IDENTITY_CHANGED');
    }
  } finally {
    await app.close();
    await database.close();
  }
});

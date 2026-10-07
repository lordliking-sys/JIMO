import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDatabase } from '@jimo/database';
import { buildApp } from '../src/app';
import { developmentCurrentUser } from '../src/current-user';
import { readEnv } from '../src/env';
test('production has no development identity and rejects dev configuration', async () => {
  const database = createDatabase(
    'postgresql://test:test@example.invalid/test',
  );
  try {
    const currentUser = await developmentCurrentUser(database, {
      mode: 'production',
      userId: '3c9e1b7d-7596-4f15-a11c-48b8ef237413',
    });
    const app = buildApp({ database, currentUser, logger: false });
    try {
      for (const url of [
        '/sync/identity',
        '/progress/summary?timeZone=UTC',
        '/progress/weekly?timeZone=UTC',
        '/progress/prs?timeZone=UTC',
        '/progress/exercises?timeZone=UTC',
        '/progress/exercises/3c9e1b7d-7596-4f15-a11c-48b8ef237413?timeZone=UTC',
        '/progress/workouts/3c9e1b7d-7596-4f15-a11c-48b8ef237413/records',
        '/programs',
        '/exercises',
        '/workouts',
        '/workouts/active',
        '/workouts/3c9e1b7d-7596-4f15-a11c-48b8ef237413',
      ]) {
        const response = await app.inject(url);
        assert.equal(response.statusCode, 401);
        assert.deepEqual(response.json(), {
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        });
      }
      for (const [method, url] of [
        ['POST', '/sync/workout-operations'],
        ['POST', '/workouts/start'],
        ['POST', '/workout-sets/3c9e1b7d-7596-4f15-a11c-48b8ef237413/complete'],
        ['PATCH', '/workout-sets/3c9e1b7d-7596-4f15-a11c-48b8ef237413'],
        ['POST', '/workout-sets/3c9e1b7d-7596-4f15-a11c-48b8ef237413/skip'],
        ['POST', '/workouts/3c9e1b7d-7596-4f15-a11c-48b8ef237413/complete'],
        ['POST', '/workouts/3c9e1b7d-7596-4f15-a11c-48b8ef237413/cancel'],
      ] as const) {
        assert.equal(
          (await app.inject({ method, url, payload: {} })).statusCode,
          401,
        );
      }
      const oversized = await app.inject({
        method: 'POST',
        url: '/sync/workout-operations',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ data: 'x'.repeat(1024 * 1024) }),
      });
      assert.equal(oversized.statusCode, 413);
      assert.equal(oversized.json().error.code, 'REQUEST_TOO_LARGE');
      assert.equal((await app.inject('/health')).statusCode, 200);
    } finally {
      await app.close();
    }
    assert.throws(() =>
      readEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://test:test@example.invalid/test',
        DEV_USER_ID: '3c9e1b7d-7596-4f15-a11c-48b8ef237413',
      }),
    );
    assert.equal(
      readEnv({
        DATABASE_URL: 'postgresql://test:test@example.invalid/test',
        DEV_USER_ID: '',
        ALLOW_DEV_AUTH: 'true',
      }).DEV_USER_ID,
      undefined,
    );
  } finally {
    await database.close();
  }
});

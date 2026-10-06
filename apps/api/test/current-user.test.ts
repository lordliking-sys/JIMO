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
      for (const url of ['/programs', '/exercises']) {
        const response = await app.inject(url);
        assert.equal(response.statusCode, 401);
        assert.deepEqual(response.json(), {
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        });
      }
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
      }).DEV_USER_ID,
      undefined,
    );
  } finally {
    await database.close();
  }
});

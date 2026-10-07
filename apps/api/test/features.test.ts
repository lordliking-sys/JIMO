import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createDatabase } from '@jimo/database';
import { buildApp } from '../src/app';
import { readEnv } from '../src/env';
import { FakeWorkoutPlanExtractor } from './fixtures/fake-extractor';

test('backend key is optional and import is an explicit opt-in, even with a key present', () => {
  const input = {
    DATABASE_URL: 'postgresql://fixture:fixture@example.invalid/fixture',
    ALLOW_DEV_AUTH: 'true',
  };
  const disabled = readEnv(input);
  assert.equal(disabled.OPENAI_API_KEY, undefined);
  assert.equal(disabled.AI_IMPORT_ENABLED, 'false');
  assert.equal(
    readEnv({ ...input, OPENAI_API_KEY: 'synthetic-not-a-real-key' })
      .AI_IMPORT_ENABLED,
    'false',
  );
  assert.equal(
    readEnv({ ...input, AI_IMPORT_ENABLED: 'true' }).OPENAI_API_KEY,
    undefined,
  );
  assert.throws(() => readEnv({ ...input, AI_IMPORT_ENABLED: '1' }));
});
test('disabled import keeps health/ready online and blocks upload AND confirmation without invoking extractor or database', async () => {
  const client = createDatabase(
    'postgresql://fixture:fixture@example.invalid/fixture',
  );
  let databaseCalls = 0;
  const database = {
    ...client,
    sqlClient: new Proxy(client.sqlClient, {
      get(target, key) {
        if (key === 'query' || key === 'transaction')
          return () => {
            databaseCalls++;
            throw new Error('Disabled import must not access database');
          };
        return Reflect.get(target, key);
      },
    }),
  };
  try {
    for (const options of [
      {
        aiImportEnabled: false,
        importExtractor: new FakeWorkoutPlanExtractor(),
      },
      { aiImportEnabled: true },
      { importExtractor: new FakeWorkoutPlanExtractor() },
    ]) {
      let readinessChecks = 0;
      const app = buildApp({
        database,
        currentUser: async () => ({ id: randomUUID() }),
        logger: false,
        checkDatabase: async () => {
          readinessChecks++;
        },
        ...options,
      });
      try {
        for (const url of ['/health', '/ready'])
          assert.equal((await app.inject({ url })).statusCode, 200);
        assert.equal(readinessChecks, 1);
        const config = await app.inject({ url: '/features' });
        assert.equal(config.statusCode, 200);
        assert.deepEqual(config.json(), {
          workoutPlanImport: false,
          aiProgramCreation: false,
        });
        for (const url of [
          '/imports/workout-plan',
          '/imports/workout-plan/confirm',
        ]) {
          const response = await app.inject({
            method: 'POST',
            url,
            payload: {},
          });
          assert.equal(response.statusCode, 404);
          assert.deepEqual(response.json(), {
            error: { code: 'FEATURE_DISABLED', message: 'Feature unavailable' },
          });
        }
        assert.equal(options.importExtractor?.calls ?? 0, 0);
        assert.equal(databaseCalls, 0);
      } finally {
        await app.close();
      }
    }
  } finally {
    await client.close();
  }
});
test('public availability exposes only booleans and never starts an extraction', async () => {
  const database = createDatabase(
    'postgresql://fixture:fixture@example.invalid/fixture',
  );
  const fake = new FakeWorkoutPlanExtractor();
  const app = buildApp({
    database,
    aiImportEnabled: true,
    importExtractor: fake,
    importModel: 'private-model-config',
    logger: false,
  });
  try {
    const response = await app.inject({ url: '/features' });
    assert.deepEqual(response.json(), {
      workoutPlanImport: true,
      aiProgramCreation: false,
    });
    assert.equal(fake.calls, 0);
  } finally {
    await app.close();
    await database.close();
  }
});

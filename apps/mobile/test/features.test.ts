import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configureTokenProvider } from '../src/auth/tokens';
import {
  disabledFeatures,
  fetchFeatureConfig,
  importAvailable,
} from '../src/features/config';
test('mobile flag off makes no request and cannot be enabled by server metadata alone', async () => {
  const fetcher: typeof fetch = async () => {
    throw new Error('No request expected');
  };
  for (const flag of [undefined, '', 'false', 'TRUE', '1']) {
    assert.deepEqual(
      await fetchFeatureConfig('https://api.example.invalid', flag, fetcher),
      disabledFeatures,
    );
    assert.equal(
      importAvailable(flag, {
        workoutPlanImport: true,
        aiProgramCreation: false,
      }),
      false,
    );
  }
  assert.equal(importAvailable('true'), false);
});
test('mobile opt-in still requires valid server availability; metadata never includes auth and failure stays disabled', async () => {
  let config: unknown = disabledFeatures;
  let calls = 0;
  const fetcher: typeof fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), 'https://api.example.invalid/features');
    assert.equal(new Headers(init?.headers).has('Authorization'), false);
    assert.equal(init?.method, 'GET');
    return Response.json(config);
  };
  const read = () =>
    fetchFeatureConfig('https://api.example.invalid', 'true', fetcher);
  assert.equal(importAvailable('true', await read()), false);
  config = { workoutPlanImport: true, aiProgramCreation: false };
  assert.equal(importAvailable('true', await read()), true);
  config = { workoutPlanImport: true, aiProgramCreation: true };
  assert.deepEqual(await read(), disabledFeatures);
  config = {
    workoutPlanImport: true,
    aiProgramCreation: false,
    secret: 'synthetic',
  };
  assert.deepEqual(await read(), disabledFeatures);
  assert.deepEqual(
    await fetchFeatureConfig(undefined, 'true', fetcher),
    disabledFeatures,
  );
  assert.deepEqual(
    await fetchFeatureConfig(
      'https://api.example.invalid',
      'true',
      async () => {
        throw new Error('offline');
      },
    ),
    disabledFeatures,
  );
  assert.equal(calls, 4);
});
test('public feature availability survives login/account generation changes without requesting a Clerk token', async () => {
  configureTokenProvider({
    getToken: async () => {
      throw new Error('Public metadata must not request auth');
    },
    unauthorized: () => {
      throw new Error('Public metadata must not log out');
    },
  });
  try {
    const config = await fetchFeatureConfig(
      'https://api.example.invalid',
      'true',
      async () => {
        configureTokenProvider(null);
        return Response.json({
          workoutPlanImport: true,
          aiProgramCreation: false,
        });
      },
    );
    assert.equal(importAvailable('true', config), true);
  } finally {
    configureTokenProvider(null);
  }
});

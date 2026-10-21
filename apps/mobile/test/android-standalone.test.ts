import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import type { ExpoConfig } from 'expo/config';
import { developmentConfig } from '../app.config';

const require = createRequire(import.meta.url);
const { publicBuildEnvironment, checkHostedApi } =
  require('../scripts/android-standalone.cjs') as {
    publicBuildEnvironment: (
      env: Record<string, string>,
    ) => Record<string, string>;
    checkHostedApi: (url: string, fetcher: typeof fetch) => Promise<void>;
  };
const base: ExpoConfig = {
  name: 'JIMO',
  slug: 'jimo',
  scheme: 'jimo',
  plugins: ['expo-router'],
};
const env = {
  JIMO_APP_VARIANT: 'development',
  JIMO_STANDALONE: 'true',
  EXPO_PUBLIC_API_URL: 'https://jimo-development.example.com',
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
    'pk_test_c3ludGhldGljLmNsZXJrLmFjY291bnRzLmRldiQ=',
};

test('standalone preserves development identity, disables cleartext and generated dev launcher scheme', () => {
  const config = developmentConfig(base, env);
  assert.equal(config.android?.package, 'com.jimo.development');
  assert.equal(config.scheme, 'jimo-dev');
  assert.equal(config.extra?.jimoStandalone, true);
  assert.ok(
    config.plugins?.some(
      (p) =>
        Array.isArray(p) &&
        p[0] === 'expo-dev-client' &&
        p[1].addGeneratedScheme === false,
    ),
  );
  assert.ok(
    config.plugins?.some(
      (p) =>
        Array.isArray(p) &&
        p[0] === 'expo-build-properties' &&
        p[1].android.usesCleartextTraffic === false,
    ),
  );
  for (const url of [
    'http://example.com',
    'https://192.168.1.138',
    'https://localhost',
    'https://api.local',
    'https://api.internal',
    'https://api.example.test',
  ])
    assert.throws(() =>
      developmentConfig(base, { ...env, EXPO_PUBLIC_API_URL: url }),
    );
  assert.throws(() =>
    developmentConfig(base, { ...env, JIMO_APP_VARIANT: 'production' }),
  );
});

test('build environment strips backend secrets, unintended public variables and auth bypass before Expo evaluation', () => {
  const output = publicBuildEnvironment({
    ...env,
    JAVA_HOME: '/jdk21',
    DATABASE_URL: 'private-sentinel',
    CLERK_SECRET_KEY: 'private-sentinel',
    GH_TOKEN: 'private-sentinel',
    OPENAI_API_KEY: 'private-sentinel',
    EXPO_PUBLIC_OPENAI_API_KEY: 'private-sentinel',
    EXPO_PUBLIC_AUTH_TEST: 'true',
  });
  assert.ok(!JSON.stringify(output).includes('private-sentinel'));
  assert.equal(output.EXPO_PUBLIC_AUTH_TEST, undefined);
  assert.equal(output.JAVA_HOME, '/jdk21');
  assert.equal(output.EXPO_NO_DOTENV, '1');
  assert.equal(output.EXPO_PUBLIC_AI_IMPORT_ENABLED, 'false');
});

test('hosted API preflight is GET-only, requires ready database and rejects unauthenticated private route returning 200', async () => {
  const calls: string[] = [];
  let privateStatus = 401;
  const fetcher = (async (url: string) => {
    calls.push(url);
    return url.endsWith('/me')
      ? new Response('{}', { status: privateStatus })
      : new Response(
          JSON.stringify(
            url.endsWith('/health')
              ? { status: 'ok', service: 'jimo-api' }
              : { status: 'ready', database: 'ok' },
          ),
        );
  }) as typeof fetch;
  await checkHostedApi(env.EXPO_PUBLIC_API_URL, fetcher);
  assert.deepEqual(
    calls,
    ['health', 'ready', 'me'].map((p) => `${env.EXPO_PUBLIC_API_URL}/${p}`),
  );
  privateStatus = 200;
  await assert.rejects(
    checkHostedApi(env.EXPO_PUBLIC_API_URL, fetcher),
    /\/me/,
  );
  await assert.rejects(
    checkHostedApi(env.EXPO_PUBLIC_API_URL, (async () => {
      throw new Error('private-network-sentinel');
    }) as typeof fetch),
    (error) => {
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes('private-network-sentinel'));
      return true;
    },
  );
});

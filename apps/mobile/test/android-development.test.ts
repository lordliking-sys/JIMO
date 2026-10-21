import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import type { ExpoConfig } from 'expo/config';
import { developmentConfig } from '../app.config';
import { accountStartupIssue } from '../src/auth/startup-issue';

const base: ExpoConfig = {
  name: 'JIMO',
  slug: 'jimo',
  scheme: 'jimo',
  android: { package: 'com.example.existing', permissions: ['INTERNET'] },
  plugins: ['expo-router'],
  extra: { existing: true },
};
const environment = {
  JIMO_APP_VARIANT: 'development',
  EXPO_PUBLIC_API_URL: 'http://192.0.2.10:3001',
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_ZGV2LmNsZXJrLmFjY291bnRzLmRldiQ=',
};
test('Android development config isolates identity and HTTP support; default identity/network and source object stay unchanged', () => {
  const before = structuredClone(base);
  const dev = developmentConfig(base, environment);
  assert.equal(dev.android?.package, 'com.jimo.development');
  assert.equal(dev.scheme, 'jimo-dev');
  assert.ok(
    dev.plugins?.some(
      (p) =>
        Array.isArray(p) &&
        p[0] === 'expo-build-properties' &&
        p[1].android.usesCleartextTraffic,
    ),
  );
  const normal = developmentConfig(base, {});
  assert.equal(normal.scheme, base.scheme);
  assert.deepEqual(normal.android, base.android);
  assert.deepEqual(normal.extra, base.extra);
  assert.ok(
    !normal.plugins?.some(
      (p) => Array.isArray(p) && p[0] === 'expo-build-properties',
    ),
  );
  assert.ok(
    normal.plugins?.some(
      (p) =>
        Array.isArray(p) &&
        p[0] === 'expo-dev-client' &&
        p[1].addGeneratedScheme === false,
    ),
  );
  assert.deepEqual(base, before);
  const https = developmentConfig(base, {
    ...environment,
    EXPO_PUBLIC_API_URL: 'https://api.example.test',
  });
  assert.ok(
    https.plugins?.some(
      (p) =>
        Array.isArray(p) &&
        p[0] === 'expo-build-properties' &&
        p[1].android.usesCleartextTraffic === false,
    ),
  );
});
test('native development guard rejects missing/credential URLs, accidental loopback, live Clerk and auth bypass without echoing credentials', () => {
  for (const url of [
    '',
    'localhost:3001',
    'ftp://example.test',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://0.0.0.0:3001',
    'https://name:credential-sentinel@example.test',
    'https://example.test?token=credential-sentinel',
  ]) {
    assert.throws(
      () =>
        developmentConfig(base, { ...environment, EXPO_PUBLIC_API_URL: url }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.ok(!error.message.includes('credential-sentinel'));
        return true;
      },
    );
  }
  assert.doesNotThrow(() =>
    developmentConfig(base, {
      ...environment,
      EXPO_PUBLIC_API_URL: 'http://127.0.0.1:3001',
      JIMO_DEV_API_TRANSPORT: 'adb',
    }),
  );
  assert.throws(() =>
    developmentConfig(base, {
      ...environment,
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_invalid',
    }),
  );
  assert.throws(() =>
    developmentConfig(base, { ...environment, EXPO_PUBLIC_AUTH_TEST: 'true' }),
  );
  const config = developmentConfig(base, {
    ...environment,
    DATABASE_URL: 'database-sentinel',
    CLERK_SECRET_KEY: 'secret-sentinel',
    OPENAI_API_KEY: 'openai-sentinel',
  });
  assert.ok(!JSON.stringify(config).includes('sentinel'));
});
test('API bootstrap failures are distinguished from preferences/auth without exposing raw server errors', () => {
  assert.equal(
    accountStartupIssue({
      code: 'NETWORK_ERROR',
      message: 'raw-private-sentinel',
    }),
    'network',
  );
  assert.equal(accountStartupIssue({ code: 'TIMEOUT' }), 'network');
  assert.equal(accountStartupIssue({ code: 'TOKEN_UNAVAILABLE' }), 'network');
  assert.equal(
    accountStartupIssue({ code: 'API_NOT_CONFIGURED' }),
    'configuration',
  );
  assert.equal(accountStartupIssue({ status: 401 }), 'session');
  assert.equal(
    accountStartupIssue({ status: 500, message: 'raw-private-sentinel' }),
    'server',
  );
  assert.equal(
    accountStartupIssue(new Error('raw-private-sentinel')),
    'generic',
  );
});
test('Windows-compatible preflight checks real HTTP health/ready, exits on DB failure and never prints response bodies', async () => {
  let ready = true;
  const requests: string[] = [],
    auth: (string | undefined)[] = [];
  const server = createServer((request, response) => {
    requests.push(`${request.method} ${request.url}`);
    auth.push(request.headers.authorization);
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/health')
      response.end(JSON.stringify({ status: 'ok', service: 'jimo-api' }));
    else {
      response.statusCode = ready ? 200 : 503;
      response.end(
        JSON.stringify(
          ready
            ? { status: 'ready', database: 'ok' }
            : { error: 'private-body-sentinel' },
        ),
      );
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const run = () =>
    new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ['scripts/android-development.cjs', 'check'],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            ...environment,
            JIMO_DEV_API_TRANSPORT: 'adb',
            EXPO_PUBLIC_API_URL: `http://127.0.0.1:${address.port}`,
          },
        },
      );
      let output = '';
      child.stdout.on('data', (value) => (output += String(value)));
      child.stderr.on('data', (value) => (output += String(value)));
      child.once('error', reject);
      child.once('exit', (code) => resolve({ code, output }));
    });
  try {
    const success = await run();
    assert.equal(success.code, 0, success.output);
    assert.match(success.output, /\/health 200; \/ready 200/);
    ready = false;
    const failure = await run();
    assert.equal(failure.code, 1);
    assert.match(failure.output, /ready: HTTP 503/);
    assert.ok(!failure.output.includes('private-body-sentinel'));
    assert.deepEqual(requests.sort(), [
      'GET /health',
      'GET /health',
      'GET /ready',
      'GET /ready',
    ]);
    assert.ok(auth.every((value) => value === undefined));
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

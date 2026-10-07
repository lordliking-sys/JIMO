import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDatabase } from '@jimo/database';
import { buildApp } from '../src/app';
import { authenticatedCurrentUser } from '../src/auth/resolver';
import { ClerkAuthProvider } from '../src/auth/provider';
import { ApiError } from '../src/errors';
import { readEnv } from '../src/env';
const id = '3c9e1b7d-7596-4f15-a11c-48b8ef237413';
test('auth required, rejected/expired fixtures and verified identity reach only internal UUID', async () => {
  let resolutions = 0;
  const database = createDatabase(
    'postgresql://test:test@example.invalid/test',
  );
  const currentUser = authenticatedCurrentUser(
    {
      verify: async (token) => {
        if (token === 'invalid')
          throw new ApiError(401, 'INVALID_SESSION', 'Invalid session');
        if (token === 'expired')
          throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired');
        assert.equal(token, 'verified-fixture');
        return { provider: 'clerk', subject: 'user_fixture' };
      },
    },
    {
      resolve: async (identity) => {
        resolutions++;
        assert.equal(identity.subject, 'user_fixture');
        return { id };
      },
    },
  );
  const app = buildApp({ database, currentUser, logger: false });
  try {
    for (const [authorization, code] of [
      [undefined, 'AUTH_REQUIRED'],
      ['Basic user', 'INVALID_SESSION'],
      ['Bearer invalid', 'INVALID_SESSION'],
      ['Bearer expired', 'SESSION_EXPIRED'],
    ] as const) {
      for (const url of [
        '/me',
        '/sync/identity',
        '/programs',
        '/workouts',
        '/progress/summary?timeZone=UTC',
      ]) {
        const response = await app.inject({
          url,
          headers: authorization ? { authorization } : {},
        });
        assert.equal(response.statusCode, 401);
        assert.equal(response.json().error.code, code);
      }
    }
    assert.equal(resolutions, 0);
    const valid = await app.inject({
      url: '/sync/identity',
      headers: { authorization: 'Bearer verified-fixture' },
    });
    assert.equal(valid.statusCode, 200);
    assert.deepEqual(valid.json(), { userId: id });
    const forged = await app.inject({
      url: '/sync/identity',
      headers: {
        authorization: 'Bearer verified-fixture',
        'x-jimo-owner': '57fd6bd8-4530-469c-bb53-d32a3e9cfac2',
      },
    });
    assert.equal(forged.statusCode, 403);
    assert.equal(forged.json().error.code, 'FORBIDDEN');
    const arbitrary = await app.inject({
      url: '/sync/identity',
      headers: { 'x-user-id': id },
    });
    assert.equal(arbitrary.statusCode, 401);
  } finally {
    await app.close();
    await database.close();
  }
});
test('production configuration fails closed and dev bypass is explicit', () => {
  const base = { DATABASE_URL: 'postgresql://test:test@example.invalid/test' };
  assert.throws(() =>
    readEnv({ ...base, NODE_ENV: 'production', ALLOW_DEV_AUTH: 'true' }),
  );
  assert.throws(() => readEnv({ ...base, NODE_ENV: 'production' }));
  assert.throws(() => readEnv({ ...base, NODE_ENV: 'development' }));
  assert.equal(
    readEnv({ ...base, ALLOW_DEV_AUTH: 'true' }).ALLOW_DEV_AUTH,
    'true',
  );
  assert.throws(() =>
    readEnv({
      ...base,
      NODE_ENV: 'production',
      CLERK_SECRET_KEY: 'sk_test_fixture',
      CLERK_ISSUER_URL: 'https://example.invalid',
      CLERK_AUTHORIZED_PARTIES: 'https://app.example.invalid',
    }),
  );
  assert.throws(() =>
    readEnv({
      ...base,
      CLERK_SECRET_KEY: 'test-fixture',
      CLERK_ISSUER_URL: 'https://example.invalid',
      CLERK_AUTHORIZED_PARTIES: '*',
    }),
  );
});
test('official Clerk SDK rejects malformed JWT without network or leaked details', async () => {
  const provider = new ClerkAuthProvider({
    secretKey: 'not-a-real-key',
    issuer: 'https://example.invalid',
    authorizedParties: ['https://app.example.invalid'],
  });
  await assert.rejects(
    () => provider.verify('invalid-format'),
    (e) =>
      e instanceof ApiError &&
      e.status === 401 &&
      e.code === 'INVALID_SESSION' &&
      e.message === 'Invalid session',
  );
});
test('request logging excludes bearer, cookies, query credentials and body passwords', async () => {
  const { Writable } = await import('node:stream');
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      chunks.push(String(chunk));
      done();
    },
  });
  const app = buildApp({ loggerStream: stream });
  try {
    await app.inject({
      method: 'POST',
      url: '/missing?token=private-query-fixture',
      headers: {
        authorization: 'Bearer private-header-fixture',
        cookie: 'session=private-cookie-fixture',
      },
      payload: { password: 'private-password-fixture' },
    });
    const log = chunks.join('');
    for (const value of [
      'private-query-fixture',
      'private-header-fixture',
      'private-cookie-fixture',
      'private-password-fixture',
    ])
      assert.equal(log.includes(value), false);
    assert.ok(log.includes('incoming request'));
  } finally {
    await app.close();
    stream.end();
  }
});
test('official SDK verifies ephemeral signatures, issuer, expiration, nbf and native/web session claims', async () => {
  // Generated for this process only; no real provider/session token or key is stored.
  const { generateKeyPairSync, sign } = await import('node:crypto');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const issuer = 'https://fixture.clerk.accounts.dev',
    now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuer,
    sub: 'user_fixture',
    sid: 'sess_fixture',
    iat: now,
    nbf: now - 10,
    exp: now + 300,
  };
  const token = (extra: Record<string, unknown> = {}) => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'ephemeral-test' }),
    ).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, ...extra })).toString(
      'base64url',
    );
    return `${header}.${body}.${sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url')}`;
  };
  const provider = new ClerkAuthProvider({
    secretKey: 'unused-fixture',
    issuer,
    jwtKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    authorizedParties: ['https://app.example.invalid'],
  });
  assert.deepEqual(await provider.verify(token()), {
    provider: 'clerk',
    subject: 'user_fixture',
  });
  assert.deepEqual(
    await provider.verify(token({ azp: 'https://app.example.invalid' })),
    { provider: 'clerk', subject: 'user_fixture' },
  );
  for (const claims of [
    { iss: 'https://other.clerk.accounts.dev' },
    { azp: 'https://foreign.example.invalid' },
    { nbf: now + 300 },
    { sid: '' },
    { sub: 'not-a-clerk-account' },
    { sts: 'pending' },
    { exp: undefined },
  ])
    await assert.rejects(
      () => provider.verify(token(claims)),
      (e) => e instanceof ApiError && e.code === 'INVALID_SESSION',
    );
  await assert.rejects(
    () => provider.verify(token({ exp: now - 300 })),
    (e) => e instanceof ApiError && e.code === 'SESSION_EXPIRED',
  );
  const jwt = token(),
    parts = jwt.split('.');
  parts[2] = 'A'.repeat(parts[2]!.length);
  await assert.rejects(
    () => provider.verify(parts.join('.')),
    (e) => e instanceof ApiError && e.code === 'INVALID_SESSION',
  );
});

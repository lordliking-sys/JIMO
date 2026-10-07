import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createApiClient, ApiClientError } from '../src/api/client';
import {
  authDestination,
  authErrorKey,
  initialProfilePatch,
  logoutWarning,
  isTestAuth,
} from '../src/auth/helpers';
import {
  defaultPreferences,
  initialDestination,
  decodePreferences,
} from '../src/storage/preferences';
import { configureTokenProvider } from '../src/auth/tokens';
import { sqliteAdapter } from './sqlite-adapter';
import { cachedProgram } from './offline-fixtures';
import { WorkoutLocalRepository } from '../src/db/repositories/workouts';
import { ProgramCacheRepository } from '../src/db/repositories/programs';
import { ProgressCacheRepository } from '../src/db/repositories/progress';
import { SyncOutboxRepository } from '../src/db/repositories/outbox';
import { SyncEngine } from '../src/db/sync/engine';
const profile = {
  id: randomUUID(),
  displayName: 'Returning user',
  locale: 'it' as const,
  unitSystem: 'imperial' as const,
  createdAt: '2026-10-07T08:00:00.000Z',
  initialized: true,
};
test('startup guards, first profile merge, errors and pending logout preserve semantics', () => {
  assert.equal(
    authDestination({
      loaded: false,
      signedIn: false,
      resolved: false,
      onboarding: false,
    }),
    'loading',
  );
  assert.equal(
    authDestination({
      loaded: true,
      signedIn: false,
      resolved: false,
      onboarding: false,
    }),
    'onboarding',
  );
  assert.equal(
    authDestination({
      loaded: true,
      signedIn: false,
      resolved: false,
      onboarding: true,
    }),
    'auth',
  );
  assert.equal(
    authDestination({
      loaded: true,
      signedIn: true,
      resolved: false,
      onboarding: true,
    }),
    'loading',
  );
  assert.equal(
    authDestination({
      loaded: true,
      signedIn: true,
      resolved: true,
      onboarding: false,
    }),
    'app',
  );
  assert.equal(initialProfilePatch(profile, defaultPreferences()), null);
  assert.deepEqual(
    initialProfilePatch(
      { ...profile, initialized: false },
      { ...defaultPreferences(), localePreference: 'en' },
    ),
    { initialize: true, locale: 'en' },
  );
  const returning = { ...defaultPreferences(), accountOnboarded: true };
  assert.equal(initialDestination(returning), '/');
  assert.equal(
    decodePreferences(JSON.stringify(returning)).accountOnboarded,
    true,
  );
  assert.equal(logoutWarning(false, 0), null);
  assert.equal(logoutWarning(false, 3), 'pendingWarning');
  assert.equal(logoutWarning(true, 0), 'activeWarning');
  assert.equal(
    authErrorKey({
      errors: [
        { code: 'form_code_incorrect', longMessage: 'secret-provider-details' },
      ],
      code: 'api_response_error',
    }),
    'errors.code',
  );
  assert.equal(isTestAuth('true', 'ios', 'http://localhost:4173'), false);
  assert.equal(isTestAuth('true', 'web', 'https://app.example.invalid'), false);
  assert.equal(isTestAuth(undefined, 'web', 'http://localhost:4173'), false);
});
test('central token injection refreshes once on 401 and signals reauth without storage writes', async () => {
  const seen: string[] = [];
  let refresh = 0,
    unauthorized = 0;
  const auth = {
    getToken: async (fresh?: boolean) => {
      if (fresh) refresh++;
      return fresh ? 'refreshed-test-fixture' : 'initial-test-fixture';
    },
    unauthorized: () => {
      unauthorized++;
    },
  };
  const client = createApiClient(
    'https://api.example.invalid',
    async (_url, init) => {
      seen.push((init!.headers as Record<string, string>).Authorization!);
      return seen.length === 1
        ? new Response(
            JSON.stringify({
              error: { code: 'SESSION_EXPIRED', message: 'Session expired' },
            }),
            { status: 401 },
          )
        : new Response(JSON.stringify({ ok: true }));
    },
    () => auth,
  );
  assert.deepEqual(await client('/me', z.object({ ok: z.literal(true) })), {
    ok: true,
  });
  assert.deepEqual(seen, [
    'Bearer initial-test-fixture',
    'Bearer refreshed-test-fixture',
  ]);
  assert.equal(refresh, 1);
  assert.equal(unauthorized, 0);
  const rejected = createApiClient(
    'https://api.example.invalid',
    async () =>
      new Response(
        JSON.stringify({
          error: { code: 'INVALID_SESSION', message: 'Invalid session' },
        }),
        { status: 401 },
      ),
    () => auth,
  );
  await assert.rejects(
    () => rejected('/me', z.unknown()),
    (e) => e instanceof ApiClientError && e.status === 401,
  );
  assert.equal(unauthorized, 1);
  configureTokenProvider(null);
});
test('changing account rejects in-flight HTTP response before it can enter another cache', async () => {
  const client = createApiClient('https://api.example.invalid', async () => {
    configureTokenProvider(null);
    return new Response(JSON.stringify({ ok: true }));
  });
  await assert.rejects(
    () => client('/me', z.unknown()),
    (e) => e instanceof ApiClientError && e.code === 'IDENTITY_CHANGED',
  );
});
test('A logout → B → A preserves real SQLite workout, programs, progress and outbox namespaces after reopen', async () => {
  const c = sqliteAdapter(),
    a = randomUUID(),
    b = randomUUID(),
    program = cachedProgram();
  await c.db.migrate();
  const workouts = new WorkoutLocalRepository(c.db, randomUUID),
    programs = new ProgramCacheRepository(c.db),
    outbox = new SyncOutboxRepository(c.db),
    progress = new ProgressCacheRepository(c.db);
  try {
    await programs.replaceActive(a, program);
    const w = await workouts.start(a, program, program.days[0]!.id);
    await workouts.save(a, w.exercises[0]!.sets[0]!.id, {
      actualReps: 7,
      actualLoadKg: '82.50',
      actualDurationSeconds: null,
      actualAssistanceKg: null,
      actualRpe: '9.0',
    });
    await progress.save(
      a,
      'summary',
      { value: 7 },
      z.object({ value: z.number() }),
    );
    assert.equal(await workouts.active(b), null);
    assert.equal(await workouts.detail(b, w.id), null);
    assert.equal(await programs.active(b), null);
    assert.equal((await outbox.list(b)).length, 0);
    assert.equal(
      await progress.read(b, 'summary', z.object({ value: z.number() })),
      null,
    );
    await c.db.migrate(); // startup runs known version without clearing A
    assert.equal((await workouts.active(a))?.id, w.id);
    assert.equal((await programs.active(a))?.id, program.id);
    assert.equal((await outbox.list(a)).length, 2);
    assert.equal(
      (await progress.read(a, 'summary', z.object({ value: z.number() })))
        ?.payload.value,
      7,
    );
  } finally {
    c.sqlite.close();
  }
});
test('sync 401 suspends pending operations; offline checks survive and reauth retries with ACK', async () => {
  const c = sqliteAdapter(),
    owner = randomUUID(),
    p = cachedProgram();
  await c.db.migrate();
  const repo = new WorkoutLocalRepository(c.db, randomUUID),
    outbox = new SyncOutboxRepository(c.db);
  let valid = false,
    sends = 0;
  const codes: (string | null)[] = [];
  const engine = new SyncEngine({
    outbox,
    owner: () => owner,
    network: () => true,
    verifyIdentity: async () => owner,
    reconcile: async () => {},
    changed: () => {},
    error: (c) => codes.push(c),
    send: async (_owner, operations) => {
      sends++;
      if (!valid) throw new ApiClientError('SESSION_EXPIRED', 401);
      return { acknowledged: operations.map((o) => o.operationId), failed: [] };
    },
  });
  try {
    const w = await repo.start(owner, p, p.days[0]!.id);
    await engine.request();
    assert.equal(sends, 1);
    assert.equal(codes.at(-1), 'AUTH_REQUIRED');
    assert.equal((await outbox.list(owner))[0]?.status, 'pending');
    await engine.request();
    assert.equal(sends, 1);
    const actual = {
      actualReps: 7,
      actualLoadKg: '82.50',
      actualDurationSeconds: null,
      actualAssistanceKg: null,
      actualRpe: '9.0',
    };
    await repo.save(owner, w.exercises[0]!.sets[0]!.id, actual);
    await repo.save(owner, w.exercises[0]!.sets[1]!.id, actual);
    await c.db.migrate();
    assert.equal((await repo.detail(owner, w.id))?.completedSets, 2);
    await engine.request();
    assert.equal(sends, 1);
    valid = true;
    await engine.request(true);
    assert.equal((await outbox.list(owner)).length, 0);
    assert.equal((await repo.detail(owner, w.id))?.completedSets, 2);
  } finally {
    engine.stop();
    c.sqlite.close();
  }
});
test('unrenewable offline token does not force sign-out or erase local namespaces', async () => {
  let reauth = 0,
    requests = 0;
  const client = createApiClient(
    'https://api.example.invalid',
    async () => {
      requests++;
      return new Response('{}');
    },
    () => ({
      getToken: async () => null,
      unauthorized: () => {
        reauth++;
      },
    }),
  );
  await assert.rejects(
    () => client('/me', z.unknown()),
    (e) =>
      e instanceof ApiClientError &&
      e.status === 0 &&
      e.code === 'TOKEN_UNAVAILABLE',
  );
  assert.equal(reauth, 0);
  assert.equal(requests, 0);
});
test('profile references are keyed by signed-in subject and API/Clerk deployment, not last used UUID', async () => {
  const { AccountProfileCache } = await import('../src/auth/profile-cache');
  const values = new Map<string, string>();
  const runtime = {
    metadata: async (owner: string, key: string, value?: string) => {
      const k = `${owner}:${key}`;
      if (value !== undefined) values.set(k, value);
      return values.get(k) ?? null;
    },
  };
  const cache = new AccountProfileCache(
      runtime,
      'api-development|clerk-development',
    ),
    foreign = new AccountProfileCache(runtime, 'api-other|clerk-other');
  await cache.save('subject-A', profile);
  assert.equal((await cache.get('subject-A'))?.id, profile.id);
  assert.equal(await cache.get('subject-B'), null);
  assert.equal(await foreign.get('subject-A'), null);
});
test('account change during sync releases A pending work without failing it or poisoning B', async () => {
  const c = sqliteAdapter(),
    a = randomUUID(),
    b = randomUUID(),
    p = cachedProgram();
  await c.db.migrate();
  const repo = new WorkoutLocalRepository(c.db, randomUUID),
    outbox = new SyncOutboxRepository(c.db);
  let owner = a;
  const errors: (string | null)[] = [];
  const engine = new SyncEngine({
    outbox,
    owner: () => owner,
    network: () => true,
    verifyIdentity: async () => owner,
    reconcile: async () => {},
    changed: () => {},
    error: (code) => errors.push(code),
    send: async () => {
      owner = b;
      throw new ApiClientError('IDENTITY_CHANGED', 403);
    },
  });
  try {
    await repo.start(a, p, p.days[0]!.id);
    await engine.request();
    assert.equal((await outbox.list(a))[0]?.status, 'pending');
    assert.equal((await outbox.list(b)).length, 0);
    assert.equal(await repo.active(b), null);
    assert.ok(await repo.active(a));
    assert.equal(errors.length, 0);
    await engine.request(true);
    assert.equal((await outbox.list(a)).length, 1);
  } finally {
    engine.stop();
    c.sqlite.close();
  }
});

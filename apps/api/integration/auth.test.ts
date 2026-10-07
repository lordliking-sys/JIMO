import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { eq, inArray } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  safeDatabaseError,
  users,
  programs,
  exercises,
  workoutSessions,
} from '@jimo/database';
import {
  profileSchema,
  programDetailSchema,
  exerciseDtoSchema,
  workoutDetailSchema,
  type WorkoutOperation,
} from '@jimo/schemas';
import { buildApp } from '../src/app';
import {
  authenticatedCurrentUser,
  CurrentUserResolver,
} from '../src/auth/resolver';
import { ApiError } from '../src/errors';
test(
  'verified auth → internal identity → profile/ownership/sync on Neon development',
  { skip: !process.env.DATABASE_URL },
  async (t) => {
    const client = createDatabase(process.env.DATABASE_URL!),
      suffix = randomUUID(),
      subjects = [`user_fixtureA${suffix}`, `user_fixtureB${suffix}`];
    let verified = false;
    const ids: string[] = [];
    const currentUser = authenticatedCurrentUser(
      {
        verify: async (token) => {
          const index = ['fixture-A', 'fixture-B'].indexOf(token);
          if (index < 0)
            throw new ApiError(401, 'INVALID_SESSION', 'Invalid session');
          return { provider: 'clerk', subject: subjects[index]! };
        },
      },
      new CurrentUserResolver(client),
    );
    const app = buildApp({
      database: client,
      currentUser,
      checkDatabase: () => client.ping(),
      logger: false,
      corsOrigins: ['http://localhost:4173'],
    });
    const request = async (
      token: string,
      method: 'GET' | 'POST' | 'PATCH',
      url: string,
      body?: unknown,
      status = 200,
    ) => {
      const r = await app.inject({
        method,
        url,
        headers: {
          authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
      });
      assert.equal(r.statusCode, status, `${method} ${url}: ${r.statusCode}`);
      return r.json();
    };
    try {
      await assertDevelopment(client);
      verified = true;
      await t.test(
        '20 parallel first requests provision exactly one UUID and returning login reuses it',
        async () => {
          const replies = await Promise.all(
            Array.from({ length: 20 }, () =>
              request('fixture-A', 'GET', '/me'),
            ),
          );
          const a = profileSchema.parse(replies[0]);
          ids.push(a.id);
          assert.equal(new Set(replies.map((r) => r.id)).size, 1);
          const rows = await client.db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.authSubject, subjects[0]!));
          assert.equal(rows.length, 1);
          assert.equal(rows[0]!.id, a.id);
          assert.equal(a.initialized, false);
          assert.equal(a.locale, 'system');
          const b = profileSchema.parse(
            await request('fixture-B', 'GET', '/me'),
          );
          ids.push(b.id);
          assert.notEqual(a.id, b.id);
          assert.equal(
            profileSchema.parse(await request('fixture-A', 'GET', '/me')).id,
            a.id,
          );
        },
      );
      await t.test(
        'profile PATCH strict validation, first initialization and returning profile preservation',
        async () => {
          const a = profileSchema.parse(
            await request('fixture-A', 'PATCH', '/me', {
              initialize: true,
              displayName: `JIMO_AUTH_TEST_${suffix}`,
              locale: 'it',
              unitSystem: 'imperial',
            }),
          );
          assert.equal(a.initialized, true);
          assert.equal(a.locale, 'it');
          assert.equal(a.unitSystem, 'imperial');
          const unchanged = profileSchema.parse(
            await request('fixture-A', 'PATCH', '/me', {
              initialize: true,
              locale: 'en',
            }),
          );
          assert.equal(unchanged.locale, 'it');
          assert.equal(unchanged.displayName, a.displayName);
          for (const input of [
            { locale: 'fr' },
            { displayName: '' },
            { userId: ids[1] },
            { authSubject: subjects[1] },
          ])
            await request('fixture-A', 'PATCH', '/me', input, 400);
          await request(
            'fixture-A',
            'GET',
            `/me?userId=${ids[1]}`,
            undefined,
            400,
          );
          assert.equal(
            profileSchema.parse(await request('fixture-B', 'GET', '/me'))
              .displayName,
            null,
          );
        },
      );
      const custom = exerciseDtoSchema.parse(
        await request(
          'fixture-B',
          'POST',
          '/exercises',
          {
            name: 'Private authenticated exercise',
            trackingMode: 'reps',
            defaultLoadMode: 'external',
          },
          201,
        ),
      );
      let program = programDetailSchema.parse(
        await request(
          'fixture-B',
          'POST',
          '/programs',
          { name: 'Private authenticated program' },
          201,
        ),
      );
      program = programDetailSchema.parse(
        await request(
          'fixture-B',
          'POST',
          `/programs/${program.id}/days`,
          { name: 'PRIVATE', dayOfWeek: 1 },
          201,
        ),
      );
      const day = program.days[0]!;
      program = programDetailSchema.parse(
        await request(
          'fixture-B',
          'POST',
          `/program-days/${day.id}/exercises`,
          {
            exerciseId: custom.id,
            loadMode: 'external',
            targetSets: 2,
            targetReps: 8,
            targetLoadKg: '80.00',
            restSeconds: 60,
          },
          201,
        ),
      );
      await request('fixture-B', 'POST', `/programs/${program.id}/activate`);
      const workout = workoutDetailSchema.parse(
          await request(
            'fixture-B',
            'POST',
            '/workouts/start',
            { programDayId: day.id },
            201,
          ),
        ),
        set = workout.exercises[0]!.sets[0]!;
      await t.test(
        'A token cannot access B program/custom exercise/workout/PR/detail even knowing UUIDs',
        async () => {
          for (const url of [
            `/programs/${program.id}`,
            `/exercises/${custom.id}`,
            `/workouts/${workout.id}`,
            `/progress/exercises/${custom.id}?timeZone=UTC`,
            `/progress/workouts/${workout.id}/records`,
          ])
            await request('fixture-A', 'GET', url, undefined, 404);
          await request(
            'fixture-A',
            'PATCH',
            `/programs/${program.id}`,
            { name: 'Takeover' },
            404,
          );
          await request(
            'fixture-A',
            'POST',
            `/workout-sets/${set.id}/complete`,
            {
              actualReps: 99,
              actualLoadKg: '999.00',
              actualDurationSeconds: null,
              actualAssistanceKg: null,
              actualRpe: null,
            },
            404,
          );
          const summary = await request(
            'fixture-A',
            'GET',
            '/progress/summary?timeZone=UTC',
          );
          assert.equal(summary.completedWorkouts, 0);
          const b = workoutDetailSchema.parse(
            await request('fixture-B', 'GET', `/workouts/${workout.id}`),
          );
          assert.equal(b.exercises[0]!.sets[0]!.status, 'pending');
        },
      );
      await t.test(
        'sync denies B session/set/program operations from A and preserves B',
        async () => {
          const payload = {
            actualReps: 7,
            actualLoadKg: '82.50',
            actualDurationSeconds: null,
            actualAssistanceKg: null,
            actualRpe: null,
          };
          const operation: WorkoutOperation = {
            operationId: randomUUID(),
            operationType: 'COMPLETE_SET',
            sessionId: workout.id,
            sequence: 1,
            entityId: set.id,
            createdAt: new Date().toISOString(),
            payload,
          };
          const r = await request(
            'fixture-A',
            'POST',
            '/sync/workout-operations',
            { expectedUserId: ids[0], operations: [operation] },
          );
          assert.equal(r.acknowledged.length, 0);
          assert.ok(r.failed.length);
          const wrongOwner = await request(
            'fixture-A',
            'POST',
            '/sync/workout-operations',
            { expectedUserId: ids[1], operations: [operation] },
            403,
          );
          assert.equal(wrongOwner.error.code, 'IDENTITY_CHANGED');
          await request(
            'fixture-A',
            'POST',
            '/workouts/start',
            { programDayId: day.id },
            404,
          );
          assert.equal(
            workoutDetailSchema.parse(
              await request('fixture-B', 'GET', `/workouts/${workout.id}`),
            ).completedSets,
            0,
          );
        },
      );
      await t.test(
        'health/ready public; me/private routes require bearer and CORS allows only configured origin',
        async () => {
          for (const url of ['/health', '/ready'])
            assert.equal((await app.inject(url)).statusCode, 200);
          assert.equal((await app.inject('/me')).statusCode, 401);
          const good = await app.inject({
            method: 'OPTIONS',
            url: '/me',
            headers: {
              origin: 'http://localhost:4173',
              'access-control-request-method': 'GET',
              'access-control-request-headers': 'authorization',
            },
          });
          assert.equal(
            good.headers['access-control-allow-origin'],
            'http://localhost:4173',
          );
          const bad = await app.inject({
            url: '/health',
            headers: { origin: 'https://unexpected.example.invalid' },
          });
          assert.equal(bad.headers['access-control-allow-origin'], undefined);
        },
      );
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error;
      throw new Error(
        `Auth integration: ${JSON.stringify(safeDatabaseError(error))}`,
      );
    } finally {
      try {
        if (verified) {
          const rows = await client.db
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.authSubject, subjects));
          const cleanup = rows.map((r) => r.id);
          if (cleanup.length) {
            await client.db
              .delete(workoutSessions)
              .where(inArray(workoutSessions.userId, cleanup));
            await client.db
              .delete(programs)
              .where(inArray(programs.userId, cleanup));
            await client.db
              .delete(exercises)
              .where(inArray(exercises.createdByUserId, cleanup));
            await client.db.delete(users).where(inArray(users.id, cleanup));
          }
        }
      } catch (e) {
        throw new Error(
          `Auth cleanup: ${JSON.stringify(safeDatabaseError(e))}`,
        );
      } finally {
        await app.close();
        await client.close();
      }
    }
  },
);

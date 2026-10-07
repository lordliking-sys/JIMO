import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  safeDatabaseError,
  users,
  programs,
  exercises,
  workoutSessions,
  syncOperations,
} from '@jimo/database';
import {
  programDetailSchema,
  exerciseDtoSchema,
  syncResponseSchema,
  workoutDetailSchema,
  type WorkoutOperation,
  type ProgramDetail,
} from '@jimo/schemas';
import { buildApp } from '../src/app';
import {
  WorkoutLocalRepository,
  makeLocalWorkout,
  snapshotOf,
} from '../../mobile/src/db/repositories/workouts';
import { SyncOutboxRepository } from '../../mobile/src/db/repositories/outbox';
import { sqliteAdapter } from '../../mobile/test/sqlite-adapter';
const actual = {
  actualReps: 7,
  actualDurationSeconds: null,
  actualLoadKg: '82.50',
  actualAssistanceKg: null,
  actualRpe: '9.0',
};
test(
  'offline SQLite → sync API → Neon development, real idempotency and cleanup',
  { skip: !process.env.DATABASE_URL },
  async (t) => {
    const client = createDatabase(process.env.DATABASE_URL!),
      a = randomUUID(),
      b = randomUUID();
    const local = sqliteAdapter();
    await local.db.migrate();
    let now = Date.now() - 3600_000;
    const repo = new WorkoutLocalRepository(local.db, randomUUID, () =>
        new Date((now += 1000)).toISOString(),
      ),
      outbox = new SyncOutboxRepository(local.db);
    const apps = [a, b].map((id) =>
        buildApp({
          database: client,
          currentUser: async () => ({ id }),
          logger: false,
          checkDatabase: () => client.ping(),
        }),
      ),
      app = apps[0]!,
      foreign = apps[1]!;
    let verified = false,
      program: ProgramDetail,
      foreignProgram: ProgramDetail;
    const request = async (
      method: 'GET' | 'POST' | 'PATCH',
      url: string,
      body?: unknown,
      target = app,
      status = 200,
    ) => {
      const r = await target.inject({
        method,
        url,
        ...(body === undefined
          ? {}
          : {
              payload: JSON.stringify(body),
              headers: { 'content-type': 'application/json' },
            }),
      });
      assert.equal(
        r.statusCode,
        status,
        `${method} ${url}: expected ${status}, received ${r.statusCode}`,
      );
      return r.json();
    };
    const send = async (ops: WorkoutOperation[], owner = a, target = app) =>
      syncResponseSchema.parse(
        await request(
          'POST',
          '/sync/workout-operations',
          { expectedUserId: owner, operations: ops },
          target,
        ),
      );
    const makeProgram = async (target = app) => {
      const e = exerciseDtoSchema.parse(
        await request(
          'POST',
          '/exercises',
          {
            name: 'isolated sync bench',
            trackingMode: 'reps',
            defaultLoadMode: 'external',
          },
          target,
          201,
        ),
      );
      let p = programDetailSchema.parse(
        await request(
          'POST',
          '/programs',
          { name: 'isolated offline FORZA' },
          target,
          201,
        ),
      );
      p = programDetailSchema.parse(
        await request(
          'POST',
          `/programs/${p.id}/days`,
          { name: 'PUSH', dayOfWeek: 1 },
          target,
          201,
        ),
      );
      p = programDetailSchema.parse(
        await request(
          'POST',
          `/program-days/${p.days[0]!.id}/exercises`,
          {
            exerciseId: e.id,
            loadMode: 'external',
            targetSets: 3,
            targetReps: 8,
            targetLoadKg: '80',
            targetRpe: '8',
            restSeconds: 180,
          },
          target,
          201,
        ),
      );
      return programDetailSchema.parse(
        await request('POST', `/programs/${p.id}/activate`, undefined, target),
      );
    };
    const stage = async (name: string, fn: () => Promise<void>) =>
      t.test(name, async () => {
        try {
          await fn();
        } catch (e) {
          if (e instanceof assert.AssertionError) throw e;
          throw new Error(`${name}: ${JSON.stringify(safeDatabaseError(e))}`);
        }
      });
    try {
      await assertDevelopment(client);
      verified = true;
      await client.db.insert(users).values([
        { id: a, displayName: 'isolated sync A' },
        { id: b, displayName: 'isolated sync B' },
      ]);
      program = await makeProgram();
      foreignProgram = await makeProgram(foreign);
      await stage(
        'health/ready, identity, strict body, future time and account mismatch',
        async () => {
          assert.equal((await request('GET', '/health')).status, 'ok');
          assert.equal((await request('GET', '/ready')).status, 'ready');
          assert.equal((await request('GET', '/sync/identity')).userId, a);
          await request(
            'POST',
            '/sync/workout-operations',
            { expectedUserId: b, operations: [] },
            app,
            400,
          );
          const w = await repo.start(a, program, program.days[0]!.id),
            batch = await outbox.batch(a);
          await request(
            'POST',
            '/sync/workout-operations',
            { expectedUserId: b, operations: batch },
            app,
            403,
          );
          await request(
            'POST',
            '/sync/workout-operations',
            { expectedUserId: a, userId: b, operations: batch },
            app,
            400,
          );
          const future = structuredClone(batch[0]!);
          future.createdAt = new Date(Date.now() + 3600_000).toISOString();
          assert.equal(
            (await send([future])).failed[0]?.code,
            'INVALID_EVENT_TIME',
          );
          assert.equal(
            (
              await client.db
                .select()
                .from(workoutSessions)
                .where(eq(workoutSessions.id, w.id))
            ).length,
            0,
          );
          await outbox.release(a, batch, 'TEST_INTERRUPTED');
        },
      );
      await stage(
        'offline START keeps client IDs and old snapshot despite a changed source program',
        async () => {
          const localActive = (await repo.active(a))!,
            batch = await outbox.batch(a);
          await request(
            'PATCH',
            `/program-exercises/${program.days[0]!.exercises[0]!.id}`,
            { targetReps: 10, targetLoadKg: '85', restSeconds: 120 },
          );
          const results = await Promise.all([send(batch), send(batch)]);
          assert.deepEqual(results[0]!.acknowledged, [batch[0]!.operationId]);
          assert.deepEqual(results[1]!.acknowledged, results[0]!.acknowledged);
          await outbox.acknowledge(a, batch, results[0]!);
          const server = workoutDetailSchema.parse(
            await request('GET', `/workouts/${localActive.id}`),
          );
          assert.deepEqual(
            server.exercises.map((e) => [e.id, e.sets.map((s) => s.id)]),
            localActive.exercises.map((e) => [e.id, e.sets.map((s) => s.id)]),
          );
          assert.equal(server.startedAt, localActive.startedAt);
          assert.equal(server.exercises[0]!.sets[0]!.targetReps, 8);
          assert.equal(server.exercises[0]!.sets[0]!.targetLoadKg, '80.00');
        },
      );
      await stage(
        'offline CHECK + correction FIFO, original timestamp, target vs actual exact',
        async () => {
          const w = (await repo.active(a))!,
            id = w.exercises[0]!.sets[0]!.id;
          const completed = await repo.save(a, id, {
            ...actual,
            actualReps: 8,
          });
          await repo.save(a, id, actual, true);
          const batch = await outbox.batch(a),
            result = await send(batch);
          assert.equal(result.failed.length, 0, JSON.stringify(result.failed));
          await outbox.acknowledge(a, batch, result);
          const server = workoutDetailSchema.parse(
              await request('GET', `/workouts/${w.id}`),
            ),
            s = server.exercises[0]!.sets[0]!;
          assert.deepEqual(
            [
              s.targetReps,
              s.targetLoadKg,
              s.targetRpe,
              s.actualReps,
              s.actualLoadKg,
              s.actualRpe,
            ],
            [8, '80.00', '8.0', 7, '82.50', '9.0'],
          );
          assert.equal(
            s.completedAt,
            completed.exercises[0]!.sets[0]!.completedAt,
          );
          const replay = await send(batch);
          assert.deepEqual(replay.acknowledged, result.acknowledged);
          const altered = structuredClone(batch[1]!);
          if (altered.operationType === 'UPDATE_SET')
            altered.payload.actualReps = 6;
          assert.equal((await send([altered])).failed[0]?.status, 'conflict');
        },
      );
      await stage(
        'skip and offline finish preserve client completion time and history',
        async () => {
          const w = (await repo.active(a))!;
          await repo.skip(a, w.exercises[0]!.sets[1]!.id);
          await repo.save(a, w.exercises[0]!.sets[2]!.id, actual);
          const completed = await repo.finish(a, w.id),
            batch = await outbox.batch(a),
            result = await send(batch);
          assert.equal(result.failed.length, 0, JSON.stringify(result.failed));
          await outbox.acknowledge(a, batch, result);
          const server = workoutDetailSchema.parse(
            await request('GET', `/workouts/${w.id}`),
          );
          assert.equal(server.status, 'completed');
          assert.equal(server.completedAt, completed.completedAt);
          assert.equal(server.skippedSets, 1);
          assert.equal(server.exercises[0]!.sets[1]!.actualLoadKg, null);
        },
      );
      await stage(
        '10 operations: server processes first 5, response lost, whole batch replay applies exactly once',
        async () => {
          const w = await repo.start(a, program, program.days[0]!.id);
          for (const s of w.exercises[0]!.sets)
            await repo.save(a, s.id, actual);
          for (let i = 0; i < 5; i++)
            await repo.save(
              a,
              w.exercises[0]!.sets[0]!.id,
              { ...actual, actualReps: i + 3 },
              true,
            );
          const completed = await repo.finish(a, w.id),
            batch = await outbox.batch(a);
          assert.equal(batch.length, 10);
          const first = await send(batch.slice(0, 5));
          assert.equal(first.acknowledged.length, 5); // deliberately no local ACK
          const replay = await send(batch);
          assert.equal(replay.acknowledged.length, 10);
          assert.equal(replay.failed.length, 0);
          await outbox.acknowledge(a, batch, replay);
          const server = workoutDetailSchema.parse(
            await request('GET', `/workouts/${w.id}`),
          );
          assert.equal(server.status, 'completed');
          assert.equal(server.completedAt, completed.completedAt);
          assert.equal(server.exercises[0]!.sets[0]!.actualReps, 7);
          assert.equal(
            (
              await client.db
                .select()
                .from(syncOperations)
                .where(eq(syncOperations.sessionId, w.id))
            ).length,
            10,
          );
          assert.equal((await outbox.list(a)).length, 0);
        },
      );
      await stage(
        'foreign ownership, program references and client UUID collision are rejected without cross-user changes',
        async () => {
          const w = await repo.start(
              b,
              foreignProgram,
              foreignProgram.days[0]!.id,
            ),
            batch = await outbox.batch(b),
            result = await send(batch, b, foreign);
          assert.equal(result.failed.length, 0, JSON.stringify(result.failed));
          await outbox.acknowledge(b, batch, result);
          // Owned/valid source with a UUID already used by B exercises the real
          // collision path rather than only failing the foreign-program check.
          const candidate = makeLocalWorkout(
            program,
            program.days[0]!.id,
            randomUUID,
            new Date((now += 1000)).toISOString(),
          );
          const collision: WorkoutOperation = {
            operationId: randomUUID(),
            sessionId: w.id,
            entityId: w.id,
            sequence: 1,
            createdAt: candidate.startedAt,
            operationType: 'START_WORKOUT',
            payload: snapshotOf(candidate),
          };
          assert.equal((await send([collision])).failed[0]?.status, 'conflict');
          assert.equal(
            workoutDetailSchema.parse(
              await request('GET', `/workouts/${w.id}`, undefined, foreign),
            ).status,
            'in_progress',
          );
          const stolen = structuredClone(batch[0]!);
          stolen.operationId = randomUUID();
          assert.equal((await send([stolen])).acknowledged.length, 0);
          const spoof: WorkoutOperation = {
            operationId: randomUUID(),
            sessionId: w.id,
            entityId: w.exercises[0]!.sets[0]!.id,
            sequence: 2,
            createdAt: new Date((now += 1000)).toISOString(),
            operationType: 'COMPLETE_SET',
            payload: actual,
          };
          assert.equal((await send([spoof])).failed[0]?.status, 'failed');
          assert.equal(
            workoutDetailSchema.parse(
              await request('GET', `/workouts/${w.id}`, undefined, foreign),
            ).completedSets,
            0,
          );
          const cloned = structuredClone(batch[0]!);
          cloned.operationId = randomUUID();
          cloned.sessionId = randomUUID();
          cloned.entityId = cloned.sessionId;
          assert.equal((await send([cloned])).acknowledged.length, 0);
          await repo.finish(b, w.id, true, true);
          const closing = await outbox.batch(b);
          const cancelled = await send(closing, b, foreign);
          assert.equal(cancelled.failed.length, 0);
          await outbox.acknowledge(b, closing, cancelled);
        },
      );
      await stage(
        'another server active workout causes safe conflict; SQLite workout/actual and server session both survive',
        async () => {
          const online = workoutDetailSchema.parse(
            await request(
              'POST',
              '/workouts/start',
              { programDayId: program.days[0]!.id },
              app,
              201,
            ),
          );
          const w = await repo.start(a, program, program.days[0]!.id);
          await repo.save(a, w.exercises[0]!.sets[0]!.id, actual);
          const batch = await outbox.batch(a),
            result = await send(batch);
          assert.equal(result.failed[0]?.status, 'conflict');
          assert.equal(result.acknowledged.length, 0);
          await outbox.acknowledge(a, batch, result);
          assert.equal((await repo.active(a))?.id, w.id);
          assert.equal((await repo.detail(a, w.id))?.completedSets, 1);
          assert.equal((await outbox.list(a))[0]?.status, 'conflict');
          assert.equal(
            workoutDetailSchema.parse(
              await request('GET', `/workouts/${online.id}`),
            ).status,
            'in_progress',
          );
          assert.equal(
            (
              await client.db
                .select()
                .from(workoutSessions)
                .where(eq(workoutSessions.id, w.id))
            ).length,
            0,
          );
        },
      );
    } catch (e) {
      if (e instanceof assert.AssertionError) throw e;
      throw new Error(
        `Neon sync test: ${JSON.stringify(safeDatabaseError(e))}`,
      );
    } finally {
      await Promise.all(apps.map((app) => app.close()));
      local.sqlite.close();
      try {
        if (verified)
          for (const id of [a, b]) {
            await client.db
              .delete(workoutSessions)
              .where(eq(workoutSessions.userId, id));
            await client.db.delete(programs).where(eq(programs.userId, id));
            await client.db
              .delete(exercises)
              .where(eq(exercises.createdByUserId, id));
            await client.db.delete(users).where(eq(users.id, id));
            assert.equal(
              (
                await client.db
                  .select()
                  .from(syncOperations)
                  .where(eq(syncOperations.userId, id))
              ).length,
              0,
            );
          }
      } catch (e) {
        throw new Error(
          `Sync cleanup: ${JSON.stringify(safeDatabaseError(e))}`,
        );
      } finally {
        await client.close();
      }
    }
  },
);

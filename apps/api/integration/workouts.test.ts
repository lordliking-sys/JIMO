import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  safeDatabaseError,
  users,
  programs,
  exercises,
  workoutSessions,
  workoutSets,
} from '@jimo/database';
import {
  programDetailSchema,
  exerciseDtoSchema,
  workoutDetailSchema,
  activeWorkoutSchema,
  workoutHistorySchema,
  type WorkoutDetail,
  type ActualInput,
} from '@jimo/schemas';
import { buildApp } from '../src/app';
test(
  'workout engine on Neon development: snapshot, actual, ownership and concurrency',
  { skip: !process.env.DATABASE_URL },
  async (t) => {
    const client = createDatabase(process.env.DATABASE_URL!),
      a = randomUUID(),
      b = randomUUID();
    let verified = false;
    const apps = [a, b].map((id) =>
      buildApp({
        database: client,
        currentUser: async () => ({ id }),
        checkDatabase: () => client.ping(),
        logger: false,
      }),
    );
    const app = apps[0]!,
      foreign = apps[1]!;
    const request = async (
      method: 'GET' | 'POST' | 'PATCH',
      url: string,
      body?: unknown,
      status = 200,
      target = app,
    ) => {
      const r = await target.inject({
        method,
        url,
        headers: {
          'x-jimo-locale': 'it',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
      });
      assert.equal(
        r.statusCode,
        status,
        `${method} ${url}: expected ${status}, received ${r.statusCode}`,
      );
      return r.json();
    };
    const workout = async (
      method: 'GET' | 'POST' | 'PATCH',
      url: string,
      body?: unknown,
      status = 200,
    ) => workoutDetailSchema.parse(await request(method, url, body, status));
    const stage = async (name: string, fn: () => Promise<void>) =>
      t.test(name, async () => {
        try {
          await fn();
        } catch (e) {
          if (e instanceof assert.AssertionError) throw e;
          throw new Error(`${name}: ${JSON.stringify(safeDatabaseError(e))}`);
        }
      });
    let dayId = '',
      programId = '',
      peId = '',
      exerciseId = '',
      session: WorkoutDetail;
    try {
      await assertDevelopment(client);
      verified = true;
      await client.db.insert(users).values([
        { id: a, displayName: 'isolated workout A' },
        { id: b, displayName: 'isolated workout B' },
      ]);
      await stage(
        'health, readiness and strict CurrentUser identity',
        async () => {
          assert.equal((await request('GET', '/health')).status, 'ok');
          assert.equal((await request('GET', '/ready')).status, 'ready');
          await request(
            'POST',
            '/workouts/start',
            { programDayId: randomUUID(), userId: b },
            400,
          );
          assert.equal(
            activeWorkoutSchema.parse(await request('GET', '/workouts/active'))
              .workout,
            null,
          );
        },
      );
      await stage(
        'draft and empty day cannot start; foreign day does not leak',
        async () => {
          let p = programDetailSchema.parse(
            await request('POST', '/programs', { name: 'isolated FORZA' }, 201),
          );
          programId = p.id;
          p = programDetailSchema.parse(
            await request(
              'POST',
              `/programs/${p.id}/days`,
              { name: 'PUSH', dayOfWeek: 1 },
              201,
            ),
          );
          dayId = p.days[0]!.id;
          const ex = exerciseDtoSchema.parse(
            await request(
              'POST',
              '/exercises',
              {
                name: 'isolated pull-up',
                trackingMode: 'reps',
                defaultLoadMode: 'weighted',
              },
              201,
            ),
          );
          exerciseId = ex.id;
          p = programDetailSchema.parse(
            await request(
              'POST',
              `/program-days/${dayId}/exercises`,
              {
                exerciseId,
                loadMode: 'weighted',
                targetSets: 3,
                targetReps: 8,
                targetLoadKg: '20',
                targetRpe: '8',
                restSeconds: 180,
              },
              201,
            ),
          );
          peId = p.days[0]!.exercises[0]!.id;
          await request(
            'POST',
            '/workouts/start',
            { programDayId: dayId },
            409,
          );
          await request(
            'POST',
            '/workouts/start',
            { programDayId: dayId },
            404,
            foreign,
          );
          p = programDetailSchema.parse(
            await request('POST', `/programs/${programId}/activate`),
          );
          p = programDetailSchema.parse(
            await request(
              'POST',
              `/programs/${programId}/days`,
              { name: 'EMPTY' },
              201,
            ),
          );
          assert.equal(
            (
              await request(
                'POST',
                '/workouts/start',
                { programDayId: p.days[1]!.id },
                409,
              )
            ).error.code,
            'EMPTY_WORKOUT',
          );
        },
      );
      await stage(
        'two simultaneous starts create only one full snapshot and return safe conflict',
        async () => {
          const responses = await Promise.all([
            app.inject({
              method: 'POST',
              url: '/workouts/start',
              payload: { programDayId: dayId },
            }),
            app.inject({
              method: 'POST',
              url: '/workouts/start',
              payload: { programDayId: dayId },
            }),
          ]);
          assert.deepEqual(
            responses.map((r) => r.statusCode).sort(),
            [201, 409],
          );
          session = workoutDetailSchema.parse(
            responses.find((r) => r.statusCode === 201)!.json(),
          );
          const conflict = responses.find((r) => r.statusCode === 409)!.json();
          assert.equal(conflict.error.code, 'ACTIVE_WORKOUT_EXISTS');
          assert.equal(conflict.error.sessionId, session.id);
          assert.equal(session.exercises.length, 1);
          assert.equal(session.exercises[0]!.sets.length, 3);
          for (const set of session.exercises[0]!.sets) {
            assert.equal(set.status, 'pending');
            assert.equal(set.actualReps, null);
            assert.equal(set.actualLoadKg, null);
            assert.equal(set.actualRpe, null);
            assert.equal(set.completedAt, null);
          }
          assert.equal(
            activeWorkoutSchema.parse(await request('GET', '/workouts/active'))
              .workout?.id,
            session.id,
          );
          assert.equal(
            activeWorkoutSchema.parse(
              await request('GET', '/workouts/active', undefined, 200, foreign),
            ).workout,
            null,
          );
          assert.equal(
            (
              await client.db
                .select()
                .from(workoutSessions)
                .where(eq(workoutSessions.userId, a))
            ).length,
            1,
          );
        },
      );
      await stage(
        'snapshot stays immutable after target and custom name changes',
        async () => {
          await request('PATCH', `/program-exercises/${peId}`, {
            targetReps: 10,
            targetLoadKg: '25',
            targetRpe: '9',
            restSeconds: 120,
          });
          await client.db
            .update(exercises)
            .set({ canonicalName: 'renamed source' })
            .where(eq(exercises.id, exerciseId));
          session = await workout('GET', `/workouts/${session.id}`);
          const ex = session.exercises[0]!;
          assert.equal(ex.exerciseNameSnapshot, 'isolated pull-up');
          assert.equal(ex.restSecondsSnapshot, 180);
          for (const s of ex.sets) {
            assert.equal(s.targetReps, 8);
            assert.equal(s.targetLoadKg, '20.00');
            assert.equal(s.targetRpe, '8.0');
          }
        },
      );
      await stage(
        'foreign users cannot read, complete, correct, skip, finish or cancel',
        async () => {
          const id = session.exercises[0]!.sets[0]!.id,
            actual = {
              actualReps: 7,
              actualDurationSeconds: null,
              actualLoadKg: '22.5',
              actualAssistanceKg: null,
              actualRpe: '9',
            };
          await request(
            'GET',
            `/workouts/${session.id}`,
            undefined,
            404,
            foreign,
          );
          for (const [method, url, body] of [
            ['POST', `/workout-sets/${id}/complete`, actual],
            ['PATCH', `/workout-sets/${id}`, actual],
            ['POST', `/workout-sets/${id}/skip`, {}],
            ['POST', `/workouts/${session.id}/complete`, {}],
            ['POST', `/workouts/${session.id}/cancel`, {}],
          ] as const)
            await request(method, url, body, 404, foreign);
          assert.equal(
            workoutHistorySchema.parse(
              await request('GET', '/workouts', undefined, 200, foreign),
            ).workouts.length,
            0,
          );
        },
      );
      await stage(
        'complete is idempotent, actual canonical and target untouched; correction preserves completedAt',
        async () => {
          const id = session.exercises[0]!.sets[0]!.id,
            actual = {
              actualReps: 7,
              actualDurationSeconds: null,
              actualLoadKg: '22.5',
              actualAssistanceKg: null,
              actualRpe: '9',
            };
          await request(
            'POST',
            `/workout-sets/${id}/complete`,
            { ...actual, actualAssistanceKg: '5' },
            400,
          );
          await request(
            'POST',
            `/workout-sets/${id}/complete`,
            { ...actual, actualRpe: '8.2' },
            400,
          );
          const both = await Promise.all([
            workout('POST', `/workout-sets/${id}/complete`, actual),
            workout('POST', `/workout-sets/${id}/complete`, actual),
          ]);
          const s = both[0]!.exercises[0]!.sets[0]!;
          assert.equal(
            s.completedAt,
            both[1]!.exercises[0]!.sets[0]!.completedAt,
          );
          assert.equal(s.actualLoadKg, '22.50');
          assert.equal(s.actualRpe, '9.0');
          assert.equal(s.targetLoadKg, '20.00');
          assert.equal(s.targetReps, 8);
          session = await workout('PATCH', `/workout-sets/${id}`, {
            ...actual,
            actualReps: 6,
          });
          assert.equal(session.exercises[0]!.sets[0]!.actualReps, 6);
          assert.equal(
            session.exercises[0]!.sets[0]!.completedAt,
            s.completedAt,
          );
          const [stored] = await client.db
            .select()
            .from(workoutSets)
            .where(eq(workoutSets.id, id));
          assert.equal(stored?.targetRpe, '8.0');
          assert.equal(stored?.actualRpe, '9.0');
        },
      );
      await stage(
        'skip preserves null actual; finish requires confirmation and is atomic/idempotent',
        async () => {
          await request('POST', `/workouts/${session.id}/complete`, {}, 409);
          session = await workout(
            'POST',
            `/workout-sets/${session.exercises[0]!.sets[1]!.id}/skip`,
          );
          assert.equal(session.exercises[0]!.sets[1]!.actualReps, null);
          assert.equal(session.exercises[0]!.sets[1]!.status, 'skipped');
          const both = await Promise.all([
            workout('POST', `/workouts/${session.id}/complete`, {
              skipPending: true,
            }),
            workout('POST', `/workouts/${session.id}/complete`, {
              skipPending: true,
            }),
          ]);
          session = both[0]!;
          assert.equal(session.completedAt, both[1]!.completedAt);
          assert.equal(session.status, 'completed');
          assert.equal(session.completedSets, 1);
          assert.equal(session.skippedSets, 2);
          assert.equal(session.pendingSets, 0);
          assert.equal(
            activeWorkoutSchema.parse(await request('GET', '/workouts/active'))
              .workout,
            null,
          );
          assert.equal(
            workoutHistorySchema.parse(await request('GET', '/workouts'))
              .workouts[0]?.id,
            session.id,
          );
          await request('POST', `/workouts/${session.id}/cancel`, {}, 409);
        },
      );
      await stage(
        'external target 8/80/8 vs actual 7/82.50/9.0 is stored separately in DB',
        async () => {
          await request('PATCH', `/program-exercises/${peId}`, {
            loadMode: 'external',
            targetSets: 1,
            targetReps: 8,
            targetLoadKg: '80',
            targetRpe: '8',
          });
          const w = await workout(
              'POST',
              '/workouts/start',
              { programDayId: dayId },
              201,
            ),
            id = w.exercises[0]!.sets[0]!.id;
          await workout('POST', `/workout-sets/${id}/complete`, {
            actualReps: 7,
            actualDurationSeconds: null,
            actualLoadKg: '82.5',
            actualAssistanceKg: null,
            actualRpe: '9',
          });
          const [s] = await client.db
            .select()
            .from(workoutSets)
            .where(eq(workoutSets.id, id));
          assert.deepEqual(
            [
              s?.targetReps,
              s?.targetLoadKg,
              s?.targetRpe,
              s?.actualReps,
              s?.actualLoadKg,
              s?.actualRpe,
            ],
            [8, '80.00', '8.0', 7, '82.50', '9.0'],
          );
          await workout('POST', `/workouts/${w.id}/complete`, {});
        },
      );
      await stage(
        'bodyweight, assisted and duration actual validation plus cancellation history',
        async () => {
          for (const mode of ['bodyweight', 'assisted', 'duration'] as const) {
            const ex = exerciseDtoSchema.parse(
              await request(
                'POST',
                '/exercises',
                {
                  name: `isolated ${mode}`,
                  trackingMode: mode === 'duration' ? 'duration' : 'reps',
                },
                201,
              ),
            );
            const p = programDetailSchema.parse(
                await request(
                  'POST',
                  `/programs/${programId}/days`,
                  { name: mode },
                  201,
                ),
              ),
              d = p.days.at(-1)!.id;
            await request(
              'POST',
              `/program-days/${d}/exercises`,
              {
                exerciseId: ex.id,
                loadMode: mode === 'assisted' ? 'assisted' : 'bodyweight',
                targetSets: 2,
                ...(mode === 'duration'
                  ? { targetDurationSeconds: 60 }
                  : { targetReps: 10 }),
                ...(mode === 'assisted' ? { targetAssistanceKg: '15' } : {}),
              },
              201,
            );
            const w = await workout(
                'POST',
                '/workouts/start',
                { programDayId: d },
                201,
              ),
              id = w.exercises[0]!.sets[0]!.id;
            const actual: ActualInput = {
              actualReps: mode === 'duration' ? null : 10,
              actualDurationSeconds: mode === 'duration' ? 60 : null,
              actualLoadKg: null,
              actualAssistanceKg: mode === 'assisted' ? '15.00' : null,
              actualRpe: null,
            };
            await request(
              'POST',
              `/workout-sets/${id}/complete`,
              { ...actual, actualLoadKg: '1' },
              400,
            );
            const done = await workout(
              'POST',
              `/workout-sets/${id}/complete`,
              actual,
            );
            assert.deepEqual(
              done.exercises[0]!.sets[0]!.actualAssistanceKg,
              actual.actualAssistanceKg,
            );
            const cancel = await workout(
              'POST',
              `/workouts/${w.id}/cancel`,
              {},
            );
            assert.equal(cancel.status, 'cancelled');
            assert.equal(cancel.skippedSets, 1);
            assert.equal(
              (await workout('POST', `/workouts/${w.id}/cancel`, {}))
                .completedAt,
              cancel.completedAt,
            );
            await request(
              'POST',
              `/workout-sets/${w.exercises[0]!.sets[1]!.id}/complete`,
              actual,
              409,
            );
          }
        },
      );
    } catch (e) {
      if (e instanceof assert.AssertionError) throw e;
      throw new Error(
        `Neon workout integration failed: ${JSON.stringify(safeDatabaseError(e))}`,
      );
    } finally {
      await Promise.all(apps.map((a) => a.close()));
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
              (await client.db.select().from(users).where(eq(users.id, id)))
                .length,
              0,
            );
          }
      } catch (e) {
        throw new Error(
          `Workout cleanup failed: ${JSON.stringify(safeDatabaseError(e))}`,
        );
      } finally {
        await client.close();
      }
    }
  },
);

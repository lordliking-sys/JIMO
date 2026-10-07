import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  safeDatabaseError,
  users,
  exercises,
  programs,
  programDays,
  workoutSessions,
  workoutExercises,
  workoutSets,
} from '@jimo/database';
import {
  progressSummarySchema,
  progressWeeklySchema,
  progressRecordsSchema,
  progressExercisesSchema,
  progressExerciseDetailSchema,
  workoutHistorySchema,
  workoutRecordsSchema,
} from '@jimo/schemas';
import { buildApp } from '../src/app';
test(
  'Progress analytics on Neon development: actual, modes, PR, timezone, ownership and pagination',
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
        now: () => new Date('2026-10-07T12:00:00Z'),
      }),
    );
    const app = apps[0]!,
      other = apps[1]!;
    const get = async (url: string, status = 200, target = app) => {
      const response = await target.inject({
        method: 'GET',
        url,
        headers: { 'x-jimo-locale': 'it' },
      });
      assert.equal(
        response.statusCode,
        status,
        `${url}: expected ${status}, received ${response.statusCode}`,
      );
      return response.json();
    };
    const stage = (name: string, fn: () => Promise<void>) =>
      t.test(name, async () => {
        try {
          await fn();
        } catch (e) {
          if (e instanceof assert.AssertionError) throw e;
          throw new Error(`${name}: ${JSON.stringify(safeDatabaseError(e))}`);
        }
      });
    const ids = {
        bench: randomUUID(),
        pull: randomUUID(),
        push: randomUUID(),
        plank: randomUUID(),
        foreign: randomUUID(),
      },
      session = randomUUID(),
      cancelled = randomUUID(),
      pending = randomUUID(),
      boundary = randomUUID(),
      prior = randomUUID(),
      tie = randomUUID(),
      program = randomUUID(),
      mon = randomUUID(),
      wed = randomUUID(),
      fri = randomUUID();
    try {
      await assertDevelopment(client);
      verified = true;
      await client.db.insert(users).values([
        { id: a, displayName: 'isolated progress A' },
        { id: b, displayName: 'isolated progress B' },
      ]);
      await client.db.insert(exercises).values(
        Object.entries(ids).map(([key, id]) => ({
          id,
          canonicalName: `isolated ${key}`,
          isCustom: true,
          createdByUserId: key === 'foreign' ? b : a,
          trackingMode:
            key === 'plank' ? ('duration' as const) : ('reps' as const),
        })),
      );
      await client.db.insert(programs).values({
        id: program,
        userId: a,
        name: 'isolated progress schedule',
        status: 'active',
      });
      await client.db.insert(programDays).values([
        {
          id: mon,
          programId: program,
          name: 'Push',
          position: 0,
          dayOfWeek: 1,
        },
        {
          id: wed,
          programId: program,
          name: 'Pull',
          position: 1,
          dayOfWeek: 3,
        },
        {
          id: fri,
          programId: program,
          name: 'Legs',
          position: 2,
          dayOfWeek: 5,
        },
      ]);
      await client.db.insert(workoutSessions).values([
        {
          id: session,
          userId: a,
          name: 'isolated actual metrics',
          status: 'completed',
          startedAt: new Date('2026-10-06T10:00:00Z'),
          completedAt: new Date('2026-10-06T11:00:00Z'),
        },
        {
          id: cancelled,
          userId: a,
          name: 'isolated cancelled',
          status: 'cancelled',
          startedAt: new Date('2026-10-06T12:00:00Z'),
          completedAt: new Date('2026-10-06T13:00:00Z'),
        },
        {
          id: pending,
          userId: a,
          name: 'isolated pending',
          status: 'in_progress',
          startedAt: new Date('2026-10-07T09:00:00Z'),
        },
        {
          id: boundary,
          userId: a,
          programId: program,
          programDayId: mon,
          name: 'isolated Monday Rome',
          status: 'completed',
          startedAt: new Date('2026-10-04T22:30:00Z'),
          completedAt: new Date('2026-10-04T23:30:00Z'),
        },
        {
          id: prior,
          userId: a,
          name: 'isolated prior',
          status: 'completed',
          startedAt: new Date('2026-06-01T10:00:00Z'),
          completedAt: new Date('2026-06-01T10:30:00Z'),
        },
        {
          id: tie,
          userId: a,
          programId: program,
          programDayId: wed,
          name: 'isolated same PR',
          status: 'completed',
          startedAt: new Date('2026-10-07T10:00:00Z'),
          completedAt: new Date('2026-10-07T10:30:00Z'),
        },
      ]);
      const insert = async (
        sid: string,
        id: string,
        mode: 'external' | 'weighted' | 'assisted' | 'bodyweight',
        values: {
          reps?: number;
          load?: string;
          assist?: string;
          duration?: number;
          rpe?: string;
          status?: 'completed' | 'pending' | 'skipped';
        }[],
        position = 0,
      ) => {
        const ex = randomUUID(),
          duration = id === ids.plank;
        await client.db.insert(workoutExercises).values({
          id: ex,
          workoutSessionId: sid,
          exerciseId: id,
          exerciseNameSnapshot: `snapshot ${id === ids.bench ? 'old bench' : 'exercise'}`,
          trackingModeSnapshot: duration ? 'duration' : 'reps',
          loadModeSnapshot: mode,
          position,
        });
        await client.db.insert(workoutSets).values(
          values.map((v, i) => ({
            id: randomUUID(),
            workoutExerciseId: ex,
            setNumber: i + 1,
            status: v.status ?? 'completed',
            targetReps: duration ? null : 8,
            targetDurationSeconds: duration ? 60 : null,
            targetLoadKg:
              mode === 'external' || mode === 'weighted' ? '80.00' : null,
            targetAssistanceKg: mode === 'assisted' ? '30.00' : null,
            targetRpe: '8.0',
            actualReps: v.reps ?? null,
            actualLoadKg: v.load ?? null,
            actualAssistanceKg: v.assist ?? null,
            actualDurationSeconds: v.duration ?? null,
            actualRpe: v.rpe ?? null,
            completedAt:
              v.status === 'pending' || v.status === 'skipped'
                ? null
                : new Date('2026-10-06T10:15:00Z'),
          })),
        );
      };
      await insert(session, ids.bench, 'external', [
        { reps: 7, load: '82.50', rpe: '9.0' },
        { status: 'skipped' },
        { status: 'pending' },
      ]);
      await insert(
        session,
        ids.pull,
        'weighted',
        [
          { reps: 8, load: '20.00' },
          { reps: 6, load: '25.00' },
          { reps: 3, load: '35.00' },
        ],
        1,
      );
      await insert(
        session,
        ids.pull,
        'assisted',
        [
          { reps: 8, assist: '30.00' },
          { reps: 8, assist: '25.00' },
          { reps: 8, assist: '20.00' },
        ],
        2,
      );
      await insert(
        session,
        ids.push,
        'bodyweight',
        [{ reps: 20 }, { reps: 25 }, { reps: 18 }],
        3,
      );
      await insert(
        session,
        ids.plank,
        'bodyweight',
        [{ duration: 60 }, { duration: 75 }, { duration: 90 }],
        4,
      );
      await insert(cancelled, ids.bench, 'external', [
        { reps: 100, load: '500.00' },
      ]);
      await insert(pending, ids.bench, 'external', [
        { reps: 100, load: '999.00' },
      ]);
      await insert(prior, ids.bench, 'external', [
        { reps: 8, load: '80.00', rpe: '8.0' },
      ]);
      await insert(tie, ids.bench, 'external', [{ reps: 7, load: '82.50' }]);
      await stage(
        'health/ready, summary actual only, null RPE and partial weeks',
        async () => {
          assert.equal((await get('/health')).status, 'ok');
          assert.equal((await get('/ready')).status, 'ready');
          const s = progressSummarySchema.parse(
            await get('/progress/summary?range=8w&timeZone=Europe%2FRome'),
          );
          assert.equal(s.completedWorkouts, 3);
          assert.equal(s.completedSets, 14);
          assert.equal(s.skippedSets, 1);
          assert.equal(s.totalReps, 118);
          assert.equal(s.averageRpe, 9);
          assert.equal(s.trainingSeconds, 9000);
          assert.ok(
            Math.abs(s.sessionsPerWeek - 3 / s.period.effectiveWeeks) < 1e-10,
          );
          assert.ok(s.period.effectiveWeeks < 8);
          assert.ok(s.period.effectiveWeeks > 7);
          assert.deepEqual(s.adherence, {
            weekStart: '2026-10-05',
            planned: 3,
            completed: 2,
            percentage: (2 / 3) * 100,
          });
        },
      );
      await stage(
        'weekly Rome vs UTC boundary, zero weeks, range/all',
        async () => {
          const rome = progressWeeklySchema.parse(
            await get('/progress/weekly?range=4w&timeZone=Europe%2FRome'),
          );
          const utc = progressWeeklySchema.parse(
            await get('/progress/weekly?range=4w&timeZone=UTC'),
          );
          assert.equal(
            rome.weeks.find((w) => w.weekStart === '2026-10-05')
              ?.completedWorkouts,
            3,
          );
          assert.equal(
            utc.weeks.find((w) => w.weekStart === '2026-10-05')
              ?.completedWorkouts,
            2,
          );
          assert.equal(
            utc.weeks.find((w) => w.weekStart === '2026-09-28')
              ?.completedWorkouts,
            1,
          );
          assert.equal(rome.weeks[0]?.averageRpe, null);
          assert.equal(rome.weeks[0]?.completedSets, 0);
          const all = progressSummarySchema.parse(
            await get('/progress/summary?range=all&timeZone=UTC'),
          );
          assert.equal(all.completedWorkouts, 4);
          assert.equal(all.totalReps, 126);
          assert.equal(all.averageRpe, 8.5);
          for (const range of ['4w', '12w', '6m'])
            progressSummarySchema.parse(
              await get(`/progress/summary?range=${range}&timeZone=UTC`),
            );
        },
      );
      await stage(
        'actual load PR with reps/date/UUID; targets/skipped/cancelled excluded; stable ties',
        async () => {
          const response = progressRecordsSchema.parse(
            await get('/progress/prs?range=8w&timeZone=UTC'),
          );
          const load = response.records.find(
            (r) => r.exerciseId === ids.bench && r.type === 'MAX_LOAD',
          )!;
          assert.equal(load.value, '82.50');
          assert.equal(load.reps, 7);
          assert.equal(load.sessionId, session);
          assert.equal(load.date, '2026-10-06T11:00:00.000Z');
          const first = progressRecordsSchema.parse(
            await get('/progress/prs?range=8w&timeZone=UTC&limit=2'),
          );
          assert.ok(first.nextCursor);
          const second = progressRecordsSchema.parse(
            await get(
              `/progress/prs?range=8w&timeZone=UTC&limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`,
            ),
          );
          assert.equal(
            new Set(
              [...first.records, ...second.records].map(
                (r) => r.setId + ':' + r.type,
              ),
            ).size,
            4,
          );
        },
      );
      await stage(
        'weighted +35x3 volume 415, assisted min20x8, separated modes',
        async () => {
          const detail = progressExerciseDetailSchema.parse(
            await get(`/progress/exercises/${ids.pull}?range=8w&timeZone=UTC`),
          );
          assert.equal(detail.modes.length, 2);
          const weighted = detail.modes.find((m) => m.loadMode === 'weighted')!,
            assist = detail.modes.find((m) => m.loadMode === 'assisted')!;
          assert.equal(weighted.loadVolume, '415.00');
          assert.equal(weighted.maxLoadKg, '35.00');
          assert.equal(
            weighted.records.find((r) => r.type === 'MAX_LOAD')?.reps,
            3,
          );
          assert.equal(assist.minAssistanceKg, '20.00');
          assert.equal(assist.maxLoadKg, null);
          assert.equal(assist.loadVolume, null);
          assert.equal(
            assist.records.find((r) => r.type === 'MIN_ASSISTANCE')?.reps,
            8,
          );
          assert.equal(weighted.timeline[0]?.maxLoadKg, '35.00');
          assert.equal(assist.timeline[0]?.minAssistanceKg, '20.00');
        },
      );
      await stage(
        'bodyweight25 reps no volume; duration90 mean75 total225',
        async () => {
          const push = progressExerciseDetailSchema.parse(
            await get(`/progress/exercises/${ids.push}?range=8w&timeZone=UTC`),
          ).modes[0]!;
          assert.ok(push.sessionsPerWeek > 0 && push.sessionsPerWeek < 1);
          assert.equal(push.maxReps, 25);
          assert.equal(push.totalReps, 63);
          assert.equal(push.loadVolume, null);
          assert.equal(push.maxLoadKg, null);
          const plank = progressExerciseDetailSchema.parse(
            await get(`/progress/exercises/${ids.plank}?range=8w&timeZone=UTC`),
          ).modes[0]!;
          assert.equal(plank.maxDurationSeconds, 90);
          assert.equal(plank.averageDurationSeconds, 75);
          assert.equal(plank.totalDurationSeconds, 225);
          assert.equal(plank.totalReps, null);
          assert.equal(plank.records[0]?.value, '90');
        },
      );
      await stage(
        'exercise history search/cursor, current name vs historical snapshot',
        async () => {
          const list = progressExercisesSchema.parse(
            await get('/progress/exercises?range=8w&timeZone=UTC&search=bench'),
          );
          assert.equal(list.exercises.length, 1);
          assert.equal(list.exercises[0]?.displayName, 'isolated bench');
          assert.equal(list.exercises[0]?.latest.loadKg, '82.50');
          const one = progressExercisesSchema.parse(
            await get('/progress/exercises?range=8w&timeZone=UTC&limit=1'),
          );
          const two = progressExercisesSchema.parse(
            await get(
              `/progress/exercises?range=8w&timeZone=UTC&limit=1&cursor=${one.nextCursor}`,
            ),
          );
          assert.notEqual(one.exercises[0]?.id, two.exercises[0]?.id);
          assert.equal(
            (await get(`/workouts/${session}`)).exercises[0]
              .exerciseNameSnapshot,
            'snapshot old bench',
          );
        },
      );
      await stage(
        'workout-specific new records and strict tie exclusion',
        async () => {
          const records = workoutRecordsSchema.parse(
            await get(`/progress/workouts/${session}/records`),
          );
          assert.ok(
            records.records.some(
              (r) => r.type === 'MAX_LOAD' && r.exerciseId === ids.bench,
            ),
          );
          const tied = workoutRecordsSchema.parse(
            await get(`/progress/workouts/${tie}/records`),
          );
          assert.equal(tied.records.length, 0);
          assert.equal(
            workoutRecordsSchema.parse(
              await get(`/progress/workouts/${cancelled}/records`),
            ).records.length,
            0,
          );
        },
      );
      await stage(
        'CurrentUser A/B isolation including arbitrary exercise/session IDs and ranges',
        async () => {
          const empty = progressSummarySchema.parse(
            await get('/progress/summary?range=all&timeZone=UTC', 200, other),
          );
          assert.equal(empty.completedWorkouts, 0);
          assert.equal(empty.averageRpe, null);
          assert.equal(empty.trainingSeconds, null);
          assert.equal(
            progressExercisesSchema.parse(
              await get(
                '/progress/exercises?range=all&timeZone=UTC',
                200,
                other,
              ),
            ).exercises.length,
            0,
          );
          assert.equal(
            progressRecordsSchema.parse(
              await get('/progress/prs?range=all&timeZone=UTC', 200, other),
            ).records.length,
            0,
          );
          await get(
            `/progress/exercises/${ids.bench}?range=all&timeZone=UTC`,
            404,
            other,
          );
          await get(
            `/progress/exercises/${ids.foreign}?range=all&timeZone=UTC`,
            404,
          );
          await get(`/progress/workouts/${session}/records`, 404, other);
        },
      );
      await stage(
        'strict range/timezone/cursor/identity validation and history pagination',
        async () => {
          for (const query of [
            'range=nope&timeZone=UTC',
            'range=8w&timeZone=Invalid%2FZone',
            'range=8w&timeZone=%2B02%3A00',
            'range=8w&timeZone=UTC&userId=' + b,
            'range=8w&timeZone=UTC&from=1900-01-01',
            'range=8w',
          ])
            await get('/progress/summary?' + query, 400);
          await get('/progress/prs?timeZone=UTC&limit=1000', 400);
          await get('/workouts?cursorId=' + session, 400);
          const one = workoutHistorySchema.parse(
            await get('/workouts?status=completed&limit=2'),
          );
          assert.equal(one.workouts.length, 2);
          assert.ok(one.nextCursor);
          const next = workoutHistorySchema.parse(
            await get(
              `/workouts?status=completed&limit=2&cursorAt=${encodeURIComponent(one.nextCursor!.startedAt)}&cursorId=${one.nextCursor!.id}`,
            ),
          );
          assert.equal(next.workouts.length, 2);
          assert.equal(
            new Set([...one.workouts, ...next.workouts].map((w) => w.id)).size,
            4,
          );
          assert.equal(next.nextCursor, null);
        },
      );
      await stage(
        'correction recomputes PR; no aggregate tables; unassigned schedule unavailable',
        async () => {
          await client.db
            .update(workoutSets)
            .set({ actualLoadKg: '81.25' })
            .where(
              eq(
                workoutSets.workoutExerciseId,
                (
                  await client.db
                    .select({ id: workoutExercises.id })
                    .from(workoutExercises)
                    .where(eq(workoutExercises.workoutSessionId, tie))
                )[0]!.id,
              ),
            );
          await client.db
            .update(programDays)
            .set({ dayOfWeek: null })
            .where(eq(programDays.id, fri));
          assert.equal(
            progressSummarySchema.parse(
              await get('/progress/summary?range=8w&timeZone=UTC'),
            ).adherence,
            null,
          );
        },
      );
    } catch (e) {
      if (e instanceof assert.AssertionError) throw e;
      throw new Error(
        `Progress integration: ${JSON.stringify(safeDatabaseError(e))}`,
      );
    } finally {
      await Promise.all(apps.map((app) => app.close()));
      if (verified) {
        await client.db
          .delete(workoutSessions)
          .where(eq(workoutSessions.userId, a));
        await client.db.delete(programs).where(eq(programs.userId, a));
        await client.db
          .delete(exercises)
          .where(eq(exercises.createdByUserId, a));
        await client.db
          .delete(exercises)
          .where(eq(exercises.createdByUserId, b));
        await client.db.delete(users).where(eq(users.id, a));
        await client.db.delete(users).where(eq(users.id, b));
      }
      await client.close();
    }
  },
);

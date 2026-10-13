import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  users,
  programs,
  exercises,
  workoutSessions,
  safeDatabaseError,
} from '@jimo/database';
import { buildApp } from '../src/app';
import { ProgramService } from '../src/program-service';
import { WorkoutService } from '../src/workout-service';
import { WorkoutSyncService } from '../src/workout-sync';
import { offlineSnapshotSchema, type WorkoutOperation } from '@jimo/schemas';

test(
  'Development: DELETE enforces ownership and preserves completed/in-progress snapshots; preparation sync is replay-safe',
  { skip: !process.env.DATABASE_URL, timeout: 120_000 },
  async () => {
    const client = createDatabase(process.env.DATABASE_URL!);
    const owner = randomUUID(),
      other = randomUUID();
    let verified = false;
    const appA = buildApp({
        database: client,
        currentUser: async () => ({ id: owner }),
        logger: false,
      }),
      appB = buildApp({
        database: client,
        currentUser: async () => ({ id: other }),
        logger: false,
      });
    try {
      await assertDevelopment(client);
      verified = true;
      await client.db.insert(users).values([
        { id: owner, displayName: 'JIMO_HANDSFREE_SYNTHETIC' },
        { id: other, displayName: 'JIMO_DELETE_OTHER_SYNTHETIC' },
      ]);
      const ps = new ProgramService(client),
        ws = new WorkoutService(client),
        sync = new WorkoutSyncService(client);
      const e = await ps.createExercise(owner, {
        name: 'Synthetic exercise',
        trackingMode: 'reps',
        defaultLoadMode: 'bodyweight',
      });
      let p = await ps.create(
        owner,
        { name: 'Synthetic program', durationWeeks: 4 },
        'it',
      );
      p = await ps.addDay(owner, p.id, { name: 'Push', dayOfWeek: 1 }, 'it');
      p = await ps.addPrescription(
        owner,
        p.days[0]!.id,
        {
          exerciseId: e.id,
          loadMode: 'bodyweight',
          targetSets: 1,
          targetReps: 8,
        },
        'it',
      );
      p = await ps.activate(owner, p.id, 'it');
      let w = await ws.start(owner, p.days[0]!.id, 'it');
      w = await ws.saveSet(owner, w.exercises[0]!.sets[0]!.id, {
        actualReps: 7,
        actualDurationSeconds: null,
        actualLoadKg: null,
        actualAssistanceKg: null,
        actualRpe: '8.0',
      });
      w = await ws.finish(owner, w.id, false);
      const live = await ws.start(owner, p.days[0]!.id, 'it');
      assert.equal(
        (await appB.inject({ method: 'DELETE', url: `/programs/${p.id}` }))
          .statusCode,
        404,
      );
      assert.equal((await ps.detail(owner, p.id, 'it')).id, p.id);
      const result = await appA.inject({
        method: 'DELETE',
        url: `/programs/${p.id}`,
      });
      assert.equal(result.statusCode, 200);
      assert.equal(result.json().id, p.id);
      assert.equal(
        (await appA.inject({ method: 'DELETE', url: `/programs/${p.id}` }))
          .statusCode,
        404,
      );
      const history = await ws.detail(owner, w.id),
        current = await ws.detail(owner, live.id);
      assert.equal(history.programId, null);
      assert.equal(history.programDayId, null);
      assert.equal(history.name, w.name);
      assert.equal(history.status, 'completed');
      assert.equal(history.exercises[0]!.programExerciseId, null);
      assert.equal(history.exercises[0]!.sets[0]!.targetReps, 8);
      assert.equal(history.exercises[0]!.sets[0]!.actualReps, 7);
      assert.equal(
        history.exercises[0]!.exerciseNameSnapshot,
        'Synthetic exercise',
      );
      assert.equal(current.status, 'in_progress');
      assert.equal(current.exercises[0]!.sets[0]!.targetReps, 8);
      await ws.finish(owner, live.id, true, true);
      let ep = await ps.create(owner, { name: 'EMOM sync fixture' }, 'en');
      ep = await ps.addDay(owner, ep.id, { name: 'Push' }, 'en');
      ep = await ps.addPrescription(
        owner,
        ep.days[0]!.id,
        {
          exerciseId: e.id,
          loadMode: 'bodyweight',
          targetSets: 2,
          targetReps: 5,
          workoutMode: 'emom',
          emomIntervalSeconds: 60,
        },
        'en',
      );
      ep = await ps.activate(owner, ep.id, 'en');
      const session = randomUUID(),
        ex = randomUUID(),
        setIds = [randomUUID(), randomUUID()];
      const base = Date.now() - 150_000,
        at = new Date(base).toISOString();
      const snapshot = offlineSnapshotSchema.parse({
        programId: ep.id,
        programDayId: ep.days[0]!.id,
        name: 'Hands-free fixture',
        notes: null,
        exercises: [
          {
            id: ex,
            exerciseId: e.id,
            programExerciseId: ep.days[0]!.exercises[0]!.id,
            position: 0,
            exerciseNameSnapshot: e.displayName,
            trackingModeSnapshot: 'reps',
            loadModeSnapshot: 'bodyweight',
            workoutModeSnapshot: 'emom',
            emomIntervalSecondsSnapshot: 60,
            restSecondsSnapshot: null,
            notes: null,
            sets: setIds.map((id, i) => ({
              id,
              setNumber: i + 1,
              targetReps: 5,
              targetRepMin: null,
              targetRepMax: null,
              targetDurationSeconds: null,
              targetLoadKg: null,
              targetAssistanceKg: null,
              targetRpe: null,
              targetRestSeconds: null,
            })),
          },
        ],
      });
      const ops: WorkoutOperation[] = [
        {
          operationId: randomUUID(),
          sessionId: session,
          entityId: session,
          sequence: 1,
          createdAt: at,
          operationType: 'START_WORKOUT',
          payload: snapshot,
        },
        {
          operationId: randomUUID(),
          sessionId: session,
          entityId: ex,
          sequence: 2,
          createdAt: at,
          operationType: 'START_EMOM',
          payload: { preparationSeconds: 10 },
        },
        ...setIds.map((id, i): WorkoutOperation => ({
          operationId: randomUUID(),
          sessionId: session,
          entityId: id,
          sequence: i + 3,
          createdAt: new Date(base + 10_000 + (i + 1) * 60_000).toISOString(),
          operationType: 'COMPLETE_SET',
          payload: {
            actualReps: 5,
            actualDurationSeconds: null,
            actualLoadKg: null,
            actualAssistanceKg: null,
            actualRpe: null,
          },
        })),
      ];
      const synced = await sync.process(owner, ops);
      assert.equal(synced.failed.length, 0);
      assert.equal((await sync.process(owner, ops)).acknowledged.length, 4);
      const actual = await ws.detail(owner, session);
      assert.equal(
        actual.exercises[0]!.emomStartedAt,
        new Date(base + 10_000).toISOString(),
      );
      assert.equal(actual.completedSets, 2);
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error;
      throw new Error(JSON.stringify(safeDatabaseError(error)));
    } finally {
      await appA.close();
      await appB.close();
      if (verified) {
        for (const id of [owner, other]) {
          await client.db
            .delete(workoutSessions)
            .where(eq(workoutSessions.userId, id));
          await client.db.delete(programs).where(eq(programs.userId, id));
          await client.db
            .delete(exercises)
            .where(eq(exercises.createdByUserId, id));
          await client.db.delete(users).where(eq(users.id, id));
        }
      }
      await client.close();
    }
  },
);

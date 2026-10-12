import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  users,
  programs,
  workoutSessions,
  exercises,
  syncOperations,
} from '@jimo/database';
import { offlineSnapshotSchema, type WorkoutOperation } from '@jimo/schemas';
import { ProgramService } from '../src/program-service';
import { WorkoutService } from '../src/workout-service';
import { WorkoutSyncService } from '../src/workout-sync';

test(
  'Development HTTP: online pyramid snapshot/history and offline EMOM sync receipts preserve targets',
  { skip: !process.env.DATABASE_URL, timeout: 90_000 },
  async () => {
    const client = createDatabase(process.env.DATABASE_URL!);
    await assertDevelopment(client);
    const user = randomUUID();
    let created = false;
    try {
      await client.db
        .insert(users)
        .values({ id: user, displayName: 'JIMO_MODES_SYNTHETIC_TEST' });
      created = true;
      const ps = new ProgramService(client),
        ws = new WorkoutService(client),
        sync = new WorkoutSyncService(client);
      const exercise = await ps.createExercise(user, {
        name: 'Modes fixture',
        trackingMode: 'reps',
        defaultLoadMode: 'external',
      });
      let p = await ps.create(
        user,
        { name: 'Modes fixture', durationWeeks: 3 },
        'en',
      );
      p = await ps.addDay(user, p.id, { name: 'Monday', dayOfWeek: 1 }, 'en');
      const day = p.days[0]!;
      const targets = [12, 10, 8].map((reps, i) => ({
        targetReps: reps,
        targetDurationSeconds: null,
        targetLoadKg: ['60.00', '70.00', '80.00'][i]!,
        targetAssistanceKg: null,
        targetRpe: '8.0',
        restSeconds: i === 1 ? null : 90,
      }));
      p = await ps.addPrescription(
        user,
        day.id,
        {
          exerciseId: exercise.id,
          loadMode: 'external',
          workoutMode: 'pyramid',
          targetSets: 3,
          targetReps: 12,
          targetLoadKg: '60.00',
          targetRpe: '8.0',
          setTargets: targets,
        },
        'en',
      );
      p = await ps.activate(user, p.id, 'en');
      const w = await ws.start(user, day.id, 'en');
      assert.deepEqual(
        w.exercises[0]!.sets.map((s) => [
          s.targetReps,
          s.targetLoadKg,
          s.targetRestSeconds,
        ]),
        [
          [12, '60.00', 90],
          [10, '70.00', null],
          [8, '80.00', 90],
        ],
      );
      const actual = {
        actualReps: 7,
        actualDurationSeconds: null,
        actualLoadKg: '80.00',
        actualAssistanceKg: null,
        actualRpe: '8.0',
      };
      await ws.saveSet(user, w.exercises[0]!.sets[0]!.id, actual);
      await ws.saveSet(
        user,
        w.exercises[0]!.sets[0]!.id,
        { ...actual, actualReps: 6 },
        true,
      );
      await ws.finish(user, w.id, true);
      await ps.updatePrescription(
        user,
        p.days[0]!.exercises[0]!.id,
        {
          workoutMode: 'emom',
          setTargets: null,
          emomIntervalSeconds: 60,
          targetReps: 5,
          targetLoadKg: '80.00',
        },
        'en',
      );
      const history = await ws.detail(user, w.id);
      assert.equal(history.exercises[0]!.sets[0]!.targetReps, 12);
      assert.equal(history.exercises[0]!.sets[0]!.actualReps, 6);
      const session = randomUUID(),
        ex = randomUUID(),
        ids = [randomUUID(), randomUUID(), randomUUID()],
        at = new Date(Date.now() - 190_000).toISOString();
      const snapshot = offlineSnapshotSchema.parse({
        programId: p.id,
        programDayId: day.id,
        name: day.name,
        notes: null,
        exercises: [
          {
            id: ex,
            exerciseId: exercise.id,
            programExerciseId: p.days[0]!.exercises[0]!.id,
            position: 0,
            exerciseNameSnapshot: 'Modes fixture',
            trackingModeSnapshot: 'reps',
            loadModeSnapshot: 'external',
            workoutModeSnapshot: 'emom',
            emomIntervalSecondsSnapshot: 60,
            restSecondsSnapshot: null,
            notes: null,
            sets: ids.map((id, i) => ({
              id,
              setNumber: i + 1,
              targetReps: 5,
              targetRepMin: null,
              targetRepMax: null,
              targetDurationSeconds: null,
              targetLoadKg: '80.00',
              targetAssistanceKg: null,
              targetRpe: '8.0',
              targetRestSeconds: null,
            })),
          },
        ],
      });
      const start: WorkoutOperation = {
        operationId: randomUUID(),
        sessionId: session,
        entityId: session,
        sequence: 1,
        createdAt: at,
        operationType: 'START_WORKOUT',
        payload: snapshot,
      };
      const emom: WorkoutOperation = {
        operationId: randomUUID(),
        sessionId: session,
        entityId: ex,
        sequence: 2,
        createdAt: at,
        operationType: 'START_EMOM',
        payload: {},
      };
      const complete: WorkoutOperation = {
        operationId: randomUUID(),
        sessionId: session,
        entityId: ids[0]!,
        sequence: 3,
        createdAt: at,
        operationType: 'COMPLETE_SET',
        payload: actual,
      };
      const operations = [start, emom, complete];
      assert.equal((await sync.process(user, operations)).failed.length, 0);
      assert.equal(
        (await sync.process(user, operations)).acknowledged.length,
        3,
      );
      assert.equal(
        (
          await client.db
            .select()
            .from(syncOperations)
            .where(eq(syncOperations.userId, user))
        ).length,
        3,
      );
      const saved = await ws.detail(user, session);
      assert.equal(saved.exercises[0]!.emomStartedAt, at);
      assert.equal(saved.exercises[0]!.sets[0]!.targetReps, 5);
      assert.equal(saved.exercises[0]!.sets[0]!.actualReps, 7);
      const future: WorkoutOperation = {
        ...complete,
        operationId: randomUUID(),
        entityId: ids[1]!,
        sequence: 4,
      };
      assert.equal(
        (await sync.process(user, [future])).failed[0]?.status,
        'conflict',
      );
      const finish: WorkoutOperation = {
        operationId: randomUUID(),
        sessionId: session,
        entityId: session,
        sequence: 4,
        createdAt: new Date().toISOString(),
        operationType: 'COMPLETE_WORKOUT',
        payload: { skipPending: true },
      };
      assert.equal((await sync.process(user, [finish])).failed.length, 0);
      assert.equal((await ws.detail(user, session)).status, 'completed');
    } finally {
      if (created) {
        await client.db
          .delete(workoutSessions)
          .where(eq(workoutSessions.userId, user));
        await client.db.delete(programs).where(eq(programs.userId, user));
        await client.db
          .delete(exercises)
          .where(eq(exercises.createdByUserId, user));
        await client.db.delete(users).where(eq(users.id, user));
      }
      await client.close();
    }
  },
);

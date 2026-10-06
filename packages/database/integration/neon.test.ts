import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { eq, sql } from 'drizzle-orm';
import { createDatabase, safeDatabaseError } from '../src/client';
import { assertDevelopment } from '../src/development';
import {
  users,
  exercises,
  programs,
  programDays,
  programExercises,
  workoutSessions,
  workoutExercises,
  workoutSets,
} from '../src/schema';
import { snapshotExercise, snapshotSets } from '../src/snapshots';

test(
  'Neon HTTP integration with isolated records and cleanup',
  { skip: !process.env.DATABASE_URL },
  async (t) => {
    const client = createDatabase(process.env.DATABASE_URL!);
    const { db } = client;
    const userId = randomUUID(),
      rollbackUserId = randomUUID();
    const label = `JIMO_TEST_${userId}`;
    let verified = false;
    const stage = async (name: string, action: () => Promise<void>) => {
      await t.test(name, async () => {
        try {
          await action();
        } catch (error) {
          if (error instanceof assert.AssertionError) throw error;
          throw new Error(
            `${name}: ${JSON.stringify(safeDatabaseError(error))}`,
          );
        }
      });
    };
    const must = <T>(row: T | undefined): T => {
      assert.ok(row);
      return row;
    };
    const rejectsWith = async (action: Promise<unknown>, code: string) => {
      try {
        await action;
      } catch (error) {
        assert.equal(safeDatabaseError(error).code, code);
        return;
      }
      assert.fail(`Expected PostgreSQL constraint ${code}`);
    };
    try {
      await assertDevelopment(client);
      verified = true;
      await db.insert(users).values({ id: userId, displayName: label });
      await stage(
        'locale defaults to system and accepts future languages as text',
        async () => {
          const user = must(
            (await db.select().from(users).where(eq(users.id, userId)))[0],
          );
          assert.equal(user.locale, 'system');
          for (const locale of ['it', 'en', 'es', 'fr', 'de', 'pt']) {
            await db.update(users).set({ locale }).where(eq(users.id, userId));
            const stored = must(
              (await db.select().from(users).where(eq(users.id, userId)))[0],
            );
            assert.equal(stored.locale, locale);
          }
        },
      );
      const pullUp = must(
        (
          await db
            .insert(exercises)
            .values({
              createdByUserId: userId,
              canonicalName: `${label} Pull-Up`,
              slug: `test-${userId}`,
              isCustom: true,
              trackingMode: 'reps',
              defaultLoadMode: 'bodyweight',
            })
            .returning()
        )[0],
      );
      const plank = must(
        (
          await db
            .insert(exercises)
            .values({
              createdByUserId: userId,
              canonicalName: `${label} Plank`,
              isCustom: true,
              trackingMode: 'duration',
              defaultLoadMode: 'bodyweight',
            })
            .returning()
        )[0],
      );
      const program = must(
        (
          await db
            .insert(programs)
            .values({ userId, name: label, durationWeeks: 6 })
            .returning()
        )[0],
      );
      const day = must(
        (
          await db
            .insert(programDays)
            .values({ programId: program.id, name: 'Day A', position: 0 })
            .returning()
        )[0],
      );
      const prescription = must(
        (
          await db
            .insert(programExercises)
            .values({
              programDayId: day.id,
              exerciseId: pullUp.id,
              position: 0,
              loadMode: 'weighted',
              targetSets: 3,
              targetReps: 8,
              targetLoadKg: '20.00',
              targetRpe: '8.0',
              restSeconds: 90,
            })
            .returning()
        )[0],
      );
      const session = must(
        (
          await db
            .insert(workoutSessions)
            .values({
              userId,
              programId: program.id,
              programDayId: day.id,
              name: label,
            })
            .returning()
        )[0],
      );
      const workoutExercise = must(
        (
          await db
            .insert(workoutExercises)
            .values(snapshotExercise(prescription, pullUp, session.id))
            .returning()
        )[0],
      );
      await db
        .insert(workoutSets)
        .values(snapshotSets(prescription, workoutExercise.id));

      await stage(
        'program graph, database-generated UUIDs and ordered relations',
        async () => {
          assert.match(program.id, /^[0-9a-f-]{36}$/);
          assert.ok(program.createdAt instanceof Date);
          const graph = await db.query.users.findFirst({
            where: eq(users.id, userId),
            with: {
              programs: { with: { days: { with: { exercises: true } } } },
            },
          });
          assert.equal(
            graph?.programs[0]?.days[0]?.exercises[0]?.targetReps,
            8,
          );
          assert.equal(graph?.programs[0]?.days[0]?.dayOfWeek, null);
        },
      );
      await stage(
        'actual 8/8/7 reps and RPE 7/8/9 remain separate from targets',
        async () => {
          const sets = await db
            .select()
            .from(workoutSets)
            .where(eq(workoutSets.workoutExerciseId, workoutExercise.id))
            .orderBy(workoutSets.setNumber);
          for (const [index, set] of sets.entries())
            await db
              .update(workoutSets)
              .set({
                status: 'completed',
                actualReps: index === 2 ? 7 : 8,
                actualLoadKg: '20.00',
                actualRpe: `${7 + index}.0`,
                completedAt: new Date(),
              })
              .where(eq(workoutSets.id, set.id));
          const history = await db.query.workoutExercises.findFirst({
            where: eq(workoutExercises.id, workoutExercise.id),
            with: { sets: { orderBy: workoutSets.setNumber } },
          });
          assert.deepEqual(
            history?.sets.map((set) => [
              set.targetReps,
              set.targetLoadKg,
              set.targetRpe,
              set.actualReps,
              set.actualRpe,
            ]),
            [
              [8, '20.00', '8.0', 8, '7.0'],
              [8, '20.00', '8.0', 8, '8.0'],
              [8, '20.00', '8.0', 7, '9.0'],
            ],
          );
        },
      );
      await stage(
        'source 3x10 +25kg and renamed exercise do not rewrite 3x8 +20kg history',
        async () => {
          await db
            .update(programExercises)
            .set({ targetReps: 10, targetLoadKg: '25.00', restSeconds: 120 })
            .where(eq(programExercises.id, prescription.id));
          await db
            .update(exercises)
            .set({ canonicalName: `${label} Renamed` })
            .where(eq(exercises.id, pullUp.id));
          const history = must(
            await db.query.workoutExercises.findFirst({
              where: eq(workoutExercises.id, workoutExercise.id),
              with: { sets: { orderBy: workoutSets.setNumber } },
            }),
          );
          assert.equal(history.exerciseNameSnapshot, pullUp.canonicalName);
          assert.equal(history.restSecondsSnapshot, 90);
          assert.equal(history.sets.length, 3);
          assert.ok(
            history.sets.every(
              (set) => set.targetReps === 8 && set.targetLoadKg === '20.00',
            ),
          );
          assert.equal(history.sets[2]?.actualReps, 7);
        },
      );
      await stage(
        'range 8-12 stays a range and timed sets record actual seconds',
        async () => {
          const range = must(
            (
              await db
                .insert(programExercises)
                .values({
                  programDayId: day.id,
                  exerciseId: pullUp.id,
                  position: 1,
                  loadMode: 'assisted',
                  targetSets: 3,
                  targetRepMin: 8,
                  targetRepMax: 12,
                  targetAssistanceKg: '22.50',
                })
                .returning()
            )[0],
          );
          const timed = must(
            (
              await db
                .insert(programExercises)
                .values({
                  programDayId: day.id,
                  exerciseId: plank.id,
                  position: 2,
                  loadMode: 'bodyweight',
                  targetSets: 3,
                  targetDurationSeconds: 60,
                })
                .returning()
            )[0],
          );
          const rangeExercise = must(
            (
              await db
                .insert(workoutExercises)
                .values(snapshotExercise(range, pullUp, session.id))
                .returning()
            )[0],
          );
          const timedExercise = must(
            (
              await db
                .insert(workoutExercises)
                .values(snapshotExercise(timed, plank, session.id))
                .returning()
            )[0],
          );
          const rangeSets = await db
            .insert(workoutSets)
            .values(snapshotSets(range, rangeExercise.id))
            .returning();
          const timedSets = await db
            .insert(workoutSets)
            .values(snapshotSets(timed, timedExercise.id))
            .returning();
          assert.ok(
            rangeSets.every(
              (set) =>
                set.targetReps === null &&
                set.targetRepMin === 8 &&
                set.targetRepMax === 12 &&
                set.targetAssistanceKg === '22.50',
            ),
          );
          const timedSet = must(timedSets[0]);
          await db
            .update(workoutSets)
            .set({
              status: 'completed',
              actualDurationSeconds: 55,
              completedAt: new Date(),
            })
            .where(eq(workoutSets.id, timedSet.id));
          const result = must(
            (
              await db
                .select()
                .from(workoutSets)
                .where(eq(workoutSets.id, timedSet.id))
            )[0],
          );
          assert.equal(result.targetDurationSeconds, 60);
          assert.equal(result.actualDurationSeconds, 55);
          assert.equal(result.actualReps, null);
        },
      );
      await stage(
        'SQL CHECK, FK and ordering constraints reject invalid records',
        async () => {
          for (const patch of [
            { targetSets: 0 },
            { targetReps: -1 },
            { targetReps: null, targetRepMin: 12, targetRepMax: 8 },
            { targetReps: null, targetDurationSeconds: 0 },
            { targetLoadKg: '-1.00' },
            { targetRpe: '10.1' },
            { restSeconds: -1 },
            { loadMode: 'bodyweight' as const },
          ])
            await rejectsWith(
              db
                .update(programExercises)
                .set(patch)
                .where(eq(programExercises.id, prescription.id)),
              '23514',
            );
          await rejectsWith(
            db.insert(programDays).values({
              programId: program.id,
              name: 'duplicate',
              position: 0,
            }),
            '23505',
          );
          await rejectsWith(
            db
              .insert(programDays)
              .values({ programId: randomUUID(), name: 'orphan', position: 0 }),
            '23503',
          );
          await rejectsWith(
            db
              .insert(exercises)
              .values({ canonicalName: 'invalid-owner', isCustom: true }),
            '23514',
          );
          await rejectsWith(
            db.insert(workoutSets).values({
              workoutExerciseId: workoutExercise.id,
              setNumber: 99,
              actualLoadKg: '1.25',
              actualAssistanceKg: '2.50',
            }),
            '23514',
          );
        },
      );
      await stage(
        'HTTP transaction rolls back all writes on constraint failure',
        async () => {
          await rejectsWith(
            client.sqlClient.transaction([
              client.sqlClient.query(
                'INSERT INTO users (id, display_name) VALUES ($1, $2)',
                [rollbackUserId, `${label}_rollback`],
              ),
              client.sqlClient.query(
                'INSERT INTO programs (user_id, name) VALUES ($1, $2)',
                [rollbackUserId, ''],
              ),
            ]),
            '23514',
          );
          assert.equal(
            (await db.select().from(users).where(eq(users.id, rollbackUserId)))
              .length,
            0,
          );
        },
      );
      await stage(
        'updated_at is maintained for direct SQL writes',
        async () => {
          await db.execute(
            sql`UPDATE programs SET description = 'test audit trigger' WHERE id = ${program.id}`,
          );
          const updated = must(
            (
              await db
                .select()
                .from(programs)
                .where(eq(programs.id, program.id))
            )[0],
          );
          assert.ok(updated.updatedAt > program.updatedAt);
        },
      );
      await stage(
        'program deletion preserves workouts and clears only provenance links',
        async () => {
          await db.delete(programs).where(eq(programs.id, program.id));
          const history = must(
            await db.query.workoutSessions.findFirst({
              where: eq(workoutSessions.id, session.id),
              with: { workoutExercises: { with: { sets: true } } },
            }),
          );
          assert.equal(history.programId, null);
          assert.equal(history.programDayId, null);
          assert.equal(history.workoutExercises.length, 3);
          assert.ok(
            history.workoutExercises.every(
              (entry) =>
                entry.programExerciseId === null && entry.sets.length === 3,
            ),
          );
          await rejectsWith(
            db.delete(exercises).where(eq(exercises.id, pullUp.id)),
            '23001',
          );
        },
      );
      await stage(
        'session deletion cascades to exercises and sets; free sessions work',
        async () => {
          await db
            .delete(workoutSessions)
            .where(eq(workoutSessions.id, session.id));
          assert.equal(
            (
              await db
                .select()
                .from(workoutExercises)
                .where(eq(workoutExercises.workoutSessionId, session.id))
            ).length,
            0,
          );
          assert.equal(
            (
              await db
                .select()
                .from(workoutSets)
                .where(eq(workoutSets.workoutExerciseId, workoutExercise.id))
            ).length,
            0,
          );
          const free = must(
            (
              await db
                .insert(workoutSessions)
                .values({ userId, name: `${label} Free` })
                .returning()
            )[0],
          );
          assert.equal(free.programId, null);
          assert.equal(free.programDayId, null);
        },
      );
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error;
      throw new Error(
        `Neon integration setup failed: ${JSON.stringify(safeDatabaseError(error))}`,
      );
    } finally {
      try {
        if (verified) {
          await db
            .delete(workoutSessions)
            .where(eq(workoutSessions.userId, userId));
          await db.delete(programs).where(eq(programs.userId, userId));
          await db
            .delete(exercises)
            .where(eq(exercises.createdByUserId, userId));
          await db.delete(users).where(eq(users.id, userId));
          await db.delete(users).where(eq(users.id, rollbackUserId));
          assert.equal(
            (await db.select().from(users).where(eq(users.id, userId))).length,
            0,
          );
        }
      } catch (error) {
        throw new Error(
          `Isolated test cleanup failed: ${JSON.stringify(safeDatabaseError(error))}`,
        );
      } finally {
        await client.close();
      }
    }
  },
);

import { saveSetSql, skipSetSql, finishWorkoutSql } from './workout-write';
import { randomUUID } from 'node:crypto';
import { and, eq, desc, gte, lt, sql, getTableColumns } from 'drizzle-orm';
import {
  workoutSessions,
  workoutExercises,
  workoutSets,
  type DatabaseClient,
} from '@jimo/database';
import {
  actualFor,
  type ActualInput,
  type WorkoutDetail,
  type WorkoutSummary,
  type workoutHistoryQuerySchema,
} from '@jimo/schemas';
import type { z } from 'zod';
import { ApiError } from './errors';
const missing = (): never => {
  throw new ApiError(404, 'WORKOUT_NOT_FOUND', 'Workout not found');
};
const conflict = (): never => {
  throw new ApiError(
    409,
    'WORKOUT_STATE_CONFLICT',
    'Workout state has changed',
  );
};
const stamp = (row: { createdAt: Date; updatedAt: Date }) => ({
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
export class WorkoutService {
  private db;
  constructor(private client: DatabaseClient) {
    this.db = client.db;
  }
  private lock(userId: string) {
    return this.client.sqlClient.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 5))',
      [userId],
    );
  }
  async start(
    userId: string,
    dayId: string,
    locale: string,
  ): Promise<WorkoutDetail> {
    const id = randomUUID(),
      q = this.client.sqlClient.query;
    // HTTP has no interactive transactions. All snapshot writes are one SQL CTE,
    // preceded by a per-user lock in the same non-interactive transaction.
    const result = await this.client.sqlClient.transaction([
      this.lock(userId),
      q(
        `WITH source AS MATERIALIZED (
        SELECT pe.*, e.canonical_name, e.is_custom, e.tracking_mode,
          coalesce(et.name,e.canonical_name) AS localized_name,
          d.name AS day_name, p.id AS program_id
        FROM program_exercises pe JOIN program_days d ON d.id=pe.program_day_id
        JOIN programs p ON p.id=d.program_id JOIN exercises e ON e.id=pe.exercise_id
        LEFT JOIN exercise_translations et ON et.exercise_id=e.id AND et.locale=$4
        WHERE d.id=$2::uuid AND p.user_id=$1::uuid AND p.status='active'
          AND (NOT e.is_custom OR e.created_by_user_id=$1::uuid)
      ), session AS (
        INSERT INTO workout_sessions(id,user_id,program_id,program_day_id,name)
        SELECT $3::uuid,$1::uuid,program_id,$2::uuid,day_name FROM source LIMIT 1
        ON CONFLICT (user_id) WHERE status='in_progress' DO NOTHING RETURNING id
      ), snapshot AS (
        INSERT INTO workout_exercises(workout_session_id,program_exercise_id,exercise_id,position,
          exercise_name_snapshot,tracking_mode_snapshot,load_mode_snapshot,rest_seconds_snapshot,notes)
        SELECT session.id,source.id,exercise_id,position,
          CASE WHEN is_custom THEN canonical_name ELSE localized_name END, tracking_mode,load_mode,rest_seconds,notes
        FROM source CROSS JOIN session RETURNING id,program_exercise_id
      ), sets AS (
        INSERT INTO workout_sets(workout_exercise_id,set_number,status,target_reps,target_rep_min,target_rep_max,
          target_duration_seconds,target_load_kg,target_assistance_kg,target_rpe)
        SELECT snapshot.id,n,'pending',target_reps,target_rep_min,target_rep_max,target_duration_seconds,
          target_load_kg,target_assistance_kg,target_rpe
        FROM snapshot JOIN source ON source.id=snapshot.program_exercise_id
        CROSS JOIN LATERAL generate_series(1,source.target_sets) n RETURNING id
      ) SELECT session.id, (SELECT count(*) FROM sets) AS sets_count FROM session`,
        [userId, dayId, id, locale],
      ),
      q(
        "SELECT id FROM workout_sessions WHERE user_id=$1::uuid AND status='in_progress'",
        [userId],
      ),
      q(
        `SELECT p.status, (SELECT count(*)::int FROM program_exercises pe WHERE pe.program_day_id=d.id) AS exercises_count
         FROM program_days d JOIN programs p ON p.id=d.program_id WHERE d.id=$2::uuid AND p.user_id=$1::uuid`,
        [userId, dayId],
      ),
    ]);
    if (result[1]?.length) return this.detail(userId, id);
    const active = result[2]?.[0];
    if (active)
      throw new ApiError(
        409,
        'ACTIVE_WORKOUT_EXISTS',
        'An active workout already exists',
        { sessionId: String(active.id) },
      );
    if (!result[3]?.length) return missing();
    if (result[3][0]?.status !== 'active')
      throw new ApiError(
        409,
        'PROGRAM_NOT_ACTIVE',
        'Activate the program before starting',
      );
    throw new ApiError(409, 'EMPTY_WORKOUT', 'Add exercises before starting');
  }
  private fields() {
    const sessionId = sql.raw('"workout_sessions"."id"');
    return {
      ...getTableColumns(workoutSessions),
      syncSequence: sql<number>`(SELECT coalesce(max(sequence),0)::int FROM sync_operations WHERE session_id=${sessionId})`,
      exercisesCount: sql<number>`(SELECT count(*)::int FROM workout_exercises e WHERE e.workout_session_id=${sessionId})`,
      completedSets: sql<number>`(SELECT count(*)::int FROM workout_sets s JOIN workout_exercises e ON e.id=s.workout_exercise_id WHERE e.workout_session_id=${sessionId} AND s.status='completed')`,
      skippedSets: sql<number>`(SELECT count(*)::int FROM workout_sets s JOIN workout_exercises e ON e.id=s.workout_exercise_id WHERE e.workout_session_id=${sessionId} AND s.status='skipped')`,
      pendingSets: sql<number>`(SELECT count(*)::int FROM workout_sets s JOIN workout_exercises e ON e.id=s.workout_exercise_id WHERE e.workout_session_id=${sessionId} AND s.status='pending')`,
    };
  }
  private summary(
    row: typeof workoutSessions.$inferSelect & {
      exercisesCount: number;
      completedSets: number;
      skippedSets: number;
      pendingSets: number;
    },
  ): WorkoutSummary {
    const { userId: _userId, startedAt, completedAt, ...rest } = row;
    return {
      ...rest,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt?.toISOString() ?? null,
      ...stamp(row),
    };
  }
  async active(userId: string) {
    const [row] = await this.db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.status, 'in_progress'),
        ),
      );
    return { workout: row ? await this.detail(userId, row.id) : null };
  }
  async history(
    userId: string,
    input: z.infer<typeof workoutHistoryQuerySchema>,
  ) {
    const dateField =
      input.dateField === 'completed'
        ? workoutSessions.completedAt
        : workoutSessions.startedAt;
    const rows = await this.db
      .select(this.fields())
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          input.status !== 'all'
            ? eq(workoutSessions.status, input.status)
            : undefined,
          input.cursorAt && input.cursorId
            ? sql`(${workoutSessions.startedAt},${workoutSessions.id}) < (${input.cursorAt}::timestamptz,${input.cursorId}::uuid)`
            : undefined,
          sql`${workoutSessions.status} <> 'in_progress'`,
          input.since ? gte(dateField, new Date(input.since)) : undefined,
          input.until ? lt(dateField, new Date(input.until)) : undefined,
        ),
      )
      .orderBy(desc(workoutSessions.startedAt), desc(workoutSessions.id))
      .limit(input.limit + 1);
    const visible = rows.slice(0, input.limit),
      last = visible.at(-1);
    return {
      workouts: visible.map((r) => this.summary(r)),
      nextCursor:
        rows.length > input.limit && last
          ? { startedAt: last.startedAt.toISOString(), id: last.id }
          : null,
    };
  }
  async detail(userId: string, id: string): Promise<WorkoutDetail> {
    const [row] = await this.db
      .select(this.fields())
      .from(workoutSessions)
      .where(
        and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)),
      );
    if (!row) return missing();
    const exercises = await this.db
      .select(getTableColumns(workoutExercises))
      .from(workoutExercises)
      .innerJoin(
        workoutSessions,
        eq(workoutSessions.id, workoutExercises.workoutSessionId),
      )
      .where(
        and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)),
      )
      .orderBy(workoutExercises.position);
    const sets = await this.db
      .select(getTableColumns(workoutSets))
      .from(workoutSets)
      .innerJoin(
        workoutExercises,
        eq(workoutSets.workoutExerciseId, workoutExercises.id),
      )
      .innerJoin(
        workoutSessions,
        eq(workoutSessions.id, workoutExercises.workoutSessionId),
      )
      .where(
        and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)),
      )
      .orderBy(workoutSets.setNumber);
    return {
      ...this.summary(row),
      exercises: exercises.map((e) => ({
        ...e,
        ...stamp(e),
        sets: sets
          .filter((s) => s.workoutExerciseId === e.id)
          .map((s) => ({
            ...s,
            ...stamp(s),
            completedAt: s.completedAt?.toISOString() ?? null,
          })),
      })),
    };
  }
  private async set(userId: string, id: string) {
    const [row] = await this.db
      .select({
        sessionId: workoutSessions.id,
        exercise: getTableColumns(workoutExercises),
      })
      .from(workoutSets)
      .innerJoin(
        workoutExercises,
        eq(workoutSets.workoutExerciseId, workoutExercises.id),
      )
      .innerJoin(
        workoutSessions,
        eq(workoutSessions.id, workoutExercises.workoutSessionId),
      )
      .where(and(eq(workoutSets.id, id), eq(workoutSessions.userId, userId)));
    if (!row) return missing();
    return row;
  }
  async saveSet(
    userId: string,
    id: string,
    input: ActualInput,
    correction = false,
  ) {
    const context = await this.set(userId, id),
      actual = actualFor(context.exercise).parse(input),
      q = this.client.sqlClient.query;
    const result = await this.client.sqlClient.transaction([
      this.lock(userId),
      q(saveSetSql(), [
        userId,
        id,
        actual.actualReps,
        actual.actualDurationSeconds,
        actual.actualLoadKg,
        actual.actualAssistanceKg,
        actual.actualRpe,
        correction,
      ]),
      q(
        `SELECT s.status,w.status AS workout_status FROM workout_sets s JOIN workout_exercises e ON e.id=s.workout_exercise_id
          JOIN workout_sessions w ON w.id=e.workout_session_id WHERE s.id=$2::uuid AND w.user_id=$1::uuid`,
        [userId, id],
      ),
    ]);
    if (
      !result[1]?.length &&
      (correction ||
        result[2]?.[0]?.status !== 'completed' ||
        result[2]?.[0]?.workout_status === 'cancelled')
    )
      return conflict();
    // A repeated POST acknowledges the first write and preserves completedAt.
    return this.detail(userId, context.sessionId);
  }
  async skip(userId: string, id: string) {
    const context = await this.set(userId, id),
      q = this.client.sqlClient.query;
    const result = await this.client.sqlClient.transaction([
      this.lock(userId),
      q(skipSetSql(), [userId, id]),
      q(
        `SELECT s.status FROM workout_sets s JOIN workout_exercises e ON e.id=s.workout_exercise_id
          JOIN workout_sessions w ON w.id=e.workout_session_id WHERE s.id=$2::uuid AND w.user_id=$1::uuid`,
        [userId, id],
      ),
    ]);
    if (!result[1]?.length && result[2]?.[0]?.status !== 'skipped')
      return conflict();
    return this.detail(userId, context.sessionId);
  }
  async finish(
    userId: string,
    id: string,
    skipPending: boolean,
    cancel = false,
  ) {
    await this.detail(userId, id); // identical 404 for unknown and foreign sessions
    const q = this.client.sqlClient.query;
    const result = await this.client.sqlClient.transaction([
      this.lock(userId),
      q(finishWorkoutSql(), [
        userId,
        id,
        skipPending || cancel,
        cancel ? 'cancelled' : 'completed',
      ]),
      q(
        'SELECT status FROM workout_sessions WHERE id=$2::uuid AND user_id=$1::uuid',
        [userId, id],
      ),
    ]);
    if (
      !result[1]?.length &&
      result[2]?.[0]?.status !== (cancel ? 'cancelled' : 'completed')
    ) {
      if (result[2]?.[0]?.status === 'in_progress')
        throw new ApiError(
          409,
          'PENDING_SETS_EXIST',
          'Confirm skipping pending sets',
        );
      return conflict();
    }
    return this.detail(userId, id);
  }
}

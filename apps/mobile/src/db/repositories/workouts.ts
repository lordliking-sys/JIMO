import {
  actualFor,
  workoutDetailSchema,
  offlineSnapshotSchema,
  type ActualInput,
  type WorkoutDetail,
  type WorkoutSummary,
  type ProgramDetail,
  type WorkoutOperation,
} from '@jimo/schemas';
import type { LocalDatabase, SqlExecutor } from '../database';
import { enqueue } from './outbox';
export class LocalSaveError extends Error {
  constructor() {
    super('LOCAL_SAVE_FAILED');
  }
}
export class LocalWorkoutConflict extends Error {
  constructor(public sessionId?: string) {
    super('ACTIVE_WORKOUT_EXISTS');
  }
}
export function recount(w: WorkoutDetail): WorkoutDetail {
  const sets = w.exercises.flatMap((e) => e.sets);
  return {
    ...w,
    exercisesCount: w.exercises.length,
    completedSets: sets.filter((s) => s.status === 'completed').length,
    skippedSets: sets.filter((s) => s.status === 'skipped').length,
    pendingSets: sets.filter((s) => s.status === 'pending').length,
  };
}
export function makeLocalWorkout(
  p: ProgramDetail,
  dayId: string,
  uuid: () => string,
  time: string,
): WorkoutDetail {
  const day = p.days.find((d) => d.id === dayId);
  if (!day || !day.exercises.length) throw new Error('PROGRAM_NOT_CACHED');
  const audit = { createdAt: time, updatedAt: time };
  return workoutDetailSchema.parse(
    recount({
      id: uuid(),
      programId: p.id,
      programDayId: day.id,
      name: day.name,
      notes: day.notes,
      status: 'in_progress',
      startedAt: time,
      completedAt: null,
      ...audit,
      exercisesCount: 0,
      completedSets: 0,
      skippedSets: 0,
      pendingSets: 0,
      exercises: day.exercises.map((e) => ({
        id: uuid(),
        exerciseId: e.exerciseId,
        programExerciseId: e.id,
        position: e.position,
        exerciseNameSnapshot: e.exercise.displayName,
        trackingModeSnapshot: e.exercise.trackingMode,
        loadModeSnapshot: e.loadMode,
        restSecondsSnapshot: e.restSeconds ?? null,
        notes: e.notes ?? null,
        ...audit,
        sets: Array.from({ length: e.targetSets }, (_, i) => ({
          id: uuid(),
          setNumber: i + 1,
          status: 'pending' as const,
          completedAt: null,
          ...audit,
          targetReps: e.targetReps ?? null,
          targetRepMin: e.targetRepMin ?? null,
          targetRepMax: e.targetRepMax ?? null,
          targetDurationSeconds: e.targetDurationSeconds ?? null,
          targetLoadKg: e.targetLoadKg ?? null,
          targetAssistanceKg: e.targetAssistanceKg ?? null,
          targetRpe: e.targetRpe ?? null,
          actualReps: null,
          actualDurationSeconds: null,
          actualLoadKg: null,
          actualAssistanceKg: null,
          actualRpe: null,
        })),
      })),
    }),
  );
}
export function snapshotOf(w: WorkoutDetail) {
  return offlineSnapshotSchema.parse({
    programId: w.programId,
    programDayId: w.programDayId,
    name: w.name,
    notes: w.notes,
    exercises: w.exercises.map(
      ({ createdAt: _c, updatedAt: _u, sets, ...e }) => ({
        ...e,
        sets: sets.map(
          ({
            id,
            setNumber,
            targetReps,
            targetRepMin,
            targetRepMax,
            targetDurationSeconds,
            targetLoadKg,
            targetAssistanceKg,
            targetRpe,
          }) => ({
            id,
            setNumber,
            targetReps,
            targetRepMin,
            targetRepMax,
            targetDurationSeconds,
            targetLoadKg,
            targetAssistanceKg,
            targetRpe,
          }),
        ),
      }),
    ),
  });
}
async function read(sql: SqlExecutor, owner: string, id: string) {
  const row = (
    await sql.all<{ payload: string }>(
      'SELECT payload FROM local_workout_sessions WHERE owner_user_id=? AND id=?',
      [owner, id],
    )
  )[0];
  if (!row) return null;
  const exercises = await sql.all<{ id: string; payload: string }>(
    'SELECT id,payload FROM local_workout_exercises WHERE owner_user_id=? AND session_id=? ORDER BY position',
    [owner, id],
  );
  const sets = await sql.all<{ exercise_id: string; payload: string }>(
    'SELECT s.exercise_id,s.payload FROM local_workout_sets s JOIN local_workout_exercises e ON e.owner_user_id=s.owner_user_id AND e.id=s.exercise_id WHERE e.owner_user_id=? AND e.session_id=? ORDER BY s.set_number',
    [owner, id],
  );
  return workoutDetailSchema.parse({
    ...JSON.parse(row.payload),
    exercises: exercises.map((e) => ({
      ...JSON.parse(e.payload),
      sets: sets
        .filter((s) => s.exercise_id === e.id)
        .map((s) => JSON.parse(s.payload)),
    })),
  });
}
async function store(sql: SqlExecutor, owner: string, w: WorkoutDetail) {
  const { exercises, ...summary } = w;
  await sql.run(
    'INSERT INTO local_workout_sessions VALUES(?,?,?,?,?,?) ON CONFLICT(owner_user_id,id) DO UPDATE SET status=excluded.status,started_at=excluded.started_at,completed_at=excluded.completed_at,payload=excluded.payload',
    [
      owner,
      w.id,
      w.status,
      w.startedAt,
      w.completedAt,
      JSON.stringify(summary),
    ],
  );
  for (const e of exercises) {
    const { sets, ...exercise } = e;
    await sql.run(
      'INSERT INTO local_workout_exercises VALUES(?,?,?,?,?) ON CONFLICT(owner_user_id,id) DO UPDATE SET payload=excluded.payload',
      [owner, e.id, w.id, e.position, JSON.stringify(exercise)],
    );
    for (const s of sets)
      await sql.run(
        'INSERT INTO local_workout_sets VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_user_id,id) DO UPDATE SET status=excluded.status,completed_at=excluded.completed_at,actual_load_kg=excluded.actual_load_kg,actual_assistance_kg=excluded.actual_assistance_kg,actual_rpe=excluded.actual_rpe,payload=excluded.payload',
        [
          owner,
          s.id,
          e.id,
          s.setNumber,
          s.status,
          s.completedAt,
          s.targetLoadKg,
          s.targetAssistanceKg,
          s.targetRpe,
          s.actualLoadKg,
          s.actualAssistanceKg,
          s.actualRpe,
          JSON.stringify(s),
        ],
      );
  }
}
export class WorkoutLocalRepository {
  constructor(
    private db: LocalDatabase,
    private uuid: () => string,
    private clock: () => string = () => new Date().toISOString(),
  ) {}
  detail(owner: string, id: string) {
    return this.db.access((sql) => read(sql, owner, id));
  }
  active(owner: string) {
    return this.db.access(async (sql) => {
      const row = (
        await sql.all<{ id: string }>(
          "SELECT id FROM local_workout_sessions WHERE owner_user_id=? AND status='in_progress'",
          [owner],
        )
      )[0];
      return row ? read(sql, owner, row.id) : null;
    });
  }
  history(
    owner: string,
    since?: string,
    until?: string,
    dateField: 'started' | 'completed' = 'started',
  ) {
    const dateColumn =
      dateField === 'completed' ? 'completed_at' : 'started_at';
    return this.db.access(async (sql) => {
      const rows = await sql.all<{ payload: string }>(
        `SELECT payload FROM local_workout_sessions WHERE owner_user_id=? AND status<>'in_progress' AND (? IS NULL OR ${dateColumn}>=?) AND (? IS NULL OR ${dateColumn}<?) ORDER BY started_at DESC LIMIT 100`,
        [owner, since ?? null, since ?? null, until ?? null, until ?? null],
      );
      return rows.map((r) => JSON.parse(r.payload) as WorkoutSummary);
    });
  }
  async import(owner: string, input: WorkoutDetail) {
    const w = workoutDetailSchema.parse(input);
    return this.db.transaction(async (sql) => {
      const pending = await sql.all(
        'SELECT 1 FROM sync_outbox WHERE owner_user_id=? AND session_id=? LIMIT 1',
        [owner, w.id],
      );
      if (pending.length) return false;
      if (w.status === 'in_progress') {
        const other = await sql.all<{ id: string }>(
          "SELECT id FROM local_workout_sessions WHERE owner_user_id=? AND status='in_progress' AND id<>?",
          [owner, w.id],
        );
        if (other.length) {
          await sql.run(
            'INSERT INTO sync_metadata VALUES(?,?,?) ON CONFLICT(owner_user_id,key) DO UPDATE SET value=excluded.value',
            [owner, 'activeConflict', other[0]!.id],
          );
          return false;
        }
      }
      await store(sql, owner, w);
      const key = `sequence:${w.id}`,
        sequence = (
          await sql.all<{ value: string }>(
            'SELECT value FROM sync_metadata WHERE owner_user_id=? AND key=?',
            [owner, key],
          )
        )[0];
      await sql.run(
        'INSERT INTO sync_metadata VALUES(?,?,?) ON CONFLICT(owner_user_id,key) DO UPDATE SET value=excluded.value',
        [
          owner,
          key,
          String(Math.max(Number(sequence?.value ?? 0), w.syncSequence ?? 0)),
        ],
      );
      return true;
    });
  }
  async start(owner: string, p: ProgramDetail, dayId: string) {
    return this.write(async (sql) => {
      const active = (
        await sql.all<{ id: string }>(
          "SELECT id FROM local_workout_sessions WHERE owner_user_id=? AND status='in_progress'",
          [owner],
        )
      )[0];
      if (active) throw new LocalWorkoutConflict(active.id);
      const w = makeLocalWorkout(p, dayId, this.uuid, this.clock());
      await store(sql, owner, w);
      await enqueue(sql, owner, {
        operationId: this.uuid(),
        sessionId: w.id,
        entityId: w.id,
        operationType: 'START_WORKOUT',
        createdAt: w.startedAt,
        payload: snapshotOf(w),
      });
      return w;
    });
  }
  save(owner: string, id: string, input: ActualInput, correction = false) {
    return this.changeSet(
      owner,
      id,
      correction ? 'UPDATE_SET' : 'COMPLETE_SET',
      input,
    );
  }
  skip(owner: string, id: string) {
    return this.changeSet(owner, id, 'SKIP_SET');
  }
  private changeSet(
    owner: string,
    id: string,
    type: 'UPDATE_SET' | 'COMPLETE_SET' | 'SKIP_SET',
    input?: ActualInput,
  ) {
    return this.write(async (sql) => {
      const row = (
        await sql.all<{ session_id: string }>(
          'SELECT e.session_id FROM local_workout_sets s JOIN local_workout_exercises e ON e.id=s.exercise_id AND e.owner_user_id=s.owner_user_id WHERE s.owner_user_id=? AND s.id=?',
          [owner, id],
        )
      )[0];
      if (!row) throw new Error('LOCAL_WORKOUT_NOT_FOUND');
      const w = (await read(sql, owner, row.session_id))!,
        ex = w.exercises.find((e) => e.sets.some((s) => s.id === id))!,
        s = ex.sets.find((s) => s.id === id)!;
      if (
        type !== 'UPDATE_SET' &&
        s.status === (type === 'SKIP_SET' ? 'skipped' : 'completed')
      )
        return w;
      if (
        type === 'UPDATE_SET'
          ? s.status !== 'completed' || w.status === 'cancelled'
          : s.status !== 'pending' || w.status !== 'in_progress'
      )
        throw new Error('WORKOUT_STATE_CONFLICT');
      const now = this.clock();
      const actual =
        type === 'SKIP_SET' ? undefined : actualFor(ex).parse(input);
      if (actual) Object.assign(s, actual);
      s.status = type === 'SKIP_SET' ? 'skipped' : 'completed';
      s.updatedAt = now;
      if (type === 'COMPLETE_SET') s.completedAt = now;
      w.updatedAt = now;
      const updated = recount(w);
      await store(sql, owner, updated);
      await enqueue(sql, owner, {
        operationId: this.uuid(),
        sessionId: w.id,
        entityId: id,
        operationType: type,
        createdAt: now,
        payload: actual ?? {},
      } as Omit<WorkoutOperation, 'sequence'>);
      return updated;
    });
  }
  finish(owner: string, id: string, skipPending = false, cancel = false) {
    return this.write(async (sql) => {
      const w = await read(sql, owner, id);
      if (!w) throw new Error('LOCAL_WORKOUT_NOT_FOUND');
      const status = cancel ? 'cancelled' : 'completed';
      if (w.status === status) return w;
      if (w.status !== 'in_progress') throw new Error('WORKOUT_STATE_CONFLICT');
      if (w.pendingSets > 0 && !skipPending && !cancel)
        throw new Error('PENDING_SETS_EXIST');
      const now = this.clock();
      for (const e of w.exercises)
        for (const s of e.sets)
          if (s.status === 'pending') {
            s.status = 'skipped';
            s.updatedAt = now;
          }
      w.status = status;
      w.completedAt = now;
      w.updatedAt = now;
      const updated = recount(w);
      await store(sql, owner, updated);
      await enqueue(sql, owner, {
        operationId: this.uuid(),
        sessionId: id,
        entityId: id,
        createdAt: now,
        ...(cancel
          ? { operationType: 'CANCEL_WORKOUT', payload: {} }
          : { operationType: 'COMPLETE_WORKOUT', payload: { skipPending } }),
      });
      return updated;
    });
  }
  private async write<T>(fn: (sql: SqlExecutor) => Promise<T>) {
    try {
      return await this.db.transaction(fn);
    } catch (e) {
      if (
        e instanceof LocalWorkoutConflict ||
        (e instanceof Error &&
          [
            'LOCAL_WORKOUT_NOT_FOUND',
            'WORKOUT_STATE_CONFLICT',
            'PENDING_SETS_EXIST',
            'PROGRAM_NOT_CACHED',
          ].includes(e.message))
      )
        throw e;
      throw new LocalSaveError();
    }
  }
}

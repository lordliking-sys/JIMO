import { createHash } from 'node:crypto';
import {
  actualFor,
  type WorkoutOperation,
  type SyncResponse,
} from '@jimo/schemas';
import { safeDatabaseError, type DatabaseClient } from '@jimo/database';
import { ApiError } from './errors';
import { WorkoutService } from './workout-service';
import { saveSetSql, skipSetSql, finishWorkoutSql } from './workout-write';
const stateConflict = () =>
  new ApiError(
    409,
    'WORKOUT_SYNC_CONFLICT',
    'Workout synchronization conflict',
  );
export class WorkoutSyncService {
  private workouts;
  constructor(private client: DatabaseClient) {
    this.workouts = new WorkoutService(client);
  }
  async identity(userId: string) {
    return { userId };
  }
  async process(
    userId: string,
    operations: WorkoutOperation[],
  ): Promise<SyncResponse> {
    const response: SyncResponse = { acknowledged: [], failed: [] },
      blocked = new Set<string>();
    for (const operation of operations) {
      if (blocked.has(operation.sessionId)) continue;
      try {
        await this.apply(userId, operation);
        response.acknowledged.push(operation.operationId);
      } catch (error) {
        const status = error instanceof ApiError ? error.status : 400;
        const validation = error instanceof Error && error.name === 'ZodError';
        const safe = safeDatabaseError(error);
        const retry =
          !(error instanceof ApiError) &&
          !validation &&
          safe.code !== '23505' &&
          safe.code !== '23503' &&
          safe.code !== '23514';
        response.failed.push({
          operationId: operation.operationId,
          sessionId: operation.sessionId,
          status: retry
            ? 'retry'
            : status === 409 || safe.code === '23505'
              ? 'conflict'
              : 'failed',
          code:
            error instanceof ApiError
              ? error.code
              : validation
                ? 'VALIDATION_ERROR'
                : retry
                  ? 'SYNC_UNAVAILABLE'
                  : 'INVALID_SNAPSHOT',
        });
        blocked.add(operation.sessionId);
      }
    }
    return response;
  }
  private async apply(userId: string, o: WorkoutOperation) {
    const q = this.client.sqlClient.query;
    const hash = createHash('sha256').update(JSON.stringify(o)).digest('hex');
    const prior = await q(
      'SELECT payload_hash FROM sync_operations WHERE user_id=$1::uuid AND operation_id=$2::uuid',
      [userId, o.operationId],
    );
    if (prior[0]) {
      if (prior[0].payload_hash !== hash) throw stateConflict();
      return;
    }
    if (Date.parse(o.createdAt) > Date.now() + 300_000)
      throw new ApiError(
        400,
        'INVALID_EVENT_TIME',
        'Event time is too far in the future',
      );
    // A receipt gates every write inside the SAME locked HTTP transaction.
    // No interval exists in which a committed mutation lacks its receipt.
    const base: unknown[] = [userId];
    const bind = (value: unknown) => {
      base.push(value);
      return `$${base.length}`;
    };
    const entity = bind(o.entityId),
      operation = bind(o.operationId),
      session = bind(o.sessionId),
      sequence = bind(o.sequence),
      type = bind(o.operationType),
      digest = bind(hash),
      at = bind(o.createdAt);
    const gate = `NOT EXISTS(SELECT 1 FROM sync_operations WHERE user_id=$1::uuid AND operation_id=${operation}::uuid)
   AND ${at}::timestamptz <= now()+interval '5 minutes'
   AND ${sequence}::integer=coalesce((SELECT max(sequence) FROM sync_operations WHERE user_id=$1::uuid AND session_id=${session}::uuid),0)+1`;
    let changed: string;
    if (o.operationType === 'START_WORKOUT') {
      const snap = bind(JSON.stringify(o.payload));
      changed = `WITH payload AS (SELECT ${snap}::jsonb AS j),
    source AS MATERIALIZED (SELECT j FROM payload WHERE (${gate})
     AND EXISTS(SELECT 1 FROM programs p JOIN program_days d ON d.program_id=p.id
      WHERE p.id=(j->>'programId')::uuid AND d.id=(j->>'programDayId')::uuid AND p.user_id=$1::uuid AND p.status='active')
     AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(j->'exercises') x
      WHERE NOT EXISTS(SELECT 1 FROM exercises e WHERE e.id=(x->>'exerciseId')::uuid
       AND e.tracking_mode::text=x->>'trackingModeSnapshot' AND (NOT e.is_custom OR e.created_by_user_id=$1::uuid))
       OR (x->>'programExerciseId' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM program_exercises pe
        WHERE pe.id=(x->>'programExerciseId')::uuid AND pe.program_day_id=(j->>'programDayId')::uuid AND pe.exercise_id=(x->>'exerciseId')::uuid)))
     AND NOT EXISTS(SELECT 1 FROM workout_sessions WHERE user_id=$1::uuid AND status='in_progress')),
    session AS (INSERT INTO workout_sessions(id,user_id,program_id,program_day_id,name,notes,started_at)
     SELECT ${session}::uuid,$1::uuid,(j->>'programId')::uuid,(j->>'programDayId')::uuid,j->>'name',j->>'notes',${at}::timestamptz FROM source RETURNING id),
    snapshots AS (INSERT INTO workout_exercises(id,workout_session_id,program_exercise_id,exercise_id,position,exercise_name_snapshot,tracking_mode_snapshot,load_mode_snapshot,rest_seconds_snapshot,notes)
     SELECT (x->>'id')::uuid,session.id,(x->>'programExerciseId')::uuid,(x->>'exerciseId')::uuid,(x->>'position')::int,
      x->>'exerciseNameSnapshot',(x->>'trackingModeSnapshot')::tracking_mode,(x->>'loadModeSnapshot')::load_mode,(x->>'restSecondsSnapshot')::int,x->>'notes'
     FROM source CROSS JOIN session CROSS JOIN LATERAL jsonb_array_elements(j->'exercises') x RETURNING id),
    sets AS (INSERT INTO workout_sets(id,workout_exercise_id,set_number,target_reps,target_rep_min,target_rep_max,target_duration_seconds,target_load_kg,target_assistance_kg,target_rpe)
     SELECT (s->>'id')::uuid,snapshots.id,(s->>'setNumber')::int,(s->>'targetReps')::int,(s->>'targetRepMin')::int,(s->>'targetRepMax')::int,
      (s->>'targetDurationSeconds')::int,(s->>'targetLoadKg')::numeric,(s->>'targetAssistanceKg')::numeric,(s->>'targetRpe')::numeric
     FROM source CROSS JOIN LATERAL jsonb_array_elements(j->'exercises') x JOIN snapshots ON snapshots.id=(x->>'id')::uuid
      CROSS JOIN LATERAL jsonb_array_elements(x->'sets') s RETURNING id)
    SELECT session.id FROM session WHERE (SELECT count(*) FROM sets)>0`;
    } else {
      const detail = await this.workouts.detail(userId, o.sessionId);
      if (Date.parse(o.createdAt) < Date.parse(detail.startedAt))
        throw new ApiError(400, 'INVALID_EVENT_TIME', 'Event precedes workout');
      const sessionGate = `(${gate}) AND w.id=${session}::uuid`;
      if (
        o.operationType === 'COMPLETE_SET' ||
        o.operationType === 'UPDATE_SET'
      ) {
        const ex = detail.exercises.find((e) =>
          e.sets.some((s) => s.id === o.entityId),
        );
        if (!ex)
          throw new ApiError(404, 'WORKOUT_NOT_FOUND', 'Workout not found');
        const actual = actualFor(ex).parse(o.payload);
        const set = ex.sets.find((s) => s.id === o.entityId)!;
        if (
          set.completedAt &&
          Date.parse(o.createdAt) < Date.parse(set.completedAt)
        )
          throw new ApiError(
            400,
            'INVALID_EVENT_TIME',
            'Correction precedes completion',
          );
        // The shared writer uses fixed $1..$8. Remap placeholders to this envelope.
        const params = [
          entity,
          bind(actual.actualReps),
          bind(actual.actualDurationSeconds),
          bind(actual.actualLoadKg),
          bind(actual.actualAssistanceKg),
          bind(actual.actualRpe),
          bind(o.operationType === 'UPDATE_SET'),
        ];
        changed = saveSetSql('SYNC_GATE', 'SYNC_TIMESTAMP')
          .replace(/\$([2-8])(?!\d)/g, (_, n: string) => params[Number(n) - 2]!)
          .replace('SYNC_GATE', sessionGate)
          .replace('SYNC_TIMESTAMP', at + '::timestamptz');
      } else if (o.operationType === 'SKIP_SET') {
        changed = skipSetSql('SYNC_GATE')
          .replace(/\$2(?!\d)/g, entity)
          .replace('SYNC_GATE', sessionGate);
      } else {
        if (
          detail.exercises.some((e) =>
            e.sets.some(
              (s) =>
                s.completedAt &&
                Date.parse(s.completedAt) > Date.parse(o.createdAt),
            ),
          )
        )
          throw new ApiError(
            400,
            'INVALID_EVENT_TIME',
            'Finish precedes completed sets',
          );
        const skip = bind(
            o.operationType === 'CANCEL_WORKOUT' || o.payload.skipPending,
          ),
          status = bind(
            o.operationType === 'CANCEL_WORKOUT' ? 'cancelled' : 'completed',
          );
        changed = finishWorkoutSql('SYNC_GATE', at + '::timestamptz')
          .replace(
            /\$([2-4])(?!\d)/g,
            (_, n: string) => [entity, skip, status][Number(n) - 2]!,
          )
          .replaceAll('SYNC_GATE', sessionGate);
      }
    }
    // PostgreSQL requires all data-modifying CTEs at the outermost WITH level.
    let prefix = '';
    if (changed.startsWith('WITH ')) {
      const marker =
        o.operationType === 'START_WORKOUT'
          ? 'SELECT session.id FROM session WHERE'
          : 'UPDATE workout_sessions w SET';
      const boundary = changed.lastIndexOf(marker);
      prefix = changed.slice(5, boundary).trim() + ', ';
      changed = changed.slice(boundary);
    }
    const results = await this.client.sqlClient.transaction([
      q('SELECT pg_advisory_xact_lock(hashtextextended($1::text,5))', [userId]),
      q(
        `WITH ${prefix}changed AS (${changed}) INSERT INTO sync_operations(operation_id,user_id,session_id,entity_id,sequence,operation_type,payload_hash)
      SELECT ${operation}::uuid,$1::uuid,${session}::uuid,${entity}::uuid,${sequence}::integer,${type}::text,${digest}::text FROM changed RETURNING operation_id`,
        base,
      ),
      q(
        'SELECT payload_hash FROM sync_operations WHERE user_id=$1::uuid AND operation_id=$2::uuid',
        [userId, o.operationId],
      ),
    ]);
    if (results[2]?.[0]?.payload_hash !== hash) throw stateConflict();
  }
}

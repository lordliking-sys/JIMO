import { z } from 'zod';
import type { DatabaseClient } from '@jimo/database';
import {
  progressPeriodSchema,
  progressSummarySchema,
  progressWeeklySchema,
  progressRecordsSchema,
  progressExercisesSchema,
  progressExerciseDetailSchema,
  workoutRecordsSchema,
  currentWeekAdherence,
  type ProgressQuery,
  type ProgressPeriod,
  type progressListQuerySchema,
} from '@jimo/schemas';
import { ApiError } from './errors';
export function sessionFrequency(
  completedWorkouts: number,
  effectiveWeeks: number,
) {
  if (
    !Number.isInteger(completedWorkouts) ||
    completedWorkouts < 0 ||
    !Number.isFinite(effectiveWeeks) ||
    effectiveWeeks <= 0
  )
    throw new RangeError('INVALID_PROGRESS_PERIOD');
  return completedWorkouts / effectiveWeeks;
}
const iso = (column: string) =>
  `to_char(${column} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
/** Aggregates stay in PostgreSQL. No workout details/targets are downloaded to JS. */
export const progressSource = `WITH sessions AS MATERIALIZED (
 SELECT w.* FROM workout_sessions w WHERE w.user_id=$1::uuid AND w.status='completed'
 AND w.completed_at >= $2::timestamptz AND w.completed_at < $3::timestamptz
), actual AS MATERIALIZED (
 SELECT w.id AS session_id,w.completed_at AS session_date,e.exercise_id,e.exercise_name_snapshot,
 e.tracking_mode_snapshot AS tracking_mode,e.load_mode_snapshot AS load_mode,
 s.id AS set_id,s.set_number,s.actual_reps AS reps,s.actual_duration_seconds AS duration,
 s.actual_load_kg AS load,s.actual_assistance_kg AS assistance,s.actual_rpe AS rpe
 FROM sessions w JOIN workout_exercises e ON e.workout_session_id=w.id
 JOIN workout_sets s ON s.workout_exercise_id=e.id WHERE s.status='completed'
)`;
const nameSql = `CASE WHEN x.is_custom THEN x.canonical_name ELSE coalesce(t.name,x.canonical_name,a.exercise_name_snapshot) END`;
const nameJoins = `LEFT JOIN exercises x ON x.id=a.exercise_id
 LEFT JOIN exercise_translations t ON t.exercise_id=a.exercise_id AND t.locale=$4`;
const performance = (
  a: string,
) => `jsonb_build_object('sessionId',${a}.session_id,'date',${iso(`${a}.session_date`)},
 'trackingMode',${a}.tracking_mode,'loadMode',${a}.load_mode,'reps',${a}.reps,
 'durationSeconds',${a}.duration,'loadKg',${a}.load::text,'assistanceKg',${a}.assistance::text)`;
/** Stable ties: more reps, longer hold, earliest session, UUID. New PRs require a strict primary improvement. */
export const recordCandidates = `, candidates AS (
 SELECT a.*, 'MAX_REPS' AS type,reps::numeric AS value, false AS lower FROM actual a WHERE tracking_mode='reps' AND reps>0
 UNION ALL SELECT a.*,'MAX_LOAD',load,false FROM actual a WHERE load_mode IN ('external','weighted') AND load IS NOT NULL AND (reps>0 OR duration>0)
 UNION ALL SELECT a.*,'MAX_DURATION',duration,false FROM actual a WHERE tracking_mode='duration' AND duration>0
 UNION ALL SELECT a.*,'MIN_ASSISTANCE',assistance,true FROM actual a WHERE load_mode='assisted' AND assistance IS NOT NULL AND (reps>0 OR duration>0)
), ranked AS (
 SELECT c.*,row_number() OVER(PARTITION BY exercise_id,tracking_mode,load_mode,type
 ORDER BY CASE WHEN lower THEN -value ELSE value END DESC,reps DESC NULLS LAST,duration DESC NULLS LAST,session_date,session_id,set_id) AS rank
 FROM candidates c
)`;
const recordJson = `jsonb_build_object('type',a.type,'exerciseId',a.exercise_id,'displayName',${nameSql},
 'trackingMode',a.tracking_mode,'loadMode',a.load_mode,'value',a.value::text,'reps',a.reps,
 'durationSeconds',a.duration,'date',${iso('a.session_date')},'sessionId',a.session_id,'setId',a.set_id)`;
const modeAggregates = `count(DISTINCT session_id)::int AS sessions,count(*)::int AS completed_sets,
 sum(reps) FILTER(WHERE tracking_mode='reps')::float8 AS total_reps,
 max(reps) FILTER(WHERE tracking_mode='reps')::float8 AS max_reps,
 max(duration) FILTER(WHERE tracking_mode='duration')::float8 AS max_duration,
 avg(duration) FILTER(WHERE tracking_mode='duration')::float8 AS average_duration,
 sum(duration) FILTER(WHERE tracking_mode='duration')::float8 AS total_duration,
 max(load) FILTER(WHERE load_mode IN ('external','weighted'))::text AS max_load,
 min(assistance) FILTER(WHERE load_mode='assisted')::text AS min_assistance,
 sum(reps*load) FILTER(WHERE tracking_mode='reps' AND load_mode IN ('external','weighted'))::text AS volume,
 avg(rpe)::float8 AS average_rpe`;
const metricJson = (
  a: string,
) => `'completedSets',${a}.completed_sets,'totalReps',${a}.total_reps,'maxReps',${a}.max_reps,
 'maxDurationSeconds',${a}.max_duration,'averageDurationSeconds',${a}.average_duration,'totalDurationSeconds',${a}.total_duration,
 'maxLoadKg',${a}.max_load,'minAssistanceKg',${a}.min_assistance,'loadVolume',${a}.volume,'averageRpe',${a}.average_rpe`;
export class ProgressService {
  constructor(
    private client: DatabaseClient,
    private now = () => new Date(),
  ) {}
  private async query(sql: string, params: (string | number | null)[]) {
    const result = await this.client.sqlClient.transaction(
      [
        this.client.sqlClient.query(
          "SELECT set_config('statement_timeout','8000',true)",
        ),
        this.client.sqlClient.query(sql, params),
      ],
      { readOnly: true },
    );
    return result[1] ?? [];
  }
  private async period(
    user: string,
    input: ProgressQuery,
  ): Promise<ProgressPeriod> {
    const to = this.now().toISOString();
    const rows = await this.query(
      `WITH local AS(SELECT $3::timestamptz AT TIME ZONE $2 AS today), start AS (
 SELECT CASE $4 WHEN '4w' THEN date_trunc('day',today)-interval '27 days'
 WHEN '8w' THEN date_trunc('day',today)-interval '55 days'
 WHEN '12w' THEN date_trunc('day',today)-interval '83 days'
 WHEN '6m' THEN date_trunc('day',today)-interval '6 months'
 ELSE coalesce((SELECT date_trunc('day',min(completed_at) AT TIME ZONE $2) FROM workout_sessions WHERE user_id=$1::uuid AND status='completed' AND completed_at<$3::timestamptz),date_trunc('day',today)) END AS start,today FROM local)
 SELECT start AT TIME ZONE $2 AS from, greatest(1,extract(epoch FROM (today-start))/86400)/7 AS weeks FROM start`,
      [user, input.timeZone, to, input.range],
    );
    const row = z
      .object({
        from: z.union([z.string(), z.date()]),
        weeks: z.coerce.number(),
      })
      .parse(rows[0]);
    if (row.weeks > 5200)
      throw new ApiError(
        400,
        'PROGRESS_RANGE_TOO_LARGE',
        'Progress range exceeds 100 years',
      );
    return progressPeriodSchema.parse({
      ...input,
      from: new Date(row.from).toISOString(),
      to,
      effectiveWeeks: row.weeks,
    });
  }
  private params(user: string, period: ProgressPeriod, locale = 'en') {
    return [user, period.from, period.to, locale];
  }
  async summary(user: string, input: ProgressQuery) {
    const period = await this.period(user, input),
      p = this.params(user, period);
    const rows = await this.query(
      `${progressSource} SELECT jsonb_build_object(
 'completedWorkouts',(SELECT count(*)::int FROM sessions),
 'trainingSeconds',(SELECT sum(extract(epoch FROM(completed_at-started_at)))::float8 FROM sessions WHERE completed_at>=started_at),
 'completedSets',(SELECT count(*)::int FROM actual),
 'skippedSets',(SELECT count(*)::int FROM sessions w JOIN workout_exercises e ON e.workout_session_id=w.id JOIN workout_sets s ON s.workout_exercise_id=e.id WHERE s.status='skipped'),
 'totalReps',(SELECT sum(reps)::float8 FROM actual WHERE tracking_mode='reps'),
 'averageRpe',(SELECT avg(rpe)::float8 FROM actual)) AS payload`,
      p.slice(0, 3),
    );
    // Only the CURRENT active schedule is knowable; no invented historical adherence.
    const schedule = await this.query(
      `SELECT p.id AS program_id,d.id,d.day_of_week FROM programs p JOIN program_days d ON d.program_id=p.id WHERE p.user_id=$1::uuid AND p.status='active' ORDER BY d.position`,
      [user],
    );
    let adherence = null;
    if (schedule.length) {
      const days = z
        .array(
          z.object({
            program_id: z.uuid(),
            id: z.uuid(),
            day_of_week: z.number().nullable(),
          }),
        )
        .parse(schedule);
      if (days.every((d) => d.day_of_week !== null)) {
        const completed = await this.query(
          `SELECT id,program_id,program_day_id,${iso('completed_at')} AS completed_at FROM workout_sessions
 WHERE user_id=$1::uuid AND status='completed' AND program_id=$2::uuid
 AND completed_at>=date_trunc('week',$3::timestamptz AT TIME ZONE $4) AT TIME ZONE $4 AND completed_at<$3::timestamptz`,
          [user, days[0]!.program_id, period.to, input.timeZone],
        );
        const sessions = z
          .array(
            z.object({
              program_id: z.uuid(),
              program_day_id: z.uuid().nullable(),
              completed_at: z.string(),
            }),
          )
          .parse(completed);
        adherence = currentWeekAdherence(
          days.map((d) => ({ id: d.id, dayOfWeek: d.day_of_week })),
          sessions.map((s) => ({
            status: 'completed',
            programId: s.program_id,
            programDayId: s.program_day_id,
            completedAt: s.completed_at,
          })),
          days[0]!.program_id,
          new Date(period.to),
          input.timeZone,
        );
      }
    }
    const base = z
      .object({
        payload: z.object({ completedWorkouts: z.number() }).passthrough(),
      })
      .parse(rows[0]).payload;
    return progressSummarySchema.parse({
      ...base,
      period,
      sessionsPerWeek: sessionFrequency(
        base.completedWorkouts,
        period.effectiveWeeks,
      ),
      adherence,
    });
  }
  async weekly(user: string, input: ProgressQuery) {
    const period = await this.period(user, input);
    const rows = await this.query(
      `${progressSource}, weeks AS (
 SELECT generate_series(date_trunc('week',$2::timestamptz AT TIME ZONE $4),date_trunc('week',$3::timestamptz AT TIME ZONE $4),interval '1 week')::date AS week
 ), sessions_week AS (
 SELECT date_trunc('week',completed_at AT TIME ZONE $4)::date AS week,count(*)::int AS workouts,
 sum(extract(epoch FROM(completed_at-started_at))) FILTER(WHERE completed_at>=started_at)::float8 AS seconds FROM sessions GROUP BY 1
 ), sets_week AS (
 SELECT date_trunc('week',session_date AT TIME ZONE $4)::date AS week,count(*)::int AS sets,
 sum(reps) FILTER(WHERE tracking_mode='reps')::float8 AS reps,avg(rpe)::float8 AS rpe FROM actual GROUP BY 1
 ) SELECT jsonb_build_object('weekStart',weeks.week::text,'completedWorkouts',coalesce(w.workouts,0),
 'completedSets',coalesce(s.sets,0),'totalReps',s.reps,'averageRpe',s.rpe,'trainingSeconds',w.seconds) AS payload
 FROM weeks LEFT JOIN sessions_week w USING(week) LEFT JOIN sets_week s USING(week) ORDER BY week`,
      [user, period.from, period.to, input.timeZone],
    );
    return progressWeeklySchema.parse({
      period,
      weeks: rows.map((r) => r.payload),
    });
  }
  async records(
    user: string,
    input: ProgressQuery,
    locale: string,
    cursor?: string,
    limit = 30,
  ) {
    const period = await this.period(user, input);
    const key =
      "a.exercise_id::text||':'||a.tracking_mode::text||':'||a.load_mode::text||':'||a.type";
    const rows = await this.query(
      `${progressSource}${recordCandidates} SELECT ${recordJson} AS payload,${key} AS key
 FROM ranked a ${nameJoins} WHERE a.rank=1 AND ($5::text IS NULL OR ${key}>$5) ORDER BY ${key} LIMIT $6`,
      [...this.params(user, period, locale), cursor ?? null, limit + 1],
    );
    return progressRecordsSchema.parse({
      period,
      records: rows.slice(0, limit).map((r) => r.payload),
      nextCursor: rows.length > limit ? rows[limit - 1]?.key : null,
    });
  }
  async exercises(
    user: string,
    input: z.infer<typeof progressListQuerySchema>,
    locale: string,
  ) {
    const period = await this.period(user, input);
    const term = `%${(input.search ?? '').replace(/[\\%_]/g, '\\$&')}%`;
    const rows = await this.query(
      `${progressSource}, latest AS (
 SELECT a.*, row_number() OVER(PARTITION BY exercise_id ORDER BY session_date DESC,session_id DESC,set_number DESC,set_id) AS rank FROM actual a
 ), session_metrics AS (
 SELECT exercise_id,tracking_mode,load_mode,session_id,session_date,
 CASE WHEN tracking_mode='duration' THEN max(duration) WHEN load_mode='bodyweight' THEN max(reps) WHEN load_mode='assisted' THEN min(assistance) ELSE max(load) END AS metric
 FROM actual GROUP BY exercise_id,tracking_mode,load_mode,session_id,session_date
 ), comparisons AS (
 SELECT m.*,lag(metric) OVER(PARTITION BY exercise_id,tracking_mode,load_mode ORDER BY session_date,session_id) AS previous FROM session_metrics m
 ), totals AS(SELECT exercise_id,count(DISTINCT session_id)::int AS sessions,array_agg(DISTINCT tracking_mode) AS tracking_modes,array_agg(DISTINCT load_mode) AS load_modes FROM actual GROUP BY exercise_id)
 SELECT jsonb_build_object('id',a.exercise_id,'displayName',${nameSql},'sessions',v.sessions,
 'trackingModes',v.tracking_modes,'loadModes',v.load_modes,'latest',${performance('a')},'trend',
 CASE WHEN comparison.previous IS NULL OR comparison.metric IS NULL THEN NULL WHEN comparison.metric=comparison.previous THEN 'same'
 WHEN (comparison.metric>comparison.previous AND a.load_mode<>'assisted') OR (comparison.metric<comparison.previous AND a.load_mode='assisted' AND a.tracking_mode<>'duration') OR (comparison.metric>comparison.previous AND a.tracking_mode='duration') THEN 'up' ELSE 'down' END) AS payload
 FROM latest a JOIN totals v USING(exercise_id) LEFT JOIN comparisons comparison ON comparison.exercise_id=a.exercise_id AND comparison.tracking_mode=a.tracking_mode AND comparison.load_mode=a.load_mode AND comparison.session_id=a.session_id ${nameJoins} WHERE a.rank=1
 AND ($5::uuid IS NULL OR a.exercise_id>$5::uuid) AND ${nameSql} ILIKE $6 ESCAPE '\\'
 ORDER BY a.exercise_id LIMIT $7`,
      [
        ...this.params(user, period, locale),
        input.cursor ?? null,
        term,
        input.limit + 1,
      ],
    );
    const exercises = rows.slice(0, input.limit).map((r) => r.payload);
    return progressExercisesSchema.parse({
      period,
      exercises,
      nextCursor:
        rows.length > input.limit
          ? z.object({ id: z.uuid() }).parse(exercises.at(-1)).id
          : null,
    });
  }
  async exercise(
    user: string,
    id: string,
    input: ProgressQuery,
    locale: string,
  ) {
    const period = await this.period(user, input);
    const rows = await this.query(
      `${progressSource}, chosen AS (SELECT * FROM actual WHERE exercise_id=$5::uuid),
 modes AS(SELECT tracking_mode,load_mode,${modeAggregates} FROM chosen GROUP BY tracking_mode,load_mode),
 latest AS(SELECT a.*,row_number() OVER(PARTITION BY tracking_mode,load_mode ORDER BY session_date DESC,session_id DESC,set_number DESC,set_id) AS rank FROM chosen a),
 timeline AS(SELECT tracking_mode,load_mode,session_id,session_date,${modeAggregates} FROM chosen GROUP BY tracking_mode,load_mode,session_id,session_date),
 points AS(SELECT t.*,row_number() OVER(PARTITION BY tracking_mode,load_mode ORDER BY session_date DESC,session_id DESC) AS rank FROM timeline t)
 SELECT jsonb_build_object('trackingMode',m.tracking_mode,'loadMode',m.load_mode,'sessions',m.sessions,'sessionsPerWeek',m.sessions/$6::float8,${metricJson('m')},
 'latest',${performance('a')},'records','[]'::jsonb,'timelineTruncated',m.sessions>100,
 'timeline',(SELECT coalesce(jsonb_agg(jsonb_build_object('sessionId',t.session_id,'date',${iso('t.session_date')},${metricJson('t')}) ORDER BY t.session_date,t.session_id),'[]'::jsonb) FROM points t WHERE t.tracking_mode=m.tracking_mode AND t.load_mode=m.load_mode AND t.rank<=100)) AS payload,
 ${nameSql} AS name,(SELECT count(DISTINCT session_id)::int FROM chosen) AS sessions
 FROM modes m JOIN latest a ON a.tracking_mode=m.tracking_mode AND a.load_mode=m.load_mode AND a.rank=1 ${nameJoins} ORDER BY m.tracking_mode,m.load_mode`,
      [...this.params(user, period, locale), id, period.effectiveWeeks],
    );
    // A foreign/no-history exercise has exactly the same 404 as an unknown exercise.
    if (!rows.length) {
      const owned = await this.query(
        `SELECT 1 FROM workout_exercises e JOIN workout_sessions w ON w.id=e.workout_session_id JOIN workout_sets s ON s.workout_exercise_id=e.id WHERE w.user_id=$1::uuid AND w.status='completed' AND s.status='completed' AND e.exercise_id=$2::uuid LIMIT 1`,
        [user, id],
      );
      if (!owned.length)
        throw new ApiError(
          404,
          'PROGRESS_EXERCISE_NOT_FOUND',
          'Exercise history not found',
        );
      const names = await this.query(
        `WITH scope AS(SELECT $2::timestamptz,$3::timestamptz) SELECT ${nameSql} AS name FROM (SELECT e.exercise_id,e.exercise_name_snapshot FROM workout_exercises e JOIN workout_sessions w ON w.id=e.workout_session_id WHERE w.user_id=$1::uuid AND e.exercise_id=$5::uuid ORDER BY w.completed_at DESC LIMIT 1) a ${nameJoins}`,
        [...this.params(user, period, locale), id],
      );
      return progressExerciseDetailSchema.parse({
        period,
        exercise: { id, displayName: names[0]?.name },
        sessions: 0,
        trackingModes: [],
        loadModes: [],
        modes: [],
      });
    }
    const recordRows = await this.query(
      `${progressSource}${recordCandidates} SELECT ${recordJson} AS payload FROM ranked a ${nameJoins} WHERE a.rank=1 AND a.exercise_id=$5::uuid`,
      [...this.params(user, period, locale), id],
    );
    const records = z
      .array(workoutRecordsSchema.shape.records.element)
      .parse(recordRows.map((r) => r.payload));
    const modes = rows.map(
      (r) =>
        z
          .object({ payload: progressExerciseDetailSchema.shape.modes.element })
          .parse(r).payload,
    );
    return progressExerciseDetailSchema.parse({
      period,
      exercise: { id, displayName: rows[0]?.name },
      sessions: rows[0]?.sessions,
      trackingModes: [...new Set(modes.map((m) => m.trackingMode))],
      loadModes: [...new Set(modes.map((m) => m.loadMode))],
      modes: modes.map((m) => ({
        ...m,
        records: records.filter(
          (r) => r.trackingMode === m.trackingMode && r.loadMode === m.loadMode,
        ),
      })),
    });
  }
  async workoutRecords(user: string, id: string, locale: string) {
    const owned = await this.query(
      'SELECT status,completed_at FROM workout_sessions WHERE user_id=$1::uuid AND id=$2::uuid',
      [user, id],
    );
    if (!owned.length)
      throw new ApiError(404, 'WORKOUT_NOT_FOUND', 'Workout not found');
    if (owned[0]?.status !== 'completed') return { sessionId: id, records: [] };
    // Compare to earlier completed sessions. No persistent PR state; corrections are reflected immediately.
    const rows = await this.query(
      `${progressSource}${recordCandidates}, winner AS (
 SELECT a.*,row_number() OVER(PARTITION BY exercise_id,tracking_mode,load_mode,type ORDER BY CASE WHEN lower THEN -value ELSE value END DESC,reps DESC NULLS LAST,duration DESC NULLS LAST,set_id) AS own_rank
 FROM candidates a WHERE session_id=$5::uuid
 ) SELECT ${recordJson} AS payload FROM winner a ${nameJoins} WHERE a.own_rank=1
 AND NOT EXISTS(SELECT 1 FROM candidates p WHERE p.exercise_id=a.exercise_id AND p.tracking_mode=a.tracking_mode AND p.load_mode=a.load_mode AND p.type=a.type
 AND (p.session_date,p.session_id)<(a.session_date,a.session_id)
 AND CASE WHEN a.lower THEN p.value<=a.value ELSE p.value>=a.value END)
 ORDER BY a.exercise_id,a.type`,
      [user, '1970-01-01T00:00:00Z', this.now().toISOString(), locale, id],
    );
    return workoutRecordsSchema.parse({
      sessionId: id,
      records: rows.map((r) => r.payload),
    });
  }
}

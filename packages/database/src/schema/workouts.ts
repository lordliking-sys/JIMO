import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { exercises } from './exercises';
import { programs, programDays, programExercises } from './programs';
import { auditColumns, targetColumns } from './columns';
import {
  loadModeEnum,
  trackingModeEnum,
  workoutStatusEnum,
  setStatusEnum,
} from './enums';
import { targetChecks } from './target-checks';
import { kilogramsColumn, rpeColumn } from './decimal';
export const workoutSessions = pgTable(
  'workout_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    programId: uuid('program_id').references(() => programs.id, {
      onDelete: 'set null',
    }),
    programDayId: uuid('program_day_id').references(() => programDays.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    status: workoutStatusEnum('status').notNull().default('in_progress'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    ...auditColumns(),
  },
  (t) => [
    index('workout_sessions_user_idx').on(t.userId),
    uniqueIndex('workout_sessions_single_active_unique')
      .on(t.userId)
      .where(sql`${t.status} = 'in_progress'`),
    index('workout_sessions_started_idx').on(t.startedAt),
    index('workout_sessions_program_idx').on(t.programId),
    index('workout_sessions_day_idx').on(t.programDayId),
    check(
      'workout_sessions_name_valid',
      sql`length(trim(${t.name})) BETWEEN 1 AND 160`,
    ),
    check(
      'workout_sessions_completion_valid',
      sql`(${t.completedAt} IS NULL OR ${t.completedAt} >= ${t.startedAt}) AND (${t.status} <> 'completed' OR ${t.completedAt} IS NOT NULL)`,
    ),
  ],
);
export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workoutSessionId: uuid('workout_session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    programExerciseId: uuid('program_exercise_id').references(
      () => programExercises.id,
      { onDelete: 'set null' },
    ),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    exerciseNameSnapshot: text('exercise_name_snapshot').notNull(),
    trackingModeSnapshot: trackingModeEnum('tracking_mode_snapshot').notNull(),
    loadModeSnapshot: loadModeEnum('load_mode_snapshot').notNull(),
    restSecondsSnapshot: integer('rest_seconds_snapshot'),
    notes: text('notes'),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('workout_exercises_position_unique').on(
      t.workoutSessionId,
      t.position,
    ),
    index('workout_exercises_exercise_idx').on(t.exerciseId),
    index('workout_exercises_source_idx').on(t.programExerciseId),
    check('workout_exercises_position_valid', sql`${t.position} >= 0`),
    check(
      'workout_exercises_name_valid',
      sql`length(trim(${t.exerciseNameSnapshot})) BETWEEN 1 AND 160`,
    ),
    check(
      'workout_exercises_rest_valid',
      sql`${t.restSecondsSnapshot} IS NULL OR ${t.restSecondsSnapshot} >= 0`,
    ),
  ],
);
export const workoutSets = pgTable(
  'workout_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workoutExerciseId: uuid('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    setNumber: integer('set_number').notNull(),
    status: setStatusEnum('status').notNull().default('pending'),
    ...targetColumns(),
    actualReps: integer('actual_reps'),
    actualDurationSeconds: integer('actual_duration_seconds'),
    actualLoadKg: kilogramsColumn('actual_load_kg'),
    actualAssistanceKg: kilogramsColumn('actual_assistance_kg'),
    actualRpe: rpeColumn('actual_rpe'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('workout_sets_number_unique').on(
      t.workoutExerciseId,
      t.setNumber,
    ),
    check('workout_sets_number_valid', sql`${t.setNumber} > 0`),
    check(
      'workout_sets_actual_reps_valid',
      sql`${t.actualReps} IS NULL OR ${t.actualReps} >= 0`,
    ),
    check(
      'workout_sets_actual_duration_valid',
      sql`${t.actualDurationSeconds} IS NULL OR (${t.actualDurationSeconds} > 0 AND ${t.actualReps} IS NULL)`,
    ),
    check(
      'workout_sets_actual_kg_valid',
      sql`(${t.actualLoadKg} IS NULL OR ${t.actualLoadKg} >= 0) AND (${t.actualAssistanceKg} IS NULL OR ${t.actualAssistanceKg} >= 0)`,
    ),
    check(
      'workout_sets_actual_load_exclusive',
      sql`${t.actualLoadKg} IS NULL OR ${t.actualAssistanceKg} IS NULL`,
    ),
    check(
      'workout_sets_actual_rpe_valid',
      sql`${t.actualRpe} IS NULL OR ${t.actualRpe} BETWEEN 1 AND 10`,
    ),
    check(
      'workout_sets_completion_valid',
      sql`${t.status} <> 'completed' OR ${t.completedAt} IS NOT NULL`,
    ),
    ...targetChecks('workout_sets', t),
  ],
);

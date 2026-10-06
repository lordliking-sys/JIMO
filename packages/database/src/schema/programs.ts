import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { exercises } from './exercises';
import { auditColumns, targetColumns } from './columns';
import { loadModeEnum, programStatusEnum } from './enums';
import { targetChecks } from './target-checks';
export const programs = pgTable(
  'programs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    durationWeeks: integer('duration_weeks'),
    status: programStatusEnum('status').notNull().default('draft'),
    startsOn: date('starts_on'),
    ...auditColumns(),
  },
  (t) => [
    index('programs_user_idx').on(t.userId),
    check(
      'programs_name_valid',
      sql`length(trim(${t.name})) BETWEEN 1 AND 160`,
    ),
    check(
      'programs_duration_valid',
      sql`${t.durationWeeks} IS NULL OR ${t.durationWeeks} > 0`,
    ),
  ],
);
export const programDays = pgTable(
  'program_days',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    dayOfWeek: integer('day_of_week'),
    position: integer('position').notNull(),
    notes: text('notes'),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('program_days_position_unique').on(t.programId, t.position),
    check(
      'program_days_name_valid',
      sql`length(trim(${t.name})) BETWEEN 1 AND 160`,
    ),
    check(
      'program_days_weekday_valid',
      sql`${t.dayOfWeek} IS NULL OR ${t.dayOfWeek} BETWEEN 1 AND 7`,
    ),
    check('program_days_position_valid', sql`${t.position} >= 0`),
  ],
);
export const programExercises = pgTable(
  'program_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    programDayId: uuid('program_day_id')
      .notNull()
      .references(() => programDays.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    loadMode: loadModeEnum('load_mode').notNull(),
    targetSets: integer('target_sets').notNull(),
    ...targetColumns(),
    restSeconds: integer('rest_seconds'),
    notes: text('notes'),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('program_exercises_position_unique').on(
      t.programDayId,
      t.position,
    ),
    index('program_exercises_exercise_idx').on(t.exerciseId),
    check('program_exercises_position_valid', sql`${t.position} >= 0`),
    check('program_exercises_sets_valid', sql`${t.targetSets} > 0`),
    check(
      'program_exercises_rest_valid',
      sql`${t.restSeconds} IS NULL OR ${t.restSeconds} >= 0`,
    ),
    check(
      'program_exercises_load_mode_valid',
      sql`(${t.loadMode} = 'bodyweight' AND ${t.targetLoadKg} IS NULL AND ${t.targetAssistanceKg} IS NULL) OR (${t.loadMode} IN ('weighted', 'external') AND ${t.targetAssistanceKg} IS NULL) OR (${t.loadMode} = 'assisted' AND ${t.targetLoadKg} IS NULL)`,
    ),
    ...targetChecks('program_exercises', t),
  ],
);

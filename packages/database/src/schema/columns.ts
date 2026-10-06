import { timestamp, integer } from 'drizzle-orm/pg-core';
import { kilogramsColumn, rpeColumn } from './decimal';
export const auditColumns = () => ({
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export const targetColumns = () => ({
  targetReps: integer('target_reps'),
  targetRepMin: integer('target_rep_min'),
  targetRepMax: integer('target_rep_max'),
  targetDurationSeconds: integer('target_duration_seconds'),
  targetLoadKg: kilogramsColumn('target_load_kg'),
  targetAssistanceKg: kilogramsColumn('target_assistance_kg'),
  targetRpe: rpeColumn('target_rpe'),
});

import { check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
type Targets = {
  targetReps: AnyPgColumn;
  targetRepMin: AnyPgColumn;
  targetRepMax: AnyPgColumn;
  targetDurationSeconds: AnyPgColumn;
  targetLoadKg: AnyPgColumn;
  targetAssistanceKg: AnyPgColumn;
  targetRpe: AnyPgColumn;
};
export function targetChecks(prefix: string, t: Targets) {
  return [
    check(
      `${prefix}_reps_valid`,
      sql`(${t.targetReps} IS NULL OR ${t.targetReps} >= 0) AND (${t.targetRepMin} IS NULL OR ${t.targetRepMin} >= 0) AND (${t.targetRepMax} IS NULL OR ${t.targetRepMax} >= 0)`,
    ),
    check(
      `${prefix}_rep_range_valid`,
      sql`(${t.targetRepMin} IS NULL AND ${t.targetRepMax} IS NULL) OR (${t.targetRepMin} IS NOT NULL AND ${t.targetRepMax} IS NOT NULL AND ${t.targetRepMin} <= ${t.targetRepMax} AND ${t.targetReps} IS NULL)`,
    ),
    check(
      `${prefix}_tracking_target_valid`,
      sql`${t.targetDurationSeconds} IS NULL OR (${t.targetDurationSeconds} > 0 AND ${t.targetReps} IS NULL AND ${t.targetRepMin} IS NULL AND ${t.targetRepMax} IS NULL)`,
    ),
    check(
      `${prefix}_kg_valid`,
      sql`(${t.targetLoadKg} IS NULL OR ${t.targetLoadKg} >= 0) AND (${t.targetAssistanceKg} IS NULL OR ${t.targetAssistanceKg} >= 0)`,
    ),
    check(
      `${prefix}_rpe_valid`,
      sql`${t.targetRpe} IS NULL OR ${t.targetRpe} BETWEEN 1 AND 10`,
    ),
    check(
      `${prefix}_load_exclusive`,
      sql`${t.targetLoadKg} IS NULL OR ${t.targetAssistanceKg} IS NULL`,
    ),
  ];
}

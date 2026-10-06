import { pgEnum } from 'drizzle-orm/pg-core';
export const unitSystemEnum = pgEnum('unit_system', ['metric', 'imperial']);
export const trackingModeEnum = pgEnum('tracking_mode', ['reps', 'duration']);
export const loadModeEnum = pgEnum('load_mode', [
  'bodyweight',
  'weighted',
  'external',
  'assisted',
]);
export const programStatusEnum = pgEnum('program_status', [
  'draft',
  'active',
  'archived',
]);
export const workoutStatusEnum = pgEnum('workout_status', [
  'in_progress',
  'completed',
  'cancelled',
]);
export const setStatusEnum = pgEnum('set_status', [
  'pending',
  'completed',
  'skipped',
]);

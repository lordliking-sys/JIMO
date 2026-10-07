import { z } from 'zod';
import { loadModes, trackingModes } from './programs';
import { kilogramsSchema } from './fitness';
export const progressRanges = ['4w', '8w', '12w', '6m', 'all'] as const;
export const timeZoneSchema = z
  .string()
  .max(100)
  .refine((value) => {
    if (value !== 'UTC' && !value.includes('/')) return false;
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid IANA timezone');
export const progressQuerySchema = z
  .object({
    range: z.enum(progressRanges).default('8w'),
    timeZone: timeZoneSchema,
  })
  .strict();
export const progressListQuerySchema = progressQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});
const count = z.number().int().nonnegative();
const metric = z.number().finite().nonnegative().nullable();
const date = z.iso.date();
export const progressPeriodSchema = z.object({
  range: z.enum(progressRanges),
  timeZone: timeZoneSchema,
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  effectiveWeeks: z.number().positive(),
});
export const weeklyPointSchema = z.object({
  weekStart: date,
  completedWorkouts: count,
  completedSets: count,
  totalReps: metric,
  averageRpe: metric,
  trainingSeconds: metric,
});
export const adherenceSchema = z
  .object({
    weekStart: date,
    planned: count,
    completed: count,
    percentage: metric,
  })
  .nullable();
export const progressSummarySchema = z.object({
  period: progressPeriodSchema,
  completedWorkouts: count,
  completedSets: count,
  skippedSets: count,
  totalReps: metric,
  averageRpe: metric,
  trainingSeconds: metric,
  sessionsPerWeek: z.number().finite().nonnegative(),
  adherence: adherenceSchema,
});
export const progressWeeklySchema = z.object({
  period: progressPeriodSchema,
  weeks: z.array(weeklyPointSchema).max(5200),
});
export const recordTypes = [
  'MAX_REPS',
  'MAX_LOAD',
  'MAX_DURATION',
  'MIN_ASSISTANCE',
] as const;
export const progressRecordSchema = z.object({
  type: z.enum(recordTypes),
  exerciseId: z.uuid(),
  displayName: z.string(),
  trackingMode: z.enum(trackingModes),
  loadMode: z.enum(loadModes),
  value: z.string().regex(/^\d+(?:\.\d+)?$/),
  reps: count.nullable(),
  durationSeconds: count.nullable(),
  date: z.iso.datetime(),
  sessionId: z.uuid(),
  setId: z.uuid(),
});
export const progressRecordsSchema = z.object({
  period: progressPeriodSchema,
  records: z.array(progressRecordSchema),
  nextCursor: z.string().nullable(),
});
export const performanceSchema = z.object({
  sessionId: z.uuid(),
  date: z.iso.datetime(),
  trackingMode: z.enum(trackingModes),
  loadMode: z.enum(loadModes),
  reps: count.nullable(),
  durationSeconds: count.nullable(),
  loadKg: kilogramsSchema.nullable(),
  assistanceKg: kilogramsSchema.nullable(),
});
export const progressExerciseSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  sessions: count,
  trackingModes: z.array(z.enum(trackingModes)),
  loadModes: z.array(z.enum(loadModes)),
  latest: performanceSchema,
  trend: z.enum(['up', 'down', 'same']).nullable(),
});
export const progressExercisesSchema = z.object({
  period: progressPeriodSchema,
  exercises: z.array(progressExerciseSchema),
  nextCursor: z.uuid().nullable(),
});
export const exerciseTimelineSchema = z.object({
  sessionId: z.uuid(),
  date: z.iso.datetime(),
  completedSets: count,
  totalReps: metric,
  maxReps: metric,
  maxDurationSeconds: metric,
  averageDurationSeconds: metric,
  totalDurationSeconds: metric,
  maxLoadKg: kilogramsSchema.nullable(),
  minAssistanceKg: kilogramsSchema.nullable(),
  loadVolume: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/)
    .nullable(),
  averageRpe: metric,
});
export const exerciseModeMetricsSchema = z.object({
  sessionsPerWeek: z.number().finite().nonnegative(),
  trackingMode: z.enum(trackingModes),
  loadMode: z.enum(loadModes),
  sessions: count,
  completedSets: count,
  totalReps: metric,
  maxReps: metric,
  maxDurationSeconds: metric,
  averageDurationSeconds: metric,
  totalDurationSeconds: metric,
  maxLoadKg: kilogramsSchema.nullable(),
  minAssistanceKg: kilogramsSchema.nullable(),
  loadVolume: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/)
    .nullable(),
  averageRpe: metric,
  latest: performanceSchema,
  records: z.array(progressRecordSchema),
  timeline: z.array(exerciseTimelineSchema).max(100),
  timelineTruncated: z.boolean(),
});
export const progressExerciseDetailSchema = z.object({
  period: progressPeriodSchema,
  exercise: z.object({ id: z.uuid(), displayName: z.string() }),
  trackingModes: z.array(z.enum(trackingModes)),
  loadModes: z.array(z.enum(loadModes)),
  sessions: count,
  modes: z.array(exerciseModeMetricsSchema),
});
export const workoutRecordsSchema = z.object({
  sessionId: z.uuid(),
  records: z.array(progressRecordSchema),
});
export type ProgressRange = z.infer<typeof progressQuerySchema>['range'];
export type ProgressQuery = z.infer<typeof progressQuerySchema>;
export type ProgressPeriod = z.infer<typeof progressPeriodSchema>;
export type ProgressSummary = z.infer<typeof progressSummarySchema>;
export type ProgressRecord = z.infer<typeof progressRecordSchema>;
export type ExerciseModeMetrics = z.infer<typeof exerciseModeMetricsSchema>;
export type Performance = z.infer<typeof performanceSchema>;

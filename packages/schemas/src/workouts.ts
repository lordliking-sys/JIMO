import { z } from 'zod';
import { kilogramsSchema, rpeSchema } from './fitness';
import { loadModes, trackingModes } from './programs';
export const workoutStatuses = [
  'in_progress',
  'completed',
  'cancelled',
] as const;
export const setStatuses = ['pending', 'completed', 'skipped'] as const;
export const startWorkoutSchema = z.object({ programDayId: z.uuid() }).strict();
export const finishWorkoutSchema = z
  .object({ skipPending: z.boolean().default(false) })
  .strict();
export const actualFieldsSchema = z
  .object({
    actualReps: z.number().int().min(0).max(1_000_000).nullable(),
    actualDurationSeconds: z.number().int().min(1).max(86400).nullable(),
    actualLoadKg: kilogramsSchema.nullable(),
    actualAssistanceKg: kilogramsSchema.nullable(),
    actualRpe: rpeSchema
      .refine((v) => /\.[05]$/.test(v), 'RPE uses half-point increments')
      .nullable(),
  })
  .strict();
/** Mode always comes from the immutable server snapshot. */
export function actualFor(context: {
  trackingModeSnapshot: (typeof trackingModes)[number];
  loadModeSnapshot: (typeof loadModes)[number];
}) {
  return actualFieldsSchema.superRefine((v, ctx) => {
    const issue = (path: keyof typeof v) =>
      ctx.addIssue({
        code: 'custom',
        path: [path],
        message: 'Actual does not match workout snapshot',
      });
    if (context.trackingModeSnapshot === 'reps') {
      if (v.actualReps === null) issue('actualReps');
      if (v.actualDurationSeconds !== null) issue('actualDurationSeconds');
    } else {
      if (v.actualDurationSeconds === null) issue('actualDurationSeconds');
      if (v.actualReps !== null) issue('actualReps');
    }
    if (context.loadModeSnapshot === 'bodyweight') {
      if (v.actualLoadKg !== null) issue('actualLoadKg');
      if (v.actualAssistanceKg !== null) issue('actualAssistanceKg');
    } else if (context.loadModeSnapshot === 'assisted') {
      if (v.actualAssistanceKg === null) issue('actualAssistanceKg');
      if (v.actualLoadKg !== null) issue('actualLoadKg');
    } else {
      if (v.actualLoadKg === null) issue('actualLoadKg');
      if (v.actualAssistanceKg !== null) issue('actualAssistanceKg');
    }
  });
}
const targetFields = {
  targetReps: z.number().int().nullable(),
  targetRepMin: z.number().int().nullable(),
  targetRepMax: z.number().int().nullable(),
  targetDurationSeconds: z.number().int().nullable(),
  targetLoadKg: kilogramsSchema.nullable(),
  targetAssistanceKg: kilogramsSchema.nullable(),
  targetRpe: rpeSchema.nullable(),
};
const audit = { createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() };
export const workoutSetSchema = actualFieldsSchema
  .extend({
    id: z.uuid(),
    setNumber: z.number().int().positive(),
    status: z.enum(setStatuses),
    ...targetFields,
    completedAt: z.iso.datetime().nullable(),
    ...audit,
  })
  .strip();
export const workoutExerciseSchema = z.object({
  id: z.uuid(),
  exerciseId: z.uuid(),
  programExerciseId: z.uuid().nullable(),
  position: z.number().int().nonnegative(),
  exerciseNameSnapshot: z.string(),
  trackingModeSnapshot: z.enum(trackingModes),
  loadModeSnapshot: z.enum(loadModes),
  restSecondsSnapshot: z.number().int().nullable(),
  notes: z.string().nullable(),
  sets: z.array(workoutSetSchema),
  ...audit,
});
export const workoutSummarySchema = z.object({
  syncSequence: z.number().int().nonnegative().optional(),
  id: z.uuid(),
  programId: z.uuid().nullable(),
  programDayId: z.uuid().nullable(),
  name: z.string(),
  status: z.enum(workoutStatuses),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  notes: z.string().nullable(),
  exercisesCount: z.number().int().nonnegative(),
  completedSets: z.number().int().nonnegative(),
  skippedSets: z.number().int().nonnegative(),
  pendingSets: z.number().int().nonnegative(),
  ...audit,
});
export const workoutDetailSchema = workoutSummarySchema.extend({
  exercises: z.array(workoutExerciseSchema),
});
export const activeWorkoutSchema = z.object({
  workout: workoutDetailSchema.nullable(),
});
export const workoutHistorySchema = z.object({
  workouts: z.array(workoutSummarySchema),
  nextCursor: z
    .object({ startedAt: z.iso.datetime(), id: z.uuid() })
    .nullable()
    .optional(),
});
export const workoutHistoryQuerySchema = z
  .object({
    since: z.iso.datetime().optional(),
    status: z.enum(['all', 'completed', 'cancelled']).default('all'),
    dateField: z.enum(['started', 'completed']).default('started'),
    cursorAt: z.iso.datetime().optional(),
    cursorId: z.uuid().optional(),
    until: z.iso.datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict()
  .refine((v) => !v.since || !v.until || v.since < v.until)
  .refine((v) => Boolean(v.cursorAt) === Boolean(v.cursorId));
export type WorkoutDetail = z.infer<typeof workoutDetailSchema>;
export type WorkoutSummary = z.infer<typeof workoutSummarySchema>;
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;
export type WorkoutSet = z.infer<typeof workoutSetSchema>;
export type ActualInput = z.infer<typeof actualFieldsSchema>;

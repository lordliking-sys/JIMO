// Import this subpath only on the server. The mobile-safe main barrel stays
// independent of Drizzle, the PostgreSQL schema and the Neon client.
import { z } from 'zod';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import {
  users,
  programs,
  programDays,
  programExercises,
  workoutSessions,
  workoutSets,
  loadModeEnum,
  trackingModeEnum,
} from '@jimo/database/schema';
import { localePreferenceSchema } from './onboarding';

import { kilogramsSchema, rpeSchema } from './fitness';
export { kilogramsSchema, rpeSchema, kg, rpe } from './fitness';
const name = z.string().trim().min(1).max(160);
const optionalCount = z.number().int().nonnegative().nullable().optional();
const optionalKg = kilogramsSchema.nullable().optional();

const displayName = z.string().trim().min(1).max(120).nullable().optional();
export const userCreateSchema = createInsertSchema(users, { displayName })
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ locale: localePreferenceSchema.default('system') });
export const userUpdateSchema = createUpdateSchema(users, {
  displayName,
  locale: localePreferenceSchema.optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const programCreateSchema = createInsertSchema(programs, {
  userId: z.uuid(),
  name,
  durationWeeks: z.number().int().positive().nullable().optional(),
  startsOn: z.iso.date().nullable().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const programDayCreateSchema = createInsertSchema(programDays, {
  programId: z.uuid(),
  name,
  position: z.number().int().nonnegative(),
  dayOfWeek: z.number().int().min(1).max(7).nullable().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const programExerciseCreateSchema = createInsertSchema(
  programExercises,
  {
    programDayId: z.uuid(),
    exerciseId: z.uuid(),
    position: z.number().int().nonnegative(),
    targetSets: z.number().int().positive(),
    targetReps: optionalCount,
    targetRepMin: optionalCount,
    targetRepMax: optionalCount,
    targetDurationSeconds: z.number().int().positive().nullable().optional(),
    targetLoadKg: optionalKg,
    targetAssistanceKg: optionalKg,
    targetRpe: rpeSchema.nullable().optional(),
    restSeconds: optionalCount,
  },
)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .superRefine((value, ctx) => {
    const min = value.targetRepMin,
      max = value.targetRepMax;
    if (
      (min != null) !== (max != null) ||
      (min != null && max != null && min > max)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['targetRepMin'],
        message: 'Provide both range bounds in ascending order',
      });
    if (value.targetReps != null && (min != null || max != null))
      ctx.addIssue({
        code: 'custom',
        path: ['targetReps'],
        message: 'Choose exact repetitions or a range',
      });
    if (
      value.targetDurationSeconds != null &&
      (value.targetReps != null || min != null || max != null)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['targetDurationSeconds'],
        message: 'Duration and repetitions are mutually exclusive',
      });
    validateLoad(
      value.loadMode,
      value.targetLoadKg,
      value.targetAssistanceKg,
      ctx,
    );
  });
export const workoutSessionCreateSchema = createInsertSchema(workoutSessions, {
  userId: z.uuid(),
  programId: z.uuid().nullable().optional(),
  programDayId: z.uuid().nullable().optional(),
  name,
})
  .omit({ id: true, createdAt: true, updatedAt: true })
  .superRefine((value, ctx) => {
    if (value.status === 'completed' && !value.completedAt)
      ctx.addIssue({
        code: 'custom',
        path: ['completedAt'],
        message: 'Completed sessions need a completion time',
      });
    if (
      value.completedAt &&
      value.startedAt &&
      value.completedAt < value.startedAt
    )
      ctx.addIssue({
        code: 'custom',
        path: ['completedAt'],
        message: 'Completion cannot precede start',
      });
  });

function validateLoad(
  mode: (typeof loadModeEnum.enumValues)[number],
  load: string | null | undefined,
  assistance: string | null | undefined,
  ctx: z.RefinementCtx,
) {
  if (mode === 'bodyweight' && (load != null || assistance != null))
    ctx.addIssue({
      code: 'custom',
      message: 'Bodyweight has no added load or assistance',
    });
  if (mode === 'assisted' && load != null)
    ctx.addIssue({
      code: 'custom',
      message: 'Assisted mode uses assistance kilograms',
    });
  if ((mode === 'weighted' || mode === 'external') && assistance != null)
    ctx.addIssue({
      code: 'custom',
      message: 'Weighted/external mode uses load kilograms',
    });
}

export const workoutSetActualSchema = createUpdateSchema(workoutSets, {
  actualReps: optionalCount,
  actualDurationSeconds: z.number().int().positive().nullable().optional(),
  actualLoadKg: optionalKg,
  actualAssistanceKg: optionalKg,
  actualRpe: rpeSchema.nullable().optional(),
}).pick({
  status: true,
  actualReps: true,
  actualDurationSeconds: true,
  actualLoadKg: true,
  actualAssistanceKg: true,
  actualRpe: true,
  completedAt: true,
});

/** Context must come from the stored workout exercise snapshot, not a client. */
export function workoutSetActualFor(context: {
  trackingMode: (typeof trackingModeEnum.enumValues)[number];
  loadMode: (typeof loadModeEnum.enumValues)[number];
}) {
  return workoutSetActualSchema.superRefine((value, ctx) => {
    validateLoad(
      context.loadMode,
      value.actualLoadKg,
      value.actualAssistanceKg,
      ctx,
    );
    if (context.trackingMode === 'duration' && value.actualReps != null)
      ctx.addIssue({
        code: 'custom',
        path: ['actualReps'],
        message: 'Timed exercise uses actual duration',
      });
    if (context.trackingMode === 'reps' && value.actualDurationSeconds != null)
      ctx.addIssue({
        code: 'custom',
        path: ['actualDurationSeconds'],
        message: 'Repetition exercise uses actual repetitions',
      });
    if (value.status === 'completed') {
      if (!value.completedAt)
        ctx.addIssue({
          code: 'custom',
          path: ['completedAt'],
          message: 'Completed sets need a completion time',
        });
      if (
        context.trackingMode === 'reps'
          ? value.actualReps == null
          : value.actualDurationSeconds == null
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Completed sets need the actual measurement',
        });
    }
  });
}

export type ProgramCreate = z.infer<typeof programCreateSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type ProgramDayCreate = z.infer<typeof programDayCreateSchema>;
export type ProgramExerciseCreate = z.infer<typeof programExerciseCreateSchema>;
export type WorkoutSessionCreate = z.infer<typeof workoutSessionCreateSchema>;
export type WorkoutSetActual = z.infer<typeof workoutSetActualSchema>;

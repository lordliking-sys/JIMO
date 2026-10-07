import { z } from 'zod';
import { kilogramsSchema, rpeSchema } from './fitness';
export const programStatuses = ['draft', 'active', 'archived'] as const;
export const trackingModes = ['reps', 'duration'] as const;
export const loadModes = [
  'bodyweight',
  'weighted',
  'external',
  'assisted',
] as const;
const count = z.number().int().min(0).max(1_000_000);
const optionalCount = count.nullable().optional();
const notes = z.string().trim().max(2000).nullable().optional();
export const programInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: notes,
    durationWeeks: z.number().int().min(1).max(520).nullable().optional(),
    startsOn: z.iso.date().nullable().optional(),
  })
  .strict();
export const programPatchSchema = programInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0);
export const dayInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    dayOfWeek: z.number().int().min(1).max(7).nullable().optional(),
    notes,
  })
  .strict();
export const dayPatchSchema = dayInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0);
export const customExerciseInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    trackingMode: z.enum(trackingModes),
    defaultLoadMode: z.enum(loadModes).nullable().optional(),
  })
  .strict();
export const prescriptionFieldsSchema = z
  .object({
    exerciseId: z.uuid(),
    loadMode: z.enum(loadModes),
    targetSets: z.number().int().min(1).max(100),
    targetReps: optionalCount,
    targetRepMin: optionalCount,
    targetRepMax: optionalCount,
    targetDurationSeconds: z
      .number()
      .int()
      .min(1)
      .max(86400)
      .nullable()
      .optional(),
    targetLoadKg: kilogramsSchema.nullable().optional(),
    targetAssistanceKg: kilogramsSchema.nullable().optional(),
    targetRpe: rpeSchema
      .refine(
        (value) => /\.[05]$/.test(value),
        'RPE uses half-point increments',
      )
      .nullable()
      .optional(),
    restSeconds: z.number().int().min(0).max(86400).nullable().optional(),
    notes,
  })
  .strict();
export const prescriptionPatchSchema = prescriptionFieldsSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0);
export const prescriptionSchema = prescriptionFieldsSchema.superRefine(
  (v, ctx) => {
    const fixed = v.targetReps != null,
      range = v.targetRepMin != null || v.targetRepMax != null,
      duration = v.targetDurationSeconds != null;
    if (Number(fixed) + Number(range) + Number(duration) !== 1)
      ctx.addIssue({
        code: 'custom',
        message: 'Choose exactly one tracking target',
      });
    if (
      range &&
      (v.targetRepMin == null ||
        v.targetRepMax == null ||
        v.targetRepMin > v.targetRepMax)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['targetRepMin'],
        message: 'Invalid repetition range',
      });
    if (
      v.loadMode === 'bodyweight' &&
      (v.targetLoadKg != null || v.targetAssistanceKg != null)
    )
      ctx.addIssue({ code: 'custom', message: 'Bodyweight has no load' });
    if (
      v.loadMode === 'assisted'
        ? v.targetLoadKg != null
        : v.targetAssistanceKg != null
    )
      ctx.addIssue({ code: 'custom', message: 'Load mode mismatch' });
  },
);
export function prescriptionFor(trackingMode: (typeof trackingModes)[number]) {
  return prescriptionSchema.superRefine((v, ctx) => {
    if ((trackingMode === 'duration') !== (v.targetDurationSeconds != null))
      ctx.addIssue({ code: 'custom', message: 'Tracking mode mismatch' });
  });
}
export const reorderSchema = z
  .object({
    ids: z
      .array(z.uuid())
      .max(1000)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .strict();
export const exerciseQuerySchema = z
  .object({
    search: z.string().trim().max(160).optional(),
    trackingMode: z.enum(trackingModes).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.uuid().optional(),
  })
  .strict();
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    sessionId: z.uuid().optional(),
  }),
});
export const exerciseDtoSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  canonicalName: z.string(),
  trackingMode: z.enum(trackingModes),
  defaultLoadMode: z.enum(loadModes).nullable(),
  isCustom: z.boolean(),
});
const audit = { createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() };
export const programSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(programStatuses),
  durationWeeks: z.number().nullable(),
  startsOn: z.iso.date().nullable(),
  daysCount: z.number().int(),
  ...audit,
});
export const programExerciseDtoSchema = prescriptionFieldsSchema.extend({
  id: z.uuid(),
  position: count,
  exercise: exerciseDtoSchema,
  ...audit,
});
export const dayDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  dayOfWeek: z.number().nullable(),
  notes: z.string().nullable(),
  position: count,
  exercises: z.array(programExerciseDtoSchema),
  ...audit,
});
export const programDetailSchema = programSummarySchema.extend({
  days: z.array(dayDtoSchema),
});
export const programListSchema = z.object({
  programs: z.array(programSummarySchema),
});
export const exerciseListSchema = z.object({
  exercises: z.array(exerciseDtoSchema),
  nextCursor: z.uuid().nullable(),
});
export type ProgramInput = z.infer<typeof programInputSchema>;
export type DayInput = z.infer<typeof dayInputSchema>;
export type Prescription = z.infer<typeof prescriptionFieldsSchema>;
export type ExerciseDto = z.infer<typeof exerciseDtoSchema>;
export type ProgramSummary = z.infer<typeof programSummarySchema>;
export type ProgramDetail = z.infer<typeof programDetailSchema>;
export type ProgramExerciseDto = z.infer<typeof programExerciseDtoSchema>;
export type DayDto = z.infer<typeof dayDtoSchema>;

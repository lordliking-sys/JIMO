import { z } from 'zod';
import {
  loadModes,
  exerciseDtoSchema,
  customExerciseInputSchema,
  programInputSchema,
  dayInputSchema,
  prescriptionFieldsSchema,
  prescriptionSchema,
} from './programs';
export const importLimits = {
  maxImages: 8,
  maxPdfPages: 20,
  imageBytes: 8 * 1024 * 1024,
  pdfBytes: 15 * 1024 * 1024,
  totalBytes: 20 * 1024 * 1024,
  maxExercises: 200,
  timeoutMs: 150_000,
} as const;
export const importMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
const text = z.string().max(2000).nullable();
const number = (max: number, min = 0) =>
  z.number().int().min(min).max(max).nullable();
const decimal = z
  .string()
  .regex(/^\d{1,7}(\.\d{1,2})?$/)
  .nullable();
/** No defaults: an absent prescription stays null until the user reviews it. */
export const extractedExerciseSchema = z
  .object({
    rawName: z.string().min(1).max(160).nullable(),
    rawPrescription: text,
    sets: number(100, 1),
    reps: number(1_000_000),
    repMin: number(1_000_000),
    repMax: number(1_000_000),
    durationSeconds: number(86400, 1),
    loadMode: z.enum(loadModes).nullable(),
    loadKg: decimal,
    assistanceKg: decimal,
    sourceLoadUnit: z.enum(['kg', 'lb']).nullable(),
    rpe: z
      .string()
      .regex(/^(?:[1-9](?:\.[05])?|10(?:\.0)?)$/)
      .nullable(),
    restSeconds: number(86400),
    notes: text,
    confidence: z.number().min(0).max(1),
  })
  .strict();
export const extractedWorkoutPlanSchema = z
  .object({
    programName: z.string().min(1).max(160).nullable(),
    description: text,
    durationWeeks: number(520, 1),
    days: z
      .array(
        z
          .object({
            name: z.string().min(1).max(160).nullable(),
            dayOfWeek: number(7, 1),
            notes: text,
            exercises: z.array(extractedExerciseSchema).max(30),
          })
          .strict(),
      )
      .max(20),
    warnings: z.array(z.string().min(1).max(500)).max(100),
  })
  .strict();
export const importMatchSchema = z
  .object({
    status: z.enum(['MATCHED', 'SUGGESTED', 'UNMATCHED']),
    exercise: exerciseDtoSchema.nullable(),
    suggestions: z.array(exerciseDtoSchema).max(3),
  })
  .strict();
export const importReviewSchema = z
  .object({
    importId: z.uuid(),
    extraction: extractedWorkoutPlanSchema,
    matches: z.array(z.array(importMatchSchema).max(30)).max(20),
  })
  .strict()
  .refine(
    (v) =>
      v.matches.length === v.extraction.days.length &&
      v.matches.every(
        (row, i) => row.length === v.extraction.days[i]?.exercises.length,
      ),
    'Match dimensions must correspond to extraction',
  );
const importPrescription = prescriptionFieldsSchema.omit({ exerciseId: true });
const confirmExercise = z
  .object({
    exerciseId: z.uuid().nullable(),
    custom: customExerciseInputSchema.nullable(),
    prescription: importPrescription,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (Boolean(v.exerciseId) === Boolean(v.custom))
      ctx.addIssue({
        code: 'custom',
        message: 'Select one existing or explicit custom exercise',
      });
    const result = prescriptionSchema.safeParse({
      ...v.prescription,
      exerciseId: v.exerciseId ?? '00000000-0000-4000-8000-000000000001',
    });
    if (!result.success)
      ctx.addIssue({ code: 'custom', message: 'Incomplete prescription' });
  });
export const importConfirmationSchema = z
  .object({
    confirmationKey: z.uuid(),
    importId: z.uuid(),
    program: programInputSchema,
    days: z
      .array(
        dayInputSchema
          .extend({ exercises: z.array(confirmExercise).min(1).max(30) })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .refine(
    (v) =>
      v.days.reduce((n, d) => n + d.exercises.length, 0) <=
      importLimits.maxExercises,
  );
const reviewPrescription = importPrescription.partial().extend({
  loadMode: z.enum(loadModes).nullable(),
  targetSets: number(100, 1),
});
export const importDraftExerciseSchema = z
  .object({
    localId: z.uuid(),
    rawName: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    match: importMatchSchema,
    exercise: exerciseDtoSchema.nullable(),
    custom: customExerciseInputSchema.nullable(),
    prescription: reviewPrescription,
  })
  .strict();
export const importDraftSchema = z
  .object({
    version: z.literal(1),
    importId: z.uuid(),
    confirmationKey: z.uuid(),
    warnings: z.array(z.string().max(500)).max(100),
    program: programInputSchema.extend({ name: z.string().max(160) }),
    days: z
      .array(
        dayInputSchema
          .extend({
            localId: z.uuid(),
            name: z.string().max(160),
            exercises: z.array(importDraftExerciseSchema).max(30),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();
export type ExtractedWorkoutPlan = z.infer<typeof extractedWorkoutPlanSchema>;
export type ExtractedExercise = z.infer<typeof extractedExerciseSchema>;
export type ImportReview = z.infer<typeof importReviewSchema>;
export type ImportMatch = z.infer<typeof importMatchSchema>;
export type ImportConfirmation = z.infer<typeof importConfirmationSchema>;
export type ImportDraft = z.infer<typeof importDraftSchema>;
export type ImportDraftExercise = z.infer<typeof importDraftExerciseSchema>;

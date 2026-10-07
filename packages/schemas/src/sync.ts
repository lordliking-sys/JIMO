import { z } from 'zod';
import { prescriptionFor } from './programs';
import {
  actualFieldsSchema,
  workoutExerciseSchema,
  workoutSetSchema,
} from './workouts';
export const clientTimestampSchema = z.iso
  .datetime()
  .refine((v) => Number.isFinite(Date.parse(v)) && Date.parse(v) >= 0);
const target = workoutSetSchema
  .pick({
    id: true,
    setNumber: true,
    targetReps: true,
    targetRepMin: true,
    targetRepMax: true,
    targetDurationSeconds: true,
    targetLoadKg: true,
    targetAssistanceKg: true,
    targetRpe: true,
  })
  .strict();
const snapshotExercise = workoutExerciseSchema
  .omit({ sets: true, createdAt: true, updatedAt: true })
  .extend({
    exerciseNameSnapshot: z.string().trim().min(1).max(160),
    restSecondsSnapshot: z.number().int().min(0).max(86400).nullable(),
    notes: z.string().max(2000).nullable(),
    position: z.number().int().min(0).max(999),
    sets: z.array(target).min(1).max(100),
  })
  .strict()
  .superRefine((e, ctx) => {
    for (const [i, s] of e.sets.entries()) {
      const valid = prescriptionFor(e.trackingModeSnapshot).safeParse({
        exerciseId: e.exerciseId,
        loadMode: e.loadModeSnapshot,
        targetSets: e.sets.length,
        targetReps: s.targetReps,
        targetRepMin: s.targetRepMin,
        targetRepMax: s.targetRepMax,
        targetDurationSeconds: s.targetDurationSeconds,
        targetLoadKg: s.targetLoadKg,
        targetAssistanceKg: s.targetAssistanceKg,
        targetRpe: s.targetRpe,
      });
      if (!valid.success || s.setNumber !== i + 1)
        ctx.addIssue({
          code: 'custom',
          message: 'Invalid snapshot set',
          path: ['sets', i],
        });
    }
  });
export const offlineSnapshotSchema = z
  .object({
    programId: z.uuid(),
    programDayId: z.uuid(),
    name: z.string().trim().min(1).max(160),
    notes: z.string().max(2000).nullable(),
    exercises: z.array(snapshotExercise).min(1).max(100),
  })
  .strict()
  .superRefine((v, ctx) => {
    const ids = v.exercises.flatMap((e) => [e.id, ...e.sets.map((s) => s.id)]);
    if (
      new Set(ids).size !== ids.length ||
      new Set(v.exercises.map((e) => e.position)).size !== v.exercises.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate snapshot identity or position',
      });
  });
const envelope = {
  operationId: z.uuid(),
  sessionId: z.uuid(),
  entityId: z.uuid(),
  sequence: z.number().int().positive().max(1_000_000),
  createdAt: clientTimestampSchema,
};
export const workoutOperationSchema = z.discriminatedUnion('operationType', [
  z
    .object({
      ...envelope,
      operationType: z.literal('START_WORKOUT'),
      payload: offlineSnapshotSchema,
    })
    .strict(),
  z
    .object({
      ...envelope,
      operationType: z.literal('COMPLETE_SET'),
      payload: actualFieldsSchema,
    })
    .strict(),
  z
    .object({
      ...envelope,
      operationType: z.literal('UPDATE_SET'),
      payload: actualFieldsSchema,
    })
    .strict(),
  z
    .object({
      ...envelope,
      operationType: z.literal('SKIP_SET'),
      payload: z.object({}).strict(),
    })
    .strict(),
  z
    .object({
      ...envelope,
      operationType: z.literal('COMPLETE_WORKOUT'),
      payload: z.object({ skipPending: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      ...envelope,
      operationType: z.literal('CANCEL_WORKOUT'),
      payload: z.object({}).strict(),
    })
    .strict(),
]);
export const syncRequestSchema = z
  .object({
    expectedUserId: z.uuid(),
    operations: z.array(workoutOperationSchema).min(1).max(50),
  })
  .strict()
  .superRefine((v, ctx) => {
    const next = new Map<string, number>();
    for (const o of v.operations) {
      if (
        (o.operationType === 'START_WORKOUT' ||
          o.operationType === 'COMPLETE_WORKOUT' ||
          o.operationType === 'CANCEL_WORKOUT') &&
        o.entityId !== o.sessionId
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid session entity' });
      const previous = next.get(o.sessionId);
      if (previous !== undefined && o.sequence !== previous + 1)
        ctx.addIssue({
          code: 'custom',
          message: 'Operations must be contiguous and ordered per session',
        });
      next.set(o.sessionId, o.sequence);
    }
    if (
      new Set(v.operations.map((o) => o.operationId)).size !==
      v.operations.length
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate operation in batch' });
  });
export const syncResponseSchema = z.object({
  acknowledged: z.array(z.uuid()),
  failed: z.array(
    z.object({
      operationId: z.uuid(),
      sessionId: z.uuid(),
      status: z.enum(['failed', 'conflict', 'retry']),
      code: z.string(),
    }),
  ),
});
export const syncIdentitySchema = z.object({ userId: z.uuid() });
export type WorkoutOperation = z.infer<typeof workoutOperationSchema>;
export type OfflineSnapshot = z.infer<typeof offlineSnapshotSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;

import { z } from 'zod';
/** Public availability only. No provider configuration, identifiers or secrets. */
export const featureConfigSchema = z
  .object({
    workoutPlanImport: z.boolean(),
    aiProgramCreation: z.literal(false),
  })
  .strict();
export type FeatureConfig = z.infer<typeof featureConfigSchema>;

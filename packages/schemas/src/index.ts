import type { HealthStatus } from '@jimo/types';
import { z } from 'zod';
export const healthStatusSchema: z.ZodType<HealthStatus> = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
});

export * from './onboarding';

export * from './fitness';
export * from './programs';

import { z } from 'zod';
import { isDatabaseUrl } from '@jimo/database';
export const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.string().min(1).refine(isDatabaseUrl),
    DEV_USER_ID: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.uuid().optional(),
    ),
    NEON_DEVELOPMENT_BRANCH_ID: z.string().min(1).optional(),
    API_ALLOWED_ORIGINS: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && value.DEV_USER_ID)
      ctx.addIssue({
        code: 'custom',
        path: ['DEV_USER_ID'],
        message: 'Development identity is disabled in production',
      });
  });
export class ApiConfigurationError extends Error {}
export function readEnv(
  input: Record<string, string | undefined> = process.env,
) {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ];
    throw new ApiConfigurationError(
      `Invalid or missing API configuration: ${fields.join(', ')}`,
    );
  }
  return result.data;
}

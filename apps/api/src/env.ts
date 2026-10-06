import { z } from 'zod';
import { isDatabaseUrl } from '@jimo/database';
export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1).refine(isDatabaseUrl),
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

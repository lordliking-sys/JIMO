import { z } from 'zod';
import { isDatabaseUrl } from '@jimo/database';
const optionalConfig = (schema: z.ZodType<string>) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    schema.optional(),
  );
export const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.string().min(1).refine(isDatabaseUrl),
    ALLOW_DEV_AUTH: z.enum(['true', 'false']).default('false'),
    CLERK_SECRET_KEY: optionalConfig(z.string().min(1)),
    CLERK_ISSUER_URL: optionalConfig(
      z.url().refine((value) => value.startsWith('https://')),
    ),
    CLERK_JWT_KEY: optionalConfig(z.string().min(1)),
    CLERK_AUTHORIZED_PARTIES: z.string().optional(),
    DEV_USER_ID: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.uuid().optional(),
    ),
    NEON_DEVELOPMENT_BRANCH_ID: z.string().min(1).optional(),
    API_ALLOWED_ORIGINS: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.NODE_ENV === 'production' &&
      (value.DEV_USER_ID || value.ALLOW_DEV_AUTH === 'true')
    )
      ctx.addIssue({
        code: 'custom',
        path: ['DEV_USER_ID'],
        message: 'Development identity is disabled in production',
      });
    if (
      (value.NODE_ENV === 'production' ||
        value.ALLOW_DEV_AUTH !== 'true' ||
        !!value.CLERK_SECRET_KEY ||
        !!value.CLERK_ISSUER_URL ||
        !!value.CLERK_JWT_KEY) &&
      (!value.CLERK_SECRET_KEY ||
        !value.CLERK_ISSUER_URL ||
        !value.CLERK_AUTHORIZED_PARTIES?.trim())
    )
      ctx.addIssue({
        code: 'custom',
        path: ['CLERK_SECRET_KEY'],
        message: 'Clerk configuration required; authentication fails closed',
      });
    if (
      value.NODE_ENV === 'production' &&
      value.CLERK_SECRET_KEY?.startsWith('sk_test_')
    )
      ctx.addIssue({
        code: 'custom',
        path: ['CLERK_SECRET_KEY'],
        message: 'Development Clerk instance cannot serve production',
      });
    if (value.CLERK_AUTHORIZED_PARTIES) {
      for (const origin of value.CLERK_AUTHORIZED_PARTIES.split(',')) {
        try {
          const url = new URL(origin.trim());
          if (
            url.origin !== origin.trim() ||
            !['http:', 'https:'].includes(url.protocol)
          )
            throw new Error();
        } catch {
          ctx.addIssue({
            code: 'custom',
            path: ['CLERK_AUTHORIZED_PARTIES'],
            message: 'Explicit HTTP(S) origins required',
          });
        }
      }
    }
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

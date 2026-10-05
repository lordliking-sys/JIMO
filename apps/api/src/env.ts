import { z } from 'zod';
export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
});
export function readEnv(
  input: Record<string, string | undefined> = process.env,
) {
  return envSchema.parse(input);
}

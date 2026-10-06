import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { users, type DatabaseClient } from '@jimo/database';
import { ApiError } from './errors';
export type CurrentUser = { id: string };
export type CurrentUserProvider = (
  request: FastifyRequest,
) => Promise<CurrentUser>;
export const noCurrentUser: CurrentUserProvider = async () => {
  throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required');
};
export const defaultDevelopmentUserId = '3c9e1b7d-7596-4f15-a11c-48b8ef237413';
export async function developmentCurrentUser(
  client: DatabaseClient,
  config: {
    mode: 'development' | 'test' | 'production';
    userId?: string;
    branchId?: string;
  },
): Promise<CurrentUserProvider> {
  if (config.mode === 'production') return noCurrentUser;
  if (!config.branchId)
    throw new Error(
      'NEON_DEVELOPMENT_BRANCH_ID is required for development identity',
    );
  const rows = await client.sqlClient.query(
    "SELECT current_setting('neon.branch_id',true) AS branch_id",
  );
  if (rows[0]?.branch_id !== config.branchId)
    throw new Error('Development branch mismatch');
  const id = z.uuid().parse(config.userId ?? defaultDevelopmentUserId);
  if (config.userId) {
    if (
      !(
        await client.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, id))
      )[0]
    )
      throw new Error('DEV_USER_ID must refer to an existing development user');
  } else {
    await client.db
      .insert(users)
      .values({ id, displayName: 'JIMO development' })
      .onConflictDoNothing();
  }
  return async () => ({ id });
}

import type { DatabaseClient } from '@jimo/database';
import type { CurrentUserProvider } from '../current-user';
import type { AuthProvider, AuthenticatedIdentity } from './provider';
import { ApiError } from '../errors';
import { z } from 'zod';
export interface InternalUserResolver {
  resolve(identity: AuthenticatedIdentity): Promise<{ id: string }>;
}
export class CurrentUserResolver implements InternalUserResolver {
  constructor(private client: DatabaseClient) {}
  async resolve(identity: AuthenticatedIdentity) {
    // Unique identity + atomic upsert handles first-login concurrency. Never link
    // by email or transfer DEV_USER_ID data to a provider account.
    const rows = await this.client.sqlClient.query(
      `INSERT INTO users(auth_provider,auth_subject) VALUES($1,$2)
       ON CONFLICT(auth_provider,auth_subject) DO UPDATE SET auth_subject=excluded.auth_subject
       RETURNING id`,
      [identity.provider, identity.subject],
    );
    return { id: String(rows[0]!.id) };
  }
}
export function authenticatedCurrentUser(
  provider: AuthProvider,
  resolver: InternalUserResolver,
): CurrentUserProvider {
  return async (request) => {
    const header = request.headers.authorization;
    if (!header)
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required');
    const match = /^Bearer ([^\s]+)$/i.exec(header);
    if (!match || match[1]!.length > 16384)
      throw new ApiError(401, 'INVALID_SESSION', 'Invalid session');
    const user = await resolver.resolve(await provider.verify(match[1]!));
    const owner = request.headers['x-jimo-owner'];
    if (owner !== undefined && z.uuid().parse(owner) !== user.id)
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    return user;
  };
}

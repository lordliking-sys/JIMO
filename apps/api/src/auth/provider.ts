import { verifyToken } from '@clerk/backend';
import { ApiError } from '../errors';
export type AuthenticatedIdentity = { provider: string; subject: string };
export interface AuthProvider {
  verify(token: string): Promise<AuthenticatedIdentity>;
}
/** Only this adapter knows Clerk. No JWT claims enter the domain services. */
export class ClerkAuthProvider implements AuthProvider {
  constructor(
    private config: {
      secretKey: string;
      issuer: string;
      jwtKey?: string;
      authorizedParties: string[];
    },
  ) {}
  async verify(token: string): Promise<AuthenticatedIdentity> {
    try {
      const claims = await verifyToken(token, {
        secretKey: this.config.secretKey,
        ...(this.config.jwtKey ? { jwtKey: this.config.jwtKey } : {}),
        clockSkewInMs: 5000,
      });
      if (
        claims.iss !== this.config.issuer ||
        // Native session tokens may omit azp. A signed web-origin claim must
        // match the explicit allowlist; issuer/signature/time checks still apply.
        (claims.azp != null &&
          !this.config.authorizedParties.includes(claims.azp)) ||
        !/^user_[A-Za-z0-9]+$/.test(claims.sub) ||
        !claims.sid ||
        claims.sts === 'pending'
      )
        throw new ApiError(401, 'INVALID_SESSION', 'Invalid session');
      return { provider: 'clerk', subject: claims.sub };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (
        error &&
        typeof error === 'object' &&
        'reason' in error &&
        error.reason === 'token-expired'
      )
        throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired');
      // Never propagate SDK errors, JWTs, key material or cryptographic details.
      throw new ApiError(401, 'INVALID_SESSION', 'Invalid session');
    }
  }
}

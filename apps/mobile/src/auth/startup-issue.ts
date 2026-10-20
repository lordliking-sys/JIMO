export type AccountStartupIssue =
  'network' | 'configuration' | 'session' | 'server' | 'generic';
/** Never expose provider/server messages, request URLs or credentials. */
export function accountStartupIssue(error: unknown): AccountStartupIssue {
  const value = error && typeof error === 'object' ? error : {};
  const code = 'code' in value ? value.code : undefined;
  const status = 'status' in value ? value.status : undefined;
  if (code === 'API_NOT_CONFIGURED') return 'configuration';
  if (
    code === 'NETWORK_ERROR' ||
    code === 'TIMEOUT' ||
    code === 'TOKEN_UNAVAILABLE'
  )
    return 'network';
  if (
    status === 401 ||
    code === 'AUTH_REQUIRED' ||
    code === 'SESSION_EXPIRED' ||
    code === 'INVALID_SESSION'
  )
    return 'session';
  if (typeof status === 'number' && status >= 500) return 'server';
  return 'generic';
}

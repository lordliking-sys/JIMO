import type { Profile, Preferences } from '@jimo/schemas';
export function authDestination(input: {
  loaded: boolean;
  signedIn: boolean;
  resolved: boolean;
  onboarding: boolean;
}) {
  if (!input.loaded || (input.signedIn && !input.resolved)) return 'loading';
  if (input.signedIn) return 'app';
  return input.onboarding ? 'auth' : 'onboarding';
}
export function initialProfilePatch(
  profile: Profile,
  preferences: Preferences,
) {
  return profile.initialized
    ? null
    : { initialize: true as const, locale: preferences.localePreference };
}
export function authErrorKey(error: unknown) {
  const obj = error && typeof error === 'object' ? error : {};
  const errors = 'errors' in obj && Array.isArray(obj.errors) ? obj.errors : [];
  const code = String(errors[0]?.code ?? ('code' in obj ? obj.code : ''));
  if (
    [
      'TOKEN_UNAVAILABLE',
      'NETWORK_ERROR',
      'TIMEOUT',
      'network_error',
      'network_failure',
    ].includes(code)
  )
    return 'errors.network';
  if (code === 'form_identifier_exists') return 'errors.registered';
  if (code === 'form_identifier_not_found') return 'errors.account';
  if (code === 'form_password_incorrect') return 'errors.password';
  if (code === 'form_code_incorrect' || code === 'verification_expired')
    return 'errors.code';
  if (code === 'form_param_format_invalid') return 'errors.email';
  if (code.includes('password')) return 'errors.passwordPolicy';
  if (code.includes('rate') || code === 'too_many_requests')
    return 'errors.rate';
  if (
    code.includes('session') ||
    code === 'AUTH_REQUIRED' ||
    code === 'INVALID_SESSION' ||
    code === 'SESSION_EXPIRED'
  )
    return 'errors.session';
  return 'errors.generic';
}
export function logoutWarning(active: boolean, pending: number) {
  return active ? 'activeWarning' : pending > 0 ? 'pendingWarning' : null;
}
/** Test exports are loopback web-only; never an authentication path on a phone. */
export function isTestAuth(
  enabled: string | undefined,
  platform: string,
  origin: string,
) {
  return (
    enabled === 'true' &&
    platform === 'web' &&
    origin === 'http://localhost:4173'
  );
}

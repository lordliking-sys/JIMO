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
  if (
    code === 'form_password_incorrect' ||
    code === 'form_password_or_identifier_incorrect'
  )
    return 'errors.password';
  if (code === 'form_code_incorrect' || code === 'verification_expired')
    return 'errors.code';
  if (code === 'form_param_format_invalid') return 'errors.email';
  if (code === 'form_password_length_too_short')
    return authErrorParams(error).min
      ? 'errors.passwordMin'
      : 'errors.passwordLength';
  if (
    code === 'form_password_pwned' ||
    code === 'form_password_compromised__sign_in' ||
    code === 'form_password_untrusted__sign_in'
  )
    return 'errors.passwordCompromised';
  if (code === 'form_password_not_strong_enough')
    return 'errors.passwordCommon';
  if (code === 'form_password_matches_identifier')
    return 'errors.passwordIdentifier';
  if (code === 'form_new_password_matches_current')
    return 'errors.passwordSame';
  if (
    code === 'form_password_size_in_bytes_exceeded' ||
    code === 'form_password_length_too_long'
  )
    return 'errors.passwordLong';
  if (code.includes('password')) {
    const metadata = passwordErrorMeta(error);
    if (metadata.require_uppercase === true) return 'errors.passwordUppercase';
    if (metadata.require_lowercase === true) return 'errors.passwordLowercase';
    if (metadata.require_numbers === true) return 'errors.passwordNumber';
    if (metadata.require_special_char === true) return 'errors.passwordSpecial';
    return 'errors.passwordPolicy';
  }
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

/** Only structured policy fields are used, never provider messages or user input. */
function passwordErrorMeta(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') return {};
  const errors =
    'errors' in error && Array.isArray(error.errors) ? error.errors : [];
  const first = errors.find(
    (item: unknown) =>
      !!item &&
      typeof item === 'object' &&
      'code' in item &&
      String(item.code).includes('password'),
  );
  const meta = first?.meta ?? ('meta' in error ? error.meta : undefined);
  if (!meta || typeof meta !== 'object') return {};
  const requirements = meta.password_requirements ?? meta.requirements;
  return requirements &&
    typeof requirements === 'object' &&
    !Array.isArray(requirements)
    ? requirements
    : meta;
}
export function authErrorParams(error: unknown): { min?: number } {
  const meta = passwordErrorMeta(error);
  const raw = meta.min_length ?? meta.minLength;
  const min =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^\d{1,4}$/.test(raw)
        ? Number(raw)
        : NaN;
  return Number.isInteger(min) && min > 0 && min <= 1024 ? { min } : {};
}

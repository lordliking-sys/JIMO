import { record } from './password-policy';
function passwordError(error: unknown) {
  const root = record(error),
    errors =
      Array.isArray(root.errors) && root.errors.length ? root.errors : [root];
  return record(
    errors.find((item) => String(record(item).code ?? '').includes('password')),
  );
}
function metadata(error: unknown) {
  const meta = record(passwordError(error).meta);
  return record(meta.password_requirements ?? meta.requirements ?? meta);
}
function positiveNumber(value: unknown) {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d{1,5}$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isInteger(number) && number > 0 && number <= 65536
    ? number
    : undefined;
}
export function authErrorParams(error: unknown): {
  min?: number;
  max?: number;
} {
  const meta = metadata(error),
    min = positiveNumber(meta.min_length ?? meta.minLength),
    max = positiveNumber(meta.max_length ?? meta.maxLength);
  return { ...(min ? { min } : {}), ...(max ? { max } : {}) };
}
/** Never expose Clerk's raw messages, request contents or a password. */
export function mapClerkPasswordError(error: unknown) {
  const code = String(passwordError(error).code ?? '');
  if (
    !code ||
    [
      'form_password_incorrect',
      'form_password_or_identifier_incorrect',
    ].includes(code)
  )
    return null;
  if (
    [
      'form_password_pwned',
      'form_password_compromised__sign_in',
      'form_password_untrusted__sign_in',
    ].includes(code)
  )
    return 'errors.passwordCompromised';
  if (code === 'form_password_length_too_short')
    return authErrorParams(error).min
      ? 'errors.passwordMin'
      : 'errors.passwordLength';
  if (code === 'form_password_size_in_bytes_exceeded')
    return 'errors.passwordBytes';
  if (code === 'form_password_length_too_long')
    return authErrorParams(error).max
      ? 'errors.passwordMax'
      : 'errors.passwordLong';
  if (code === 'form_password_matches_identifier')
    return 'errors.passwordIdentifier';
  if (code === 'form_new_password_matches_current')
    return 'errors.passwordSame';
  const meta = metadata(error);
  if (code.includes('uppercase') || meta.require_uppercase === true)
    return 'errors.passwordUppercase';
  if (code.includes('lowercase') || meta.require_lowercase === true)
    return 'errors.passwordLowercase';
  if (code.includes('number') || meta.require_numbers === true)
    return 'errors.passwordNumber';
  if (code.includes('special') || meta.require_special_char === true)
    return 'errors.passwordSpecial';
  if (code === 'form_password_not_strong_enough')
    return 'errors.passwordCommon';
  return 'errors.passwordPolicy';
}

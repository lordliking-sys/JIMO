export type PasswordPolicy = Readonly<{
  minLength: number;
  maxLength: number | null;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  specialCharacters: string;
}>;
const defaultSpecialCharacters = '!"#$%&\'()*+,-./:;<=>?@[]^_`{|}~';
/** UI fallback only. Clerk remains authoritative, including breach/strength checks. */
export const basePasswordPolicy: PasswordPolicy = Object.freeze({
  minLength: 8,
  maxLength: null,
  uppercase: false,
  lowercase: false,
  number: false,
  special: false,
  specialCharacters: defaultSpecialCharacters,
});
export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function passwordPolicyFromSettings(settings: unknown): PasswordPolicy {
  const data = record(settings);
  const min =
    typeof data.min_length === 'number' &&
    Number.isInteger(data.min_length) &&
    data.min_length >= 8 &&
    data.min_length <= 1024
      ? data.min_length
      : basePasswordPolicy.minLength;
  const max =
    typeof data.max_length === 'number' &&
    Number.isInteger(data.max_length) &&
    data.max_length >= min &&
    data.max_length <= 65536
      ? data.max_length
      : null;
  return {
    minLength: min,
    maxLength: max,
    uppercase: data.require_uppercase === true,
    lowercase: data.require_lowercase === true,
    number: data.require_numbers === true,
    special: data.require_special_char === true,
    specialCharacters:
      typeof data.allowed_special_characters === 'string'
        ? data.allowed_special_characters
        : defaultSpecialCharacters,
  };
}
/** Version-pinned Clerk JS 6 / Expo 4 adapter: reads only the already-loaded public policy. */
export function passwordPolicyFromClerk(clerk: unknown) {
  const environment = record(record(clerk).__internal_environment);
  const settings = record(
    environment.userSettings ?? environment.user_settings,
  );
  return passwordPolicyFromSettings(
    settings.passwordSettings ?? settings.password_settings,
  );
}
export type PasswordRule =
  'length' | 'maxLength' | 'uppercase' | 'lowercase' | 'number' | 'special';
export function passwordRequirements(password: string, policy: PasswordPolicy) {
  const checks: { id: PasswordRule; satisfied: boolean; count?: number }[] = [
    {
      id: 'length',
      satisfied: password.length >= policy.minLength,
      count: policy.minLength,
    },
  ];
  if (policy.maxLength !== null)
    checks.push({
      id: 'maxLength',
      satisfied: password.length > 0 && password.length <= policy.maxLength,
      count: policy.maxLength,
    });
  if (policy.uppercase)
    checks.push({ id: 'uppercase', satisfied: /[A-Z]/.test(password) });
  if (policy.lowercase)
    checks.push({ id: 'lowercase', satisfied: /[a-z]/.test(password) });
  if (policy.number)
    checks.push({ id: 'number', satisfied: /[0-9]/.test(password) });
  if (policy.special)
    checks.push({
      id: 'special',
      satisfied: Array.from(password).some((char) =>
        policy.specialCharacters.includes(char),
      ),
    });
  return checks;
}
export function passwordConfirmation(password: string, confirmation: string) {
  return !password || !confirmation
    ? null
    : password === confirmation
      ? 'match'
      : 'mismatch';
}

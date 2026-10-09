import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  basePasswordPolicy,
  passwordPolicyFromClerk,
  passwordPolicyFromSettings,
  passwordRequirements,
  passwordConfirmation,
} from '../src/auth/password-policy';
import {
  authErrorParams,
  mapClerkPasswordError,
} from '../src/auth/password-errors';
import { authErrorKey } from '../src/auth/helpers';
import { resources } from '../src/i18n/resources';

test('base UI policy: seven characters fail, eight pass; no invented character-class requirements', () => {
  assert.deepEqual(passwordRequirements('1234567', basePasswordPolicy), [
    { id: 'length', satisfied: false, count: 8 },
  ]);
  assert.deepEqual(passwordRequirements('12345678', basePasswordPolicy), [
    { id: 'length', satisfied: true, count: 8 },
  ]);
});
test('public Clerk environment overrides fallback before submit; development min 15 and max 0 has only the real length requirement', () => {
  const policy = passwordPolicyFromClerk({
    __internal_environment: {
      userSettings: {
        passwordSettings: {
          min_length: 15,
          max_length: 0,
          require_uppercase: false,
          require_lowercase: false,
          require_numbers: false,
          require_special_char: false,
        },
      },
    },
  });
  assert.equal(policy.minLength, 15);
  assert.equal(policy.maxLength, null);
  assert.equal(
    passwordRequirements('12345678901234', policy)[0]?.satisfied,
    false,
  );
  assert.equal(
    passwordRequirements('123456789012345', policy)[0]?.satisfied,
    true,
  );
  assert.equal(passwordRequirements('123456789012345', policy).length, 1);
});
test('configured classes and allowed symbols are used, including optional maximum, without changing Clerk validation', () => {
  const policy = passwordPolicyFromSettings({
    min_length: 8,
    max_length: 72,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_char: true,
    allowed_special_characters: '!@',
  });
  const missing = passwordRequirements('abcdefgh', policy);
  assert.deepEqual(
    missing.filter((rule) => !rule.satisfied).map((rule) => rule.id),
    ['uppercase', 'number', 'special'],
  );
  assert.ok(
    passwordRequirements('Abcdefg1!', policy).every((rule) => rule.satisfied),
  );
  assert.equal(
    passwordRequirements('Abcdefg1#', policy).find(
      (rule) => rule.id === 'special',
    )?.satisfied,
    false,
  );
  assert.equal(
    passwordRequirements('a'.repeat(73), policy).find(
      (rule) => rule.id === 'maxLength',
    )?.satisfied,
    false,
  );
});
test('absent/invalid settings fall back safely; no coercion of string flags or arbitrary requirement text', () => {
  assert.deepEqual(passwordPolicyFromClerk({}), basePasswordPolicy);
  assert.equal(
    passwordPolicyFromSettings({
      min_length: -1,
      max_length: 0,
      require_numbers: 'true',
    }).number,
    false,
  );
  assert.equal(
    passwordPolicyFromSettings({ min_length: 'secret-value' }).minLength,
    8,
  );
});
test('confirmation gives no feedback before both values, then live match/mismatch', () => {
  assert.equal(passwordConfirmation('', ''), null);
  assert.equal(passwordConfirmation('fixture-value', ''), null);
  assert.equal(passwordConfirmation('', 'fixture-value'), null);
  assert.equal(passwordConfirmation('fixture-value', 'fixture-value'), 'match');
  assert.equal(passwordConfirmation('fixture-value', 'different'), 'mismatch');
});
const error = (code: string, meta = {}) => ({
  errors: [
    {
      code,
      meta,
      message: 'never render arbitrary provider input',
      longMessage: 'never render arbitrary provider input',
    },
  ],
});
for (const [code, key] of [
  ['form_password_length_too_short', 'errors.passwordLength'],
  ['form_password_not_strong_enough', 'errors.passwordCommon'],
  ['form_password_pwned', 'errors.passwordCompromised'],
  ['form_password_length_too_long', 'errors.passwordLong'],
  ['form_password_size_in_bytes_exceeded', 'errors.passwordBytes'],
  ['form_password_missing_uppercase', 'errors.passwordUppercase'],
  ['form_password_missing_lowercase', 'errors.passwordLowercase'],
  ['form_password_missing_number', 'errors.passwordNumber'],
  ['form_password_missing_special_char', 'errors.passwordSpecial'],
] as const)
  test(`Clerk mapping: ${code}`, () => {
    assert.equal(mapClerkPasswordError(error(code)), key);
    assert.equal(authErrorKey(error(code)), key);
  });
test('Clerk structured complexity/min/max metadata produces precise localized keys, not raw messages', () => {
  for (const [field, key] of [
    ['require_uppercase', 'errors.passwordUppercase'],
    ['require_lowercase', 'errors.passwordLowercase'],
    ['require_numbers', 'errors.passwordNumber'],
    ['require_special_char', 'errors.passwordSpecial'],
  ] as const)
    assert.equal(
      mapClerkPasswordError(
        error('form_password_validation_failed', {
          requirements: { [field]: true },
        }),
      ),
      key,
    );
  assert.equal(
    mapClerkPasswordError(
      error('form_password_length_too_short', { min_length: 15 }),
    ),
    'errors.passwordMin',
  );
  assert.equal(
    mapClerkPasswordError(
      error('form_password_length_too_long', { max_length: 72 }),
    ),
    'errors.passwordMax',
  );
  assert.deepEqual(
    authErrorParams(
      error('form_password_length_too_short', { min_length: '15' }),
    ),
    { min: 15 },
  );
  assert.deepEqual(
    authErrorParams(
      error('form_password_length_too_long', { max_length: 'raw-value' }),
    ),
    {},
  );
  assert.equal(mapClerkPasswordError(error('form_password_incorrect')), null);
  assert.equal(mapClerkPasswordError({ code: 'NETWORK_ERROR' }), null);
});
test('password UX and error strings exist in IT/EN, including the exact breach message', () => {
  const it = resources.it.auth,
    en = resources.en.auth;
  assert.deepEqual(
    Object.keys(it.requirements).sort(),
    Object.keys(en.requirements).sort(),
  );
  assert.deepEqual(
    Object.keys(it.errors).sort(),
    Object.keys(en.errors).sort(),
  );
  assert.equal(
    it.errors.passwordCompromised,
    "Questa password è comparsa in precedenti violazioni di dati. Scegline un'altra.",
  );
  assert.equal(
    en.errors.passwordCompromised,
    'This password has appeared in known data breaches. Choose another one.',
  );
});

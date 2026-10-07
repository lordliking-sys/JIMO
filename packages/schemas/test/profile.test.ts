import assert from 'node:assert/strict';
import { test } from 'node:test';
import { profileUpdateSchema } from '../src/profile';
test('profile updates validate extensible application locale and forbid identity fields', () => {
  for (const locale of ['system', 'it', 'en'])
    assert.equal(profileUpdateSchema.parse({ locale }).locale, locale);
  for (const input of [
    { locale: 'fr' },
    { displayName: '' },
    { displayName: ' '.repeat(2) },
    { displayName: 'x'.repeat(121) },
    { unitSystem: 'kg' },
    { userId: 'user_fixture' },
    { authSubject: 'user_fixture' },
    {},
  ])
    assert.equal(profileUpdateSchema.safeParse(input).success, false);
  assert.deepEqual(
    profileUpdateSchema.parse({
      displayName: ' Jimo ',
      unitSystem: 'imperial',
    }),
    { displayName: 'Jimo', unitSystem: 'imperial' },
  );
});

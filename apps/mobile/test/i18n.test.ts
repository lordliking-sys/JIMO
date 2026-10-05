import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInstance } from 'i18next';
import { resolveLocale } from '../src/i18n/locale';
import { resources } from '../src/i18n/resources';
test('locale detection normalizes supported device languages and falls back to English', () => {
  for (const device of ['it', 'it-IT', 'IT_ch'])
    assert.equal(resolveLocale('system', device), 'it');
  for (const device of ['en-US', 'fr-FR', null, undefined, ''])
    assert.equal(resolveLocale('system', device), 'en');
  assert.equal(resolveLocale('en', 'it-IT'), 'en');
  assert.equal(resolveLocale('it', 'en-US'), 'it');
});
function flatten(value: unknown, prefix = ''): Record<string, string> {
  assert.ok(value && typeof value === 'object');
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof item === 'string') {
      assert.ok(item.length > 0);
      result[path] = item;
    } else Object.assign(result, flatten(item, path));
  }
  return result;
}
test('Italian and English have matching nonempty keys and interpolation parameters', () => {
  const en = flatten(resources.en);
  const it = flatten(resources.it);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(it).sort());
  for (const [key, text] of Object.entries(en))
    assert.deepEqual(text.match(/{{[^}]+}}/g), it[key]?.match(/{{[^}]+}}/g));
});
test('language switches immediately and pluralized training days translate', async () => {
  const instance = createInstance();
  await instance.init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
  });
  assert.equal(instance.t('language'), 'Language');
  assert.equal(
    instance.t('onboarding:days.option', { count: 3 }),
    '3 days per week',
  );
  await instance.changeLanguage('it');
  assert.equal(instance.t('language'), 'Lingua');
  assert.equal(
    instance.t('onboarding:days.option', { count: 1 }),
    '1 giorno a settimana',
  );
  assert.equal(
    instance.t('onboarding:days.option', { count: 3 }),
    '3 giorni a settimana',
  );
});

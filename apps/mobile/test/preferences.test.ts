import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onboardingSchema } from '@jimo/schemas';
import {
  createPreferencesStore,
  decodePreferences,
  defaultPreferences,
  finishOnboarding,
  initialDestination,
} from '../src/storage/preferences';
const data = onboardingSchema.parse({
  locale: 'en',
  goal: 'muscle',
  experienceLevel: 'intermediate',
  trainingDaysPerWeek: 4,
  equipment: ['barbell', 'dumbbells'],
  startMethod: 'ai',
});
test('first launch routes to onboarding; persisted completion skips it on second launch', async () => {
  let stored: string | null = null;
  const store = createPreferencesStore({
    getItem: async () => stored,
    setItem: async (_key, value) => {
      stored = value;
    },
  });
  const first = await store.load();
  assert.equal(initialDestination(first), '/onboarding');
  const completed = finishOnboarding(first, data);
  await store.save(completed);
  const second = await store.load();
  assert.equal(initialDestination(second), '/');
  assert.deepEqual(second.onboarding, data);
  assert.equal(second.localePreference, 'en');
  await store.save({ ...second, localePreference: 'system' });
  assert.equal((await store.load()).localePreference, 'system');
  assert.equal((await store.load()).onboardingCompleted, true);
});
test('corrupt, unknown-version and incomplete-completion storage safely fall back', () => {
  for (const raw of [
    'invalid-json',
    '{}',
    JSON.stringify({ ...defaultPreferences(), version: 2 }),
    JSON.stringify({ ...defaultPreferences(), onboardingCompleted: true }),
  ])
    assert.deepEqual(decodePreferences(raw), defaultPreferences());
});
test('storage failures remain failures and do not pretend onboarding was saved', async () => {
  const store = createPreferencesStore({
    getItem: async () => {
      throw new Error('read denied');
    },
    setItem: async () => {
      throw new Error('write denied');
    },
  });
  await assert.rejects(store.load(), /read denied/);
  await assert.rejects(
    store.save(finishOnboarding(defaultPreferences(), data)),
    /write denied/,
  );
  assert.throws(() =>
    finishOnboarding(defaultPreferences(), { ...data, trainingDaysPerWeek: 0 }),
  );
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onboardingSchema } from '@jimo/schemas';
import { canContinue } from '../src/onboarding/state';
const valid = {
  locale: 'system',
  goal: 'strength',
  experienceLevel: 'beginner',
  trainingDaysPerWeek: 3,
  equipment: ['bodyweight'],
  startMethod: 'manual',
};
test('onboarding accepts a valid profile and all starting methods', () => {
  const parsed = onboardingSchema.parse(valid);
  assert.equal(parsed.trainingDaysPerWeek, 3);
  for (const startMethod of ['ai', 'import', 'manual'])
    assert.equal(
      onboardingSchema.safeParse({ ...valid, startMethod }).success,
      true,
    );
});
test('onboarding rejects incomplete, unknown and inconsistent input', () => {
  for (const input of [
    {},
    { ...valid, locale: 'fr' },
    { ...valid, goal: 'unknown' },
    { ...valid, equipment: [] },
    { ...valid, equipment: ['bodyweight', 'bodyweight'] },
    { ...valid, equipment: ['unknown'] },
    { ...valid, startMethod: 'unknown' },
    ...[0, 8, 1.5, '3'].map((trainingDaysPerWeek) => ({
      ...valid,
      trainingDaysPerWeek,
    })),
  ])
    assert.equal(onboardingSchema.safeParse(input).success, false);
});
test('step gating requires explicit choices and supports revisiting earlier steps', () => {
  assert.equal(canContinue(0, {}), true);
  assert.equal(canContinue(1, {}), true);
  for (const step of [2, 3, 4, 5, 6, 99])
    assert.equal(canContinue(step, {}), false);
  const draft = onboardingSchema.parse(valid);
  for (const step of [2, 3, 4, 5]) assert.equal(canContinue(step, draft), true);
  assert.equal(canContinue(5, { ...draft, equipment: [] }), false);
});

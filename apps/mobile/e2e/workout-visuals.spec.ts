import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { workoutFixture } from './workout-fixture';

async function dipFixture(page: Page) {
  const fixture = await workoutFixture(page);
  fixture.setStarted();
  fixture.workout.name = 'INTENSITÀ';
  const exercise = fixture.workout.exercises[0]!;
  exercise.exerciseNameSnapshot = 'DIP';
  exercise.loadModeSnapshot = 'weighted';
  const original = exercise.sets[0]!;
  exercise.sets = Array.from({ length: 5 }, (_, i) => ({
    ...original,
    id: randomUUID(),
    setNumber: i + 1,
    targetReps: null,
    targetRepMin: 5,
    targetRepMax: 8,
    targetLoadKg: '20.00',
  }));
  fixture.workout.pendingSets = 9;
  return fixture;
}

test('standard anime pink: live values, accessible controls and responsive layout', async ({
  page,
}, info) => {
  const fixture = await dipFixture(page);
  await page.goto(`/workout/${fixture.workout.id}`);
  await expect(page.getByText('DIP', { exact: true })).toBeVisible();
  await expect(page.getByLabel('5–8 reps · +20 kg · RPE 8')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('01-standard.png') });
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const label of [
      'Diminuisci Ripetizioni',
      'Aumenta Ripetizioni',
      'Diminuisci Zavorra',
      'Aumenta Zavorra',
      '✓ Completa serie',
      'Salta serie',
    ]) {
      const bounds = await page
        .getByRole('button', { name: label, exact: true })
        .boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(48);
      expect(bounds?.height).toBeGreaterThanOrEqual(48);
    }
  }
  expect(
    fixture.writes.filter((w) => w.path.includes('workout-sets')),
  ).toHaveLength(0);
});

test('rest: timer follows the saved timestamp and preserves correction and skip', async ({
  page,
}, info) => {
  const now = new Date('2026-10-07T10:00:00Z');
  await page.clock.install({ time: now });
  const fixture = await dipFixture(page),
    set = fixture.workout.exercises[0]!.sets[0]!;
  Object.assign(set, {
    status: 'completed',
    actualReps: 5,
    actualLoadKg: '20.00',
    actualRpe: '8.0',
    completedAt: new Date(now.getTime() - 63000).toISOString(),
  });
  fixture.workout.completedSets = 1;
  fixture.workout.pendingSets--;
  await page.goto(`/workout/${fixture.workout.id}`);
  const timer = page.getByRole('progressbar', { name: /RECUPERO/ });
  await expect(timer).toHaveAttribute('aria-valuenow', /11[0-7]/);
  const before = Number(await timer.getAttribute('aria-valuenow'));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('02-rest.png') });
  await page.clock.runFor(3000);
  await expect
    .poll(async () => Number(await timer.getAttribute('aria-valuenow')))
    .toBeLessThanOrEqual(before - 3);
  await expect(
    page.getByRole('button', { name: 'Correggi serie 1', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Salta recupero', exact: true })
    .click();
  await expect(page.getByLabel('Serie 2 di 5', { exact: true })).toBeVisible();
});

test('Workout hub and active action menu expose only real sessions, without preview actions', async ({
  page,
}) => {
  const fixture = await workoutFixture(page);
  fixture.setStarted();
  await page.goto('/workout');
  await expect(
    page.getByRole('button', { name: 'Riprendi allenamento', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Anteprima/ })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Riprendi allenamento', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '✓ Completa serie', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('button', { name: 'Azioni allenamento', exact: true })
    .click();
  await expect(page.getByRole('button', { name: /Anteprima/ })).toHaveCount(0);
  await expect(page.getByText('PREVIEW', { exact: true })).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
});

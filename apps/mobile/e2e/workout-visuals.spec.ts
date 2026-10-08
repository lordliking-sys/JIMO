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

test('standard sumi-e: live values, accessible controls and responsive layout', async ({
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

test('EMOM and pyramid are isolated visual previews and never save a workout', async ({
  page,
}, info) => {
  const fixture = await workoutFixture(page);
  await page.goto('/workout');
  await page
    .getByRole('button', { name: 'Anteprima EMOM', exact: true })
    .click();
  await expect(page.getByText('PREVIEW', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Anteprima visiva · nessun allenamento viene registrato', {
      exact: true,
    }),
  ).toHaveCount(0);
  const timer = page.getByRole('progressbar', {
    name: 'EMOM 00:38',
    exact: true,
  });
  await expect(timer).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('03-emom.png') });
  await page
    .getByRole('button', { name: 'Informazioni anteprima', exact: true })
    .click();
  await expect(
    page.getByText(/Timer e avviso sonoro sono dimostrativi/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await page
    .getByRole('button', { name: 'Anteprima piramidale', exact: true })
    .click();
  await expect(
    page.getByText('Progressione piramide', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('04-pyramid.png') });
  await page
    .getByRole('button', { name: 'Aumenta Carico', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Modifica manualmente Carico',
      exact: true,
    }),
  ).toHaveText('82,5 kg');
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(fixture.writes).toEqual([]);
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await page
    .getByRole('button', { name: 'Anteprima piramidale', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Modifica manualmente Carico',
      exact: true,
    }),
  ).toHaveText('80 kg');
  expect(fixture.writes).toEqual([]);
});

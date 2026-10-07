import { test, expect } from '@playwright/test';
import { workoutFixture } from './workout-fixture';
import { manualField, valueButton } from './helpers';
/** Real Expo SQLite web/OPFS; only the API transport is intercepted. We leave
 * bundled assets reachable during reload, unlike a native app's bundled JS. */
test('SQLite web: cached offline start, CHECK, restart, correction, completion and reconnect sync', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const fixture = await workoutFixture(page),
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/workout');
  await expect(
    page
      .getByRole('button', { name: 'Inizia allenamento', exact: true })
      .first(),
  ).toBeEnabled();
  let offline = true;
  await page.route('http://localhost:4301/**', (route) =>
    offline ? route.abort('internetdisconnected') : route.fallback(),
  );
  // Start and CHECK both commit SQLite while every API request is failing.
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .first()
    .click();
  await expect(page.getByLabel('Serie 1 di 2', { exact: true })).toBeVisible();
  const url = page.url();
  await page
    .getByRole('button', { name: 'Diminuisci Ripetizioni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Aumenta Carico', exact: true })
    .click();
  await manualField(page, 'RPE');
  await page.getByRole('button', { name: 'RPE 9', exact: true }).click();
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  expect(fixture.writes.length).toBe(0);
  await page.reload();
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Correggi serie 1', exact: true })
    .click();
  await expect(valueButton(page, 'Ripetizioni')).toHaveText('7');
  await page
    .getByRole('button', { name: 'Diminuisci Ripetizioni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Salva correzione', exact: true })
    .click();
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Salta recupero', exact: true })
    .click();
  await expect(page.getByLabel('Serie 2 di 2', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await expect(
    page.getByText('Esercizio completato', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('Trazioni', { exact: true })).toBeVisible();
  expect(fixture.writes.length).toBe(0);
  await page
    .getByRole('button', { name: 'Azioni allenamento', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Termina prima', exact: true })
    .click();
  await page.getByRole('button', { name: 'Conferma', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Torna agli allenamenti', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Torna agli allenamenti', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('offline-completed.png') });
  offline = false;
  await page.getByRole('button', { name: 'Riprova', exact: true }).click();
  await expect.poll(() => fixture.workout.status).toBe('completed');
  const set = fixture.workout.exercises[0]!.sets[0]!;
  expect([
    set.targetReps,
    set.targetLoadKg,
    set.targetRpe,
    set.actualReps,
    set.actualLoadKg,
    set.actualRpe,
  ]).toEqual([8, '80.00', '8.0', 6, '82.50', '9.0']);
  expect(page.url()).toBe(url);
  expect(errors).toEqual([]);
});

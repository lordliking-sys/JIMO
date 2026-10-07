import { expect, test } from '@playwright/test';
import { workoutFixture } from './workout-fixture';
import { manualField, valueButton } from './helpers';
test.use({ timezoneId: 'Europe/Rome' });
test('workout actual draft, retry, rest resume, correction, all modes and history', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const fixture = await workoutFixture(page),
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/workout');
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .first()
    .click();
  await expect(page.getByText('Panca piana', { exact: true })).toBeVisible();
  await expect(valueButton(page, 'Ripetizioni')).toHaveText('8');
  await expect(valueButton(page, 'Carico')).toHaveText('80 kg');
  expect(fixture.workout.exercises[0]!.sets[0]!.actualReps).toBeNull();
  expect(
    fixture.writes.filter((w) => w.path.includes('workout-sets')),
  ).toHaveLength(0);
  await page
    .getByRole('button', { name: 'Diminuisci Ripetizioni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Aumenta Carico', exact: true })
    .click();
  await manualField(page, 'RPE');
  await page.getByRole('button', { name: 'RPE 9', exact: true }).click();
  fixture.fail();
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  // Internet/API failure no longer blocks a successful SQLite CHECK or rest.
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Sincronizzazione non riuscita', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Riprova', exact: true }).click();
  await expect
    .poll(() => fixture.workout.exercises[0]!.sets[0]!.actualReps)
    .toBe(7);
  const s = fixture.workout.exercises[0]!.sets[0]!;
  expect(s.actualReps).toBe(7);
  expect(s.actualLoadKg).toBe('82.50');
  expect(s.actualRpe).toBe('9.0');
  expect(s.targetLoadKg).toBe('80.00');
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Salta recupero', exact: true }),
    ).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('rest.png') });
  await page.reload();
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Correggi serie 1', exact: true })
    .click();
  await expect(valueButton(page, 'Ripetizioni')).toHaveText('7');
  await page
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  const completedAt = s.completedAt;
  await page
    .getByRole('button', { name: 'Salva correzione', exact: true })
    .click();
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  await expect.poll(() => s.actualReps).toBe(8);
  expect(s.completedAt).toBe(completedAt);
  await page
    .getByRole('button', { name: 'Salta recupero', exact: true })
    .click();
  await expect(page.getByLabel('Serie 2 di 2', { exact: true })).toBeVisible();
  await expect(valueButton(page, 'Carico')).toHaveText('80 kg');
  await page.reload();
  await expect(page.getByLabel('Serie 2 di 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salta serie', exact: true }).click();
  await expect(
    page.getByText('Esercizio completato', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await expect(valueButton(page, 'Zavorra')).toHaveText('+20 kg');
  await expect(
    page.getByLabel('8 reps · +20 kg · RPE 8', { exact: true }),
  ).toBeVisible();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await page
      .getByRole('button', { name: '✓ Completa serie', exact: true })
      .boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(48);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('weighted.png') });
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await expect(page.getByText('Push-Up', { exact: true })).toBeVisible();
  await expect(valueButton(page, 'Carico')).toHaveCount(0);
  await expect(valueButton(page, 'Zavorra')).toHaveCount(0);
  await expect(valueButton(page, 'Assistenza')).toHaveCount(0);
  await manualField(page, 'RPE');
  await page.getByRole('button', { name: 'Nessun RPE', exact: true }).click();
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await expect(valueButton(page, 'Assistenza')).toHaveText('15 kg');
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await expect(valueButton(page, 'Durata')).toHaveText('60 sec');
  await expect(valueButton(page, 'Ripetizioni')).toHaveCount(0);
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await expect(
    page.getByText('Allenamento completato', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Termina allenamento', exact: true })
    .click();
  await expect(page.getByText('Completato', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Torna agli allenamenti', exact: true }),
  ).toBeVisible();
  await expect.poll(() => fixture.workout.status).toBe('completed');
  expect(fixture.workout.completedSets).toBe(5);
  expect(fixture.workout.skippedSets).toBe(1);
  await page.goto('/progress');
  await expect(
    page.getByText('STORICO ALLENAMENTI', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Riepilogo allenamento', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '✓ Completa serie', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText('TARGET', { exact: true })).toHaveCount(2);
  await expect(page.getByText('TARGET', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
test('Home week schedule, today marker, active resume, finish confirmation and cancel', async ({
  page,
}, info) => {
  const fixture = await workoutFixture(page);
  await page.clock.install({ time: new Date('2026-10-07T10:00:00Z') });
  await page.goto('/');
  for (const day of ['Lunedì', 'Mercoledì', 'Venerdì'])
    await expect(
      page.getByRole('button', { name: new RegExp(`${day}:.*programmato`) }),
    ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Mercoledì: oggi, programmato/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Lunedì: programmato/ }).click();
  await expect(page.getByText('PUSH', { exact: true })).toBeVisible();
  const sunday = await page
    .getByRole('button', { name: /Domenica: non programmato/ })
    .boundingBox();
  expect(sunday?.width).toBeGreaterThanOrEqual(48);
  expect(sunday!.x + sunday!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('home-week.png') });
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Azioni allenamento', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Termina prima', exact: true })
    .click();
  await expect(
    page.getByText(
      'Ci sono serie da eseguire. Vuoi saltarle e terminare l’allenamento?',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Riprendi allenamento', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Riprendi allenamento', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Azioni allenamento', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Annulla allenamento', exact: true })
    .click();
  await expect(
    page.getByText(
      'Annullare questo allenamento? Verrà conservato nello storico come annullato.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Conferma', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Torna agli allenamenti', exact: true }),
  ).toBeVisible();
  await expect.poll(() => fixture.workout.status).toBe('cancelled');
  expect(fixture.workout.skippedSets).toBe(6);
});

test('English weighted range target, explicit manual decimal and visible keyboard footer', async ({
  page,
}) => {
  const fixture = await workoutFixture(page, 'en');
  fixture.setStarted();
  const exercise = fixture.workout.exercises[1]!;
  fixture.workout.exercises = [exercise];
  fixture.workout.exercisesCount = 1;
  fixture.workout.pendingSets = 1;
  const set = exercise.sets[0]!;
  set.targetReps = null;
  set.targetRepMin = 6;
  set.targetRepMax = 10;
  await page.goto(`/workout/${fixture.workout.id}`);
  await expect(valueButton(page, 'Repetitions', 'en')).toHaveText('6');
  await expect(
    page.getByText(
      'Range target: the initial value is the prescribed minimum.',
      { exact: true },
    ),
  ).toHaveCount(0);
  await expect(
    page.getByLabel('6–10 reps · +20 kg · RPE 8', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 430 });
  const field = await manualField(page, 'Added weight', 'en');
  await field.fill('22.50');
  const footer = page.getByRole('button', {
    name: '✓ Complete set',
    exact: true,
  });
  await expect(footer).toBeVisible();
  await expect
    .poll(async () => {
      const input = await field.boundingBox(),
        button = await footer.boundingBox();
      return (
        input !== null &&
        button !== null &&
        input.y >= 0 &&
        input.y + input.height <= button.y
      );
    })
    .toBe(true);
  await page
    .getByRole('button', { name: 'Confirm Added weight', exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await manualField(page, 'RPE', 'en');
  await page.getByRole('button', { name: 'No RPE', exact: true }).click();
  await footer.click();
  await expect(
    page.getByText('Workout complete', { exact: true }),
  ).toBeVisible();
  await expect.poll(() => set.actualReps).toBe(6);
  expect(set.actualLoadKg).toBe('22.50');
  expect(set.actualRpe).toBeNull();
  await page
    .getByRole('button', { name: 'Finish workout', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Back to workouts', exact: true }),
  ).toBeVisible();
});

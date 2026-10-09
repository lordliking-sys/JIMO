import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { builderFixture } from './builder-fixture';
import { manualField, valueButton } from './helpers';

async function setManual(page: Page, label: string, value: string) {
  await (await manualField(page, label)).fill(value);
  await page
    .getByRole('button', { name: `Conferma ${label}`, exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: label, exact: true }),
  ).toHaveCount(0);
}
async function structure(page: Page) {
  if (page.url().includes('/day-detail'))
    await page.getByRole('button', { name: 'Indietro', exact: true }).click();
}
async function openDay(page: Page, name: string) {
  if (page.url().includes('/day-detail')) {
    if (
      (await page.getByRole('heading').allTextContents()).some((text) =>
        text.endsWith(name),
      )
    )
      return;
    await structure(page);
  }
  await page
    .getByRole('button', { name: `Apri giornata ${name}`, exact: true })
    .click();
}
async function addDay(page: Page, name: string, weekday: string) {
  await structure(page);
  await page
    .getByRole('button', { name: '+ Aggiungi giorno', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Nome giornata', exact: true })
    .fill(name);
  await page.getByRole('button', { name: weekday, exact: true }).click();
  await expect(
    page.getByRole('textbox', {
      name: 'Giorno settimana (opzionale)',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByText(/1 = lunedì/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Salva giorno', exact: true }).click();
  await expect(
    page.getByText(name, { exact: true }).filter({ visible: true }),
  ).toBeVisible();
}
async function addExercise(
  page: Page,
  day: string,
  name: string,
  mode: string,
  sets: number,
  reps: number | string,
  weight: string,
  rest: string,
) {
  await openDay(page, day);
  await page
    .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Cerca esercizio', exact: true })
    .fill(name);
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: mode, exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Serie', exact: true }),
  ).toHaveCount(0);
  for (let n = 3; n < sets; n++)
    await page
      .getByRole('button', { name: 'Aumenta Serie', exact: true })
      .click();
  if (typeof reps === 'string') {
    await page.getByRole('button', { name: 'Range reps', exact: true }).click();
    await expect(valueButton(page, 'Ripetizioni minime')).toHaveText('8');
    await expect(valueButton(page, 'Ripetizioni massime')).toHaveText('12');
  } else
    for (let n = 8; n < reps; n++)
      await page
        .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
        .click();
  await setManual(
    page,
    mode === 'Zavorra' ? 'Carico aggiunto (kg)' : 'Carico (kg)',
    weight,
  );
  await page.getByRole('button', { name: 'RPE 8', exact: true }).click();
  await page.getByRole('button', { name: rest, exact: true }).click();
  await page
    .getByRole('button', { name: 'Salva esercizio', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: `Modifica esercizio ${name}`,
      exact: true,
    }),
  ).toBeVisible();
}

test('FORZA: build PUSH/PULL, four full prescriptions, reload, tap-to-edit and secondary program actions', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const fixture = await builderFixture(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/program/manual');
  await page
    .getByRole('textbox', { name: 'Nome programma', exact: true })
    .fill('FORZA');
  await page.getByRole('button', { name: '8 settimane', exact: true }).click();
  await page.locator('input[type="date"]').fill('2026-10-06');
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await addDay(page, 'PUSH', 'Lunedì');
  await addExercise(
    page,
    'PUSH',
    'Panca piana',
    'Carico esterno',
    4,
    8,
    '80',
    '3:00',
  );
  await addExercise(page, 'PUSH', 'Dip', 'Zavorra', 3, '8-12', '10', '2:00');
  await addDay(page, 'PULL', 'Venerdì');
  await addExercise(page, 'PULL', 'Trazioni', 'Zavorra', 4, 8, '20', '3:00');
  await addExercise(
    page,
    'PULL',
    'Rematore con bilanciere',
    'Carico esterno',
    4,
    10,
    '70',
    '2:00',
  );
  await structure(page);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'FORZA', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Impostazioni', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('8 settimane · 6 ottobre 2026', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('2026-10-06', { exact: true })).toHaveCount(0);
  const summaries = [
    '4 × 8 · 80 kg',
    '3 × 8–12 · +10 kg',
    '4 × 8 · +20 kg',
    '4 × 10 · 70 kg',
  ];
  for (const [index, day] of ['PUSH', 'PULL'].entries()) {
    await openDay(page, day);
    for (const text of summaries.slice(index * 2, index * 2 + 2))
      await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(
      page.getByText('RPE 8 · Recupero 3:00', { exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByText('RPE 8 · Recupero 2:00', { exact: true }),
    ).toHaveCount(1);
    await structure(page);
  }
  expect(fixture.program.days.map((day) => day.dayOfWeek)).toEqual([1, 5]);
  expect(
    fixture.program.days.map((day) =>
      day.exercises.map((e) => [
        e.targetSets,
        e.targetLoadKg,
        e.targetRpe,
        e.restSeconds,
      ]),
    ),
  ).toEqual([
    [
      [4, '80.00', '8.0', 180],
      [3, '10.00', '8.0', 120],
    ],
    [
      [4, '20.00', '8.0', 180],
      [4, '70.00', '8.0', 120],
    ],
  ]);
  await expect(
    page.getByRole('button', { name: 'Modifica programma', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Archivia programma', exact: true }),
  ).toHaveCount(0);
  await openDay(page, 'PUSH');
  for (const width of [320, 390, 393, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const row of await page
      .getByRole('button', { name: /^Modifica esercizio / })
      .all())
      expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await structure(page);
  // Capture the content at the top of the builder rather than an administrative action stack.
  await page
    .getByRole('heading', { name: 'FORZA', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('forza-builder.png') });
  await openDay(page, 'PUSH');
  await page
    .getByRole('button', {
      name: 'Modifica esercizio Panca piana',
      exact: true,
    })
    .click();
  await expect(valueButton(page, 'Carico (kg)')).toHaveText('80 kg');
  await expect(valueButton(page, 'Serie')).toHaveText('4');
  await expect(valueButton(page, 'Ripetizioni')).toHaveText('8');
  await expect(
    page.getByRole('button', { name: 'RPE 8', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  const manualLoad = await manualField(page, 'Carico (kg)');
  await manualLoad.fill('81,25');
  await page.setViewportSize({ width: 320, height: 430 });
  await manualLoad.focus();
  await expect(async () => {
    const field = await manualLoad.boundingBox();
    const footer = await page
      .getByRole('button', { name: 'Salva modifiche', exact: true })
      .boundingBox();
    expect(field!.width).toBeGreaterThanOrEqual(48);
    expect(field!.y).toBeGreaterThanOrEqual(0);
    expect(field!.y + field!.height).toBeLessThanOrEqual(footer!.y);
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(430);
  }).toPass({ timeout: 10000 });
  await page
    .getByRole('button', { name: 'Conferma Carico (kg)', exact: true })
    .click();
  await expect(manualLoad).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Aumenta Carico (kg)', exact: true })
    .click();
  await expect(valueButton(page, 'Carico (kg)')).toHaveText('83,75 kg');
  await page.getByRole('button', { name: 'RPE 8,5', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Note (opzionali)', exact: true })
    .fill('Tempo 3-1-1');
  await page
    .getByRole('button', { name: 'Salva modifiche', exact: true })
    .click();
  await expect(
    page.getByText('4 × 8 · 83,75 kg', { exact: true }),
  ).toBeVisible();
  expect(fixture.program.days[0]!.exercises[0]).toMatchObject({
    targetLoadKg: '83.75',
    targetRpe: '8.5',
    notes: 'Tempo 3-1-1',
  });
  await structure(page);
  await page
    .getByRole('button', { name: 'Attiva programma', exact: true })
    .click();
  await expect(page.getByText('ATTIVO', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Attiva programma', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Azioni programma', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Archivia programma', exact: true })
    .click();
  await expect(
    page.getByText(
      'Archiviare il programma attivo? Lo storico sarà conservato.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Conferma', exact: true }).click();
  await expect(page.getByText('ARCHIVIATO', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  if (page.url().includes('/manage'))
    await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await page.getByRole('tab', { name: 'Profilo', exact: true }).click();
  await page.getByRole('button', { name: /Lingua/ }).click();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.getByRole('tab', { name: 'Program', exact: true }).click();
  await page.getByRole('button', { name: /^Open FORZA, / }).click();
  await expect(
    page.getByText('8 weeks · October 6, 2026', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('day chips, weighted/assisted/bodyweight editing and contextual reorder/removal preserve existing contracts', async ({
  page,
}) => {
  test.setTimeout(60000);
  const fixture = await builderFixture(page);
  await page.goto('/program/manual');
  await page
    .getByRole('textbox', { name: 'Nome programma', exact: true })
    .fill('Routine');
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await addDay(page, 'PULL', 'Lunedì');
  await addExercise(page, 'PULL', 'Trazioni', 'Zavorra', 4, 8, '20', '3:00');
  await page
    .getByRole('button', { name: 'Modifica esercizio Trazioni', exact: true })
    .click();
  await expect(valueButton(page, 'Carico aggiunto (kg)')).toHaveText('+20 kg');
  await page.getByRole('button', { name: 'Assistito', exact: true }).click();
  await expect(valueButton(page, 'Carico aggiunto (kg)')).toHaveCount(0);
  await expect(valueButton(page, 'Carico (kg)')).toHaveCount(0);
  await expect(
    page.getByText('Più kg significano maggiore assistenza.', { exact: true }),
  ).toBeVisible();
  await setManual(page, 'Assistenza (kg)', '15');
  await page
    .getByRole('button', { name: 'Diminuisci Serie', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  await page.getByRole('button', { name: 'Nessun RPE', exact: true }).click();
  await page
    .getByRole('button', { name: 'Salva modifiche', exact: true })
    .click();
  await expect(
    page.getByText('3 × 10 · Assistenza 15 kg', { exact: true }),
  ).toBeVisible();
  expect(fixture.program.days[0]!.exercises[0]).toMatchObject({
    loadMode: 'assisted',
    targetLoadKg: null,
    targetAssistanceKg: '15.00',
    targetRpe: null,
  });
  await page
    .getByRole('button', { name: 'Modifica esercizio Trazioni', exact: true })
    .click();
  await page.getByRole('button', { name: 'Corpo libero', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /^Modifica manualmente .*\(kg\)$/ }),
  ).toHaveCount(0);
  await expect(valueButton(page, 'Serie')).toHaveText('3');
  await expect(valueButton(page, 'Ripetizioni')).toHaveText('10');
  await page.getByRole('button', { name: 'RPE 8', exact: true }).click();
  await page.getByRole('button', { name: '90 sec', exact: true }).click();
  await page
    .getByRole('button', { name: 'Salva modifiche', exact: true })
    .click();
  await expect(
    page.getByText('3 × 10 · Corpo libero', { exact: true }),
  ).toBeVisible();
  expect(fixture.program.days[0]!.exercises[0]).toMatchObject({
    loadMode: 'bodyweight',
    targetLoadKg: null,
    targetAssistanceKg: null,
    restSeconds: 90,
  });
  await page
    .getByRole('button', { name: 'Azioni giornata PULL', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Modifica giorno', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Lunedì', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'Nessun giorno specifico', exact: true })
    .click();
  await page.getByRole('button', { name: 'Salva giorno', exact: true }).click();
  await expect(page.getByText('1 esercizio', { exact: true })).toBeVisible();
  expect(fixture.program.days[0]!.dayOfWeek).toBeNull();
  await addExercise(page, 'PULL', 'Dip', 'Zavorra', 3, '8-12', '10', '2:00');
  await page
    .getByRole('button', { name: 'Azioni esercizio Trazioni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Sposta giù Trazioni', exact: true })
    .click();
  await expect(async () =>
    expect(
      fixture.program.days[0]!.exercises.map((e) => e.exercise.displayName),
    ).toEqual(['Dip', 'Trazioni']),
  ).toPass();
  await page
    .getByRole('button', { name: 'Azioni esercizio Dip', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Rimuovi esercizio Dip', exact: true })
    .click();
  await expect(
    page.getByText('Rimuovere questo esercizio dal programma?', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Conferma', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Modifica esercizio Dip', exact: true }),
  ).toHaveCount(0);
  expect(fixture.program.days[0]!.exercises[0]!.position).toBe(0);
});

import { expect, test, type Page } from '@playwright/test';
import { builderFixture } from './builder-fixture';
const sizes = [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
];
async function fit(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test('v2 management: real program form, inline validation, dates, days, reorder and safe contextual deletion', async ({
  page,
}, info) => {
  const fixture = await builderFixture(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/program/manage');
  await expect(
    page.getByRole('heading', { name: 'PROGRAMMI', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Libreria', { exact: true })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Crea programma', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await expect(
    page.getByText('Inserisci un nome.', { exact: true }),
  ).toBeVisible();
  expect(fixture.writes.filter((w) => w.method === 'POST')).toHaveLength(0);
  await page.getByLabel('Nome programma', { exact: true }).fill('Routine v2');
  await page
    .getByLabel('Descrizione (opzionale)', { exact: true })
    .fill('Routine personale');
  await page.getByRole('button', { name: '8 settimane', exact: true }).click();
  await page.locator('input[type="date"]').fill('2026-10-20');
  await expect(
    page.getByText('20 ottobre 2026', { exact: true }),
  ).toBeVisible();
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await fit(page);
    expect(
      (await page
        .getByRole('button', { name: 'Continua', exact: true })
        .boundingBox())!.height,
    ).toBeGreaterThanOrEqual(48);
    await page.screenshot({
      path: info.outputPath(`create-${viewport.width}.png`),
    });
  }
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  for (const [name, weekday] of [
    ['Prima giornata', 'Lunedì'],
    ['Seconda giornata', 'Venerdì'],
  ]) {
    await page
      .getByRole('button', { name: '+ Aggiungi giorno', exact: true })
      .click();
    await page.getByLabel('Nome giornata', { exact: true }).fill(name!);
    await page.getByRole('button', { name: weekday!, exact: true }).click();
    await page
      .getByRole('button', { name: 'Salva giorno', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: `Apri giornata ${name}`, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole('button', {
      name: 'Azioni giornata Prima giornata',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Modifica giorno', exact: true })
    .click();
  await page.getByRole('button', { name: 'Mercoledì', exact: true }).click();
  await page.getByRole('button', { name: 'Salva giorno', exact: true }).click();
  expect(fixture.program.days[0]?.dayOfWeek).toBe(3);
  await page
    .getByRole('button', {
      name: 'Azioni giornata Prima giornata',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Sposta giù Prima giornata', exact: true })
    .click();
  await expect(async () =>
    expect(fixture.program.days.map((d) => d.name)).toEqual([
      'Seconda giornata',
      'Prima giornata',
    ]),
  ).toPass();
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await fit(page);
    await page.screenshot({
      path: info.outputPath(`structure-${viewport.width}.png`),
    });
  }
  await page
    .getByRole('button', { name: 'Apri giornata Prima giornata', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: /GIORNO 2/ })).toBeVisible();
  await page
    .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
    .click();
  await page.getByLabel('Cerca esercizio', { exact: true }).fill('Panca');
  await expect(
    page.getByRole('button', { name: 'Panca piana', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Panca piana', exact: true }).click();
  await page.getByRole('button', { name: 'Corpo libero', exact: true }).click();
  await page
    .getByRole('button', { name: 'Salva esercizio', exact: true })
    .click();
  expect(fixture.program.days[1]?.exercises[0]).toMatchObject({
    loadMode: 'bodyweight',
    targetLoadKg: null,
    targetAssistanceKg: null,
    targetReps: 8,
  });
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await fit(page);
    await page.screenshot({
      path: info.outputPath(`day-${viewport.width}.png`),
    });
  }
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Azioni giornata Prima giornata',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Elimina giorno', exact: true })
    .click();
  await expect(
    page.getByText('Eliminare il giorno e tutti i suoi esercizi?', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  expect(fixture.program.days).toHaveLength(2);
  await page
    .getByRole('button', {
      name: 'Azioni giornata Prima giornata',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Elimina giorno', exact: true })
    .click();
  await page.getByRole('button', { name: 'Conferma', exact: true }).click();
  await expect(async () =>
    expect(fixture.program.days.map((d) => d.name)).toEqual([
      'Seconda giornata',
    ]),
  ).toPass();
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'PROGRAMMI', exact: true }),
  ).toBeVisible();
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await fit(page);
    await page.screenshot({
      path: info.outputPath(`manager-${viewport.width}.png`),
    });
  }
  await page
    .getByRole('button', { name: 'Azioni programma Routine v2', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Modifica programma', exact: true })
    .click();
  await expect(page.getByLabel('Nome programma', { exact: true })).toHaveValue(
    'Routine v2',
  );
  await expect(page.locator('input[type="date"]')).toHaveValue('2026-10-20');
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await fit(page);
    await page.screenshot({
      path: info.outputPath(`settings-${viewport.width}.png`),
    });
  }
  const originalId = fixture.program.id;
  await page
    .getByLabel('Nome programma', { exact: true })
    .fill('Routine v2 aggiornata');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Apri Routine v2 aggiornata',
      exact: true,
    }),
  ).toBeVisible();
  expect(fixture.program.id).toBe(originalId);
  expect(fixture.program.days).toHaveLength(1);
  expect(errors).toEqual([]);
});
test('library uses actual source/tracking filters and persists a custom exercise through the existing schema', async ({
  page,
}, info) => {
  const fixture = await builderFixture(page);
  await page.goto('/program/manual');
  await page
    .getByLabel('Nome programma', { exact: true })
    .fill('Custom routine');
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await page
    .getByRole('button', { name: '+ Aggiungi giorno', exact: true })
    .click();
  await page.getByLabel('Nome giornata', { exact: true }).fill('Durata');
  await page.getByRole('button', { name: 'Salva giorno', exact: true }).click();
  await page
    .getByRole('button', { name: 'Apri giornata Durata', exact: true })
    .click();
  await page
    .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Filtra esercizi', exact: true })
    .click();
  await page.getByRole('button', { name: 'Durata', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Plank', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Panca piana', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Libreria esercizi', exact: true })
    .click();
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await fit(page);
    const filter = await page
      .getByRole('button', { name: 'Tutti', exact: true })
      .boundingBox();
    expect(filter!.height).toBeGreaterThanOrEqual(48);
    expect(filter!.height).toBeLessThanOrEqual(64);
    await page.screenshot({
      path: info.outputPath(`library-${viewport.width}.png`),
    });
  }
  await page
    .getByRole('button', {
      name: '+ Crea esercizio personalizzato',
      exact: true,
    })
    .click();
  await expect(
    page.getByText('Muscoli principali', { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel('Nome esercizio', { exact: true })
    .fill('Tenuta personale');
  await page.getByRole('button', { name: 'Durata', exact: true }).click();
  await page.getByRole('button', { name: 'Corpo libero', exact: true }).click();
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await fit(page);
    await page.screenshot({
      path: info.outputPath(`custom-${viewport.width}.png`),
    });
  }
  await page
    .getByRole('button', {
      name: 'Salva esercizio personalizzato',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Aumenta Durata (secondi)', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Salva esercizio', exact: true })
    .click();
  expect(
    fixture.catalog.find((e) => e.displayName === 'Tenuta personale'),
  ).toMatchObject({
    isCustom: true,
    trackingMode: 'duration',
    defaultLoadMode: 'bodyweight',
  });
  expect(fixture.program.days[0]?.exercises[0]).toMatchObject({
    targetDurationSeconds: 75,
    targetReps: null,
  });
  await page
    .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'I tuoi esercizi', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Tenuta personale', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Plank', exact: true }),
  ).toHaveCount(0);
});

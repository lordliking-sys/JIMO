import { expect, test, type Page } from '@playwright/test';
import { activePlanFixture } from './active-plan-fixture';
import { manualField, valueButton } from './helpers';
const viewports = [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
];
async function back(page: Page) {
  await page
    .getByRole('button', { name: 'Chiudi popup', exact: true })
    .last()
    .click();
}
for (const viewport of viewports) {
  test(`Active sheet daily flow, switch, draft creation and history-safe deletion ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-10-08T10:00:00Z') });
    const f = await activePlanFixture(page),
      errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/program');
    const body = page.getByTestId('program-tab-body');
    await expect(page.getByTestId('active-plan-heading')).toContainText(
      'FORZA',
    );
    await expect(page.getByTestId('active-plan-heading')).toContainText(
      'ATTIVA',
    );
    await expect(body.getByText('Ipertrofia', { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('active-program-card')).toHaveCount(0);
    for (const day of f.source.program.days)
      await expect(page.getByTestId(`program-day-${day.id}`)).toBeVisible();
    await expect(page.getByTestId('program-week-selector')).toHaveCount(0);
    await expect(body).not.toContainText(/Settimana \d|settimane/);
    expect(new URL(page.url()).pathname).toBe('/program');
    await page.screenshot({ path: info.outputPath('active-plan.png') });
    const day = f.source.program.days[0]!;
    await page.getByTestId(`program-day-${day.id}`).click();
    await expect(page).toHaveURL(/\/program$/);
    await expect(
      page.getByRole('heading', { name: 'Lunedì', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
      .click();
    const sheet = page.getByTestId('program-central-popup');
    for (const name of [
      'Tutti',
      'Esercizi JIMO',
      'I tuoi esercizi',
      'Ripetizioni',
      'Durata',
    ])
      await expect(
        sheet.getByRole('button', { name, exact: true }),
      ).toHaveCount(0);
    await sheet.getByLabel('Cerca esercizio', { exact: true }).fill('Tenuta');
    await page.clock.runFor(350);
    await expect(
      sheet.getByRole('button', { name: 'Tenuta personale', exact: true }),
    ).toBeVisible();
    await sheet.getByLabel('Cerca esercizio', { exact: true }).fill('Dip');
    await page.clock.runFor(350);
    await expect(
      sheet.getByRole('button', { name: 'Tenuta personale', exact: true }),
    ).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('exercise-library.png') });
    const thumb = sheet.getByTestId('exercise-thumbnail');
    expect(
      await thumb.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe('rgba(0, 0, 0, 0)');
    await sheet.getByRole('button', { name: 'Dip', exact: true }).click();
    await page.getByRole('button', { name: 'Zavorra', exact: true }).click();
    await (await manualField(page, 'Carico aggiunto (kg)')).fill('20');
    await page
      .getByRole('button', {
        name: 'Conferma Carico aggiunto (kg)',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Salva esercizio', exact: true })
      .click();
    await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
    await page
      .getByRole('button', { name: 'Modifica esercizio Dip', exact: true })
      .click();
    await expect(valueButton(page, 'Carico aggiunto (kg)')).toHaveText(
      '+20 kg',
    );
    await page
      .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Salva modifiche', exact: true })
      .click();
    await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
    expect(
      day.exercises.find((e) => e.exercise.displayName === 'Dip')?.targetReps,
    ).toBe(9);
    await back(page);
    await expect(page).toHaveURL(/\/program$/);
    await page
      .getByRole('button', { name: 'Cambia scheda', exact: true })
      .click();
    await expect(
      page
        .getByTestId('program-popup-overlay')
        .getByRole('button', { name: 'FORZA, ATTIVA', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByTestId('program-popup-overlay').getByRole('button', {
        name: 'Ipertrofia, NON ATTIVA',
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath('switch-plan.png') });
    await page
      .getByTestId('program-popup-overlay')
      .getByRole('button', { name: 'Ipertrofia, NON ATTIVA', exact: true })
      .click();
    expect(new URL(page.url()).pathname).toBe('/program');
    await page.getByRole('button', { name: 'Attiva', exact: true }).click();
    await expect(page.getByTestId('program-popup-overlay')).toHaveCount(0);
    await expect(page.getByTestId('active-plan-heading')).toContainText(
      'Ipertrofia',
    );
    expect(f.source.program.status).toBe('archived');
    expect(f.alternate.status).toBe('active');
    await page
      .getByRole('button', { name: 'Cambia scheda', exact: true })
      .click();
    await page
      .getByRole('button', { name: '+ Nuova scheda', exact: true })
      .click();
    await page.getByLabel('Nome scheda', { exact: true }).fill('Nuova bozza');
    await page
      .getByRole('button', { name: 'Crea scheda', exact: true })
      .click();
    await expect(page.getByTestId('program-popup-overlay')).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe('/program');
    const draft = [...f.plans.values()].find((p) => p.name === 'Nuova bozza')!;
    expect(draft.status).toBe('draft');
    await expect(page.getByTestId('active-plan-heading')).toContainText(
      'Ipertrofia',
    );
    await page
      .getByRole('button', { name: 'Cambia scheda', exact: true })
      .click();
    await expect(
      page.getByTestId('program-popup-overlay').getByRole('button', {
        name: 'Nuova bozza, NON ATTIVA',
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByTestId('program-popup-overlay')
      .getByRole('button', { name: 'FORZA, NON ATTIVA', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Modifica questa scheda', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Altre azioni', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Elimina programma', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Elimina programma', exact: true })
      .last()
      .click();
    await expect(page.getByTestId('program-popup-overlay')).toHaveCount(0);
    await expect(sheet).toHaveCount(0);
    expect(f.plans.has(f.source.program.id)).toBe(false);
    expect(f.source.workout.name).toBe('Storico originale');
    expect(f.source.workout.exercises[0]!.sets[0]!.actualReps).toBe(8);
    expect(
      f.writes.filter((w) => w.method === 'DELETE').map((w) => w.path),
    ).toEqual([`/programs/${f.source.program.id}`]);
    await page.getByRole('tab', { name: 'Progressi', exact: true }).click();
    await page.getByRole('tab', { name: 'Frequenza', exact: true }).click();
    const history = page.getByLabel(/^Storico originale\./);
    await expect(history).toBeVisible();
    await expect(history).not.toHaveRole('button');
    await history.click();
    await expect(page).toHaveURL('/progress');
    // Progress stays a single screen; the saved workout deep link still reads
    // its immutable snapshot after the source program was deleted.
    await page.goto(`/workout/${f.source.workout.id}`);
    await expect(
      page.getByText('Storico originale', { exact: true }).last(),
    ).toBeVisible();
    await expect(
      page.getByText('8 reps · 80 kg · RPE 8', { exact: true }).first(),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

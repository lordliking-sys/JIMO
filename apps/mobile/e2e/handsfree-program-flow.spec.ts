import { test, expect, type Page } from '@playwright/test';
import { builderFixture } from './builder-fixture';
import { workoutFixture } from './workout-fixture';
import { valueButton, manualField } from './helpers';
const devices = [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
];
async function manual(page: Page, label: string, value: string) {
  await (await manualField(page, label)).fill(value);
  await page
    .getByRole('button', { name: `Conferma ${label}`, exact: true })
    .click();
}
for (const device of devices) {
  test(`Three-level program flow, overlays, custom exercise, mode editing and deletion ${device.width}x${device.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(device);
    const f = await builderFixture(page);
    await page.goto('/program');
    await page
      .getByRole('button', { name: 'Crea programma', exact: true })
      .click();
    await expect(
      valueButton(page, 'Durata in settimane (opzionale)'),
    ).toHaveText('4');
    await expect(
      page.getByRole('button', {
        name: /^(Non impostato|4 settimane|8 settimane|12 settimane)$/,
      }),
    ).toHaveCount(0);
    await page
      .getByRole('textbox', { name: 'Nome programma', exact: true })
      .fill('FORZA');
    await page
      .getByRole('textbox', { name: 'Descrizione (opzionale)', exact: true })
      .fill('Test overlay');
    await manual(page, 'Durata in settimane (opzionale)', '7');
    await page.getByRole('button', { name: 'Continua', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/program/${f.program.id}$`));
    const programURL = page.url();
    await expect(
      page.getByRole('textbox', { name: 'Nome programma', exact: true }),
    ).toHaveValue('FORZA');
    await page
      .getByRole('button', { name: '+ Aggiungi giorno', exact: true })
      .click();
    await expect(page.getByTestId('program-action-overlay')).toBeVisible();
    await expect(page).toHaveURL(programURL);
    await page
      .getByRole('textbox', { name: 'Nome giornata', exact: true })
      .fill('Push');
    await page.getByRole('button', { name: 'Lunedì', exact: true }).click();
    await page.screenshot({ path: info.outputPath('day-overlay.png') });
    await page
      .getByRole('button', { name: 'Salva giorno', exact: true })
      .click();
    await expect(page.getByTestId('program-action-overlay')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Azioni giornata Push', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Modifica giorno', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Nome giornata', exact: true })
      .fill('Push A');
    await page
      .getByRole('button', { name: 'Salva giorno', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Apri giornata Push A', exact: true })
      .click();
    const dayURL = page.url();
    await expect(
      page.getByRole('heading', { name: 'FORZA', exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId('program-management-hero')
        .last()
        .getByText('Lunedì', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /Giorno \d/ })).toHaveCount(
      0,
    );
    await page
      .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
      .click();
    await expect(page).toHaveURL(dayURL);
    await expect(
      page.getByRole('button', { name: 'Filtra esercizi', exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole('textbox', { name: 'Cerca esercizio', exact: true })
      .fill('Dip');
    await page.getByRole('button', { name: 'Dip', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'DIP', exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(dayURL);
    await page.screenshot({ path: info.outputPath('config-overlay.png') });
    await page
      .getByRole('button', { name: 'Salva esercizio', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Modifica esercizio Dip', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Modifica esercizio Dip', exact: true })
      .click();
    await page.getByRole('button', { name: 'Piramidale', exact: true }).click();
    await expect(page.getByTestId('pyramid-builder')).toBeVisible();
    await page
      .getByRole('button', { name: 'Target serie 2', exact: true })
      .click();
    await manual(page, 'Ripetizioni', '6');
    await page
      .getByRole('button', { name: 'Salva modifiche', exact: true })
      .click();
    expect(f.program.days[0]!.exercises[0]!.setTargets![1]!.targetReps).toBe(6);
    await page
      .getByRole('button', { name: 'Modifica esercizio Dip', exact: true })
      .click();
    await expect(page.getByTestId('pyramid-builder')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('program-action-overlay')).toHaveCount(0);
    await expect(page).toHaveURL(dayURL);
    await page
      .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
      .click();
    await page.getByRole('button', { name: 'Dip', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('textbox', { name: 'Cerca esercizio', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: '+ Crea esercizio personalizzato',
        exact: true,
      })
      .click();
    await page
      .getByRole('textbox', { name: 'Nome esercizio', exact: true })
      .fill('Custom Row');
    await page
      .getByRole('button', {
        name: 'Salva esercizio personalizzato',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('heading', { name: 'CUSTOM ROW', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'EMOM', exact: true }).click();
    await page
      .getByRole('button', { name: 'Salva esercizio', exact: true })
      .click();
    expect(f.program.days[0]!.exercises[1]!.workoutMode).toBe('emom');
    await page
      .getByRole('button', {
        name: 'Modifica esercizio Custom Row',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Rimuovi esercizio', exact: true })
      .click();
    await page.getByRole('button', { name: 'Conferma', exact: true }).click();
    await expect(
      page.getByRole('button', {
        name: 'Modifica esercizio Custom Row',
        exact: true,
      }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Indietro', exact: true }).click();
    await expect(page).toHaveURL(programURL);
    await page
      .getByRole('button', { name: '+ Aggiungi giorno', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Nome giornata', exact: true })
      .fill('Pull');
    await page
      .getByRole('button', { name: 'Salva giorno', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Azioni giornata Pull', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Elimina giorno', exact: true })
      .click();
    await page.getByRole('button', { name: 'Conferma', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Apri giornata Pull', exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Attiva programma', exact: true })
      .click();
    await expect.poll(() => f.program.status).toBe('active');
    await page
      .getByRole('textbox', { name: 'Nome programma', exact: true })
      .fill('FORZA 2');
    await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await expect(page).toHaveURL(/\/program$/);
    await page
      .getByRole('button', { name: 'Modifica programma', exact: true })
      .click();
    await expect(
      page.getByRole('textbox', { name: 'Nome programma', exact: true }),
    ).toHaveValue('FORZA 2');
    await page
      .getByRole('button', { name: 'Archivia programma', exact: true })
      .click();
    await page.getByRole('button', { name: 'Conferma', exact: true }).click();
    await expect.poll(() => f.program.status).toBe('archived');
    await page
      .getByRole('button', { name: 'Elimina programma', exact: true })
      .first()
      .click();
    await expect(
      page.getByText('Eliminare definitivamente questo programma?', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Lo storico degli allenamenti già eseguiti non verrà eliminato/,
      ),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Annulla', exact: true }).click();
    expect(f.program.id).toBeTruthy();
    await page
      .getByRole('button', { name: 'Elimina programma', exact: true })
      .first()
      .click();
    await page
      .getByRole('button', { name: 'Elimina programma', exact: true })
      .last()
      .click();
    await expect(page).toHaveURL(/\/program$/);
    await expect(
      page.getByRole('button', { name: 'Crea programma', exact: true }),
    ).toBeVisible();
  });
  test(`Hands-free EMOM preparation, auto rounds, reload and summary correction ${device.width}x${device.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(device);
    await page.clock.install({ time: new Date('2026-10-13T10:00:00Z') });
    const f = await workoutFixture(page),
      e = f.program.days[0]!.exercises[0]!;
    f.program.days[0]!.exercises = [e];
    e.workoutMode = 'emom';
    e.targetSets = 15;
    e.targetReps = 14;
    e.emomIntervalSeconds = 60;
    await page.goto('/workout');
    await page
      .getByRole('button', { name: 'Inizia allenamento', exact: true })
      .first()
      .click();
    await page
      .getByRole('button', { name: 'Inizia EMOM', exact: true })
      .click();
    await expect(page.getByText('PREPARATI', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: /Conferma round|Aumenta Ripetizioni|Diminuisci Ripetizioni|Modifica manualmente/,
      }),
    ).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('prepare.png') });
    await page.clock.fastForward(5000);
    await page.reload();
    await expect(page.getByText('PREPARATI', { exact: true })).toBeVisible();
    await page.clock.fastForward(5000);
    await expect(page.getByText('Round 1 / 15', { exact: true })).toBeVisible();
    await expect(page.getByTestId('emom-target-reps')).toHaveText(
      '14 RIPETIZIONI',
    );
    const grid = (await page.getByTestId('emom-round-grid').boundingBox())!;
    expect(
      Math.abs(grid.x + grid.width / 2 - device.width / 2),
    ).toBeLessThanOrEqual(2);
    await page.screenshot({ path: info.outputPath('emom-active.png') });
    await page.clock.fastForward(121_000);
    await expect(page.getByText('Round 3 / 15', { exact: true })).toBeVisible();
    await expect.poll(() => f.workout.completedSets).toBe(2);
    await page.reload();
    await expect(page.getByText('Round 3 / 15', { exact: true })).toBeVisible();
    await page.clock.fastForward(800_000);
    await expect(page.getByTestId('emom-summary')).toBeVisible();
    await expect.poll(() => f.workout.completedSets).toBe(15);
    await page
      .getByRole('button', { name: 'Correggi serie 1', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Diminuisci Ripetizioni', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Salva correzione', exact: true })
      .click();
    await expect
      .poll(() => f.workout.exercises[0]!.sets[0]!.actualReps)
      .toBe(13);
    expect(f.workout.exercises[0]!.sets[0]!.targetReps).toBe(14);
    await page.screenshot({ path: info.outputPath('emom-summary.png') });
  });
}

test('EMOM progress ring moves between second ticks when reduced motion is off', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2026-10-13T10:00:00Z') });
  const f = await workoutFixture(page),
    e = f.program.days[0]!.exercises[0]!;
  f.program.days[0]!.exercises = [e];
  e.workoutMode = 'emom';
  e.targetSets = 2;
  e.targetReps = 8;
  e.emomIntervalSeconds = 60;
  await page.goto('/workout');
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Inizia EMOM', exact: true }).click();
  await expect(page.getByText('PREPARATI', { exact: true })).toBeVisible();
  await page.clock.fastForward(10_000);
  await expect(page.getByText('Round 1 / 2', { exact: true })).toBeVisible();
  const ring = page
    .getByRole('progressbar', { name: /^EMOM/ })
    .locator('circle[stroke-dasharray]');
  await page.clock.runFor(100);
  const before = Number(await ring.getAttribute('stroke-dashoffset'));
  const text = await page
    .getByRole('progressbar', { name: /^EMOM/ })
    .textContent();
  await page.clock.runFor(250);
  const after = Number(await ring.getAttribute('stroke-dashoffset'));
  expect(after).toBeGreaterThan(before);
  expect(
    await page.getByRole('progressbar', { name: /^EMOM/ }).textContent(),
  ).toBe(text);
});

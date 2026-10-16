import { expect, test, type Page } from '@playwright/test';
import { activePlanFixture } from './active-plan-fixture';
import { simulateSafeArea } from './helpers';
const phones = [
  { width: 320, height: 740, top: 24, bottom: 48 },
  { width: 390, height: 780, top: 24, bottom: 48 },
  { width: 393, height: 851, top: 47, bottom: 34 },
  { width: 430, height: 860, top: 47, bottom: 34 },
];
test.use({ timezoneId: 'Europe/Rome' });
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
async function setup(page: Page, phone: (typeof phones)[number]) {
  await page.setViewportSize(phone);
  await simulateSafeArea(page, phone.top, phone.bottom);
  await page.clock.install({ time: new Date('2026-10-05T10:00:00Z') });
  const f = await activePlanFixture(page);
  await page.goto('/');
  await expect(page.getByTestId('home-workout-card')).toBeVisible();
  return f;
}
async function bounded(page: Page) {
  const panel = page.getByTestId('program-central-popup');
  await expect(panel).toHaveCount(1);
  const b = (await panel.boundingBox())!,
    size = page.viewportSize()!;
  expect(b.width).toBeLessThanOrEqual(370.1);
  expect(b.x).toBeGreaterThanOrEqual(16);
  expect(b.y).toBeGreaterThanOrEqual(24);
  expect(b.y + b.height).toBeLessThan(size.height - 15);
  expect(b.height).toBeLessThanOrEqual(size.height * 0.8 + 1);
  expect(
    await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
}
for (const phone of phones) {
  test(`Home interactive dates, actual states, edit deep link and direct start/resume ${phone.width}`, async ({
    page,
  }) => {
    const f = await setup(page, phone);
    // Mutations below precede the first local program fetch in a fresh fixture page.
    const days = f.source.program.days;
    days[1]!.exercises = [];
    await page.reload();
    for (let weekday = 1; weekday <= 7; weekday++) {
      await page.getByTestId(`home-date-${weekday}`).click();
      await expect(page.getByTestId(`home-date-${weekday}`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      const card = page.getByTestId('home-workout-card'),
        day = days.find((d) => d.dayOfWeek === weekday);
      await expect(card).toContainText(day?.name ?? 'Giorno di riposo');
      if (day?.exercises.length)
        await expect(button(page, 'Inizia allenamento')).toBeEnabled();
      else {
        await expect(page.getByTestId('home-start-affordance')).toHaveCount(0);
        await expect(button(page, 'Inizia allenamento')).toHaveCount(0);
        await expect(card).toContainText(
          day
            ? 'Nessun esercizio configurato.'
            : 'Nessun allenamento programmato.',
        );
      }
    }
    await expect(button(page, 'Scegli un giorno')).toHaveCount(0);
    await page.getByTestId('home-date-3').click();
    await button(page, 'Modifica').click();
    await expect(page).toHaveURL(/\/program/);
    await expect(page.getByTestId('day-dialog-detail')).toContainText('Pull');
    await bounded(page);
    await button(page, 'Chiudi popup').click();
    await expect(page.getByTestId('program-central-popup')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await page.getByTestId('home-date-1').click();
    await button(page, 'Inizia allenamento').click();
    await expect(page).toHaveURL(/\/workout\//);
    await expect(button(page, '✓ Completa serie')).toBeVisible();
    const url = page.url();
    await page.goto('/');
    await expect(button(page, 'Riprendi allenamento')).toBeVisible();
    await button(page, 'Riprendi allenamento').click();
    await expect(page).toHaveURL(url);
  });
  test(`Central weekday, library, config, save/edit/remove and live Home refresh ${phone.width}`, async ({
    page,
  }, info) => {
    const f = await setup(page, phone);
    await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
    const row = page.getByTestId(`program-day-${f.source.program.days[0]!.id}`);
    await expect(row).toContainText('Push');
    await expect(row).not.toContainText('Panca piana');
    await expect(row).not.toContainText('EMOM');
    await page.getByTestId('program-rest-2').click();
    await bounded(page);
    const url = page.url();
    await button(page, 'Crea allenamento per Martedì').click();
    await expect(button(page, 'Lunedì')).toHaveCount(0);
    await expect(button(page, 'Nessun giorno specifico')).toHaveCount(0);
    await page.getByLabel('Nome giornata', { exact: true }).fill('Upper reale');
    await page
      .getByLabel('Note (opzionali)', { exact: true })
      .fill('Note reali');
    await button(page, 'Salva giorno').click();
    await expect(page.getByTestId('day-dialog-detail')).toContainText(
      'Upper reale',
    );
    await expect(page.getByTestId('day-dialog-detail')).toContainText(
      '0 esercizi',
    );
    await button(page, '+ Aggiungi esercizio').click();
    await page.getByLabel('Cerca esercizio', { exact: true }).fill('Dip');
    await page.clock.runFor(350);
    await button(page, 'Dip').click();
    await bounded(page);
    await expect(page).toHaveURL(url);
    await expect(button(page, 'Standard')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const control = button(page, 'Aumenta Serie');
    const before = (await control.boundingBox())!;
    await button(page, 'Modifica manualmente Serie').click();
    await page.getByLabel('Serie', { exact: true }).fill('5');
    await bounded(page);
    const after = (await control.boundingBox())!;
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.width).toBeGreaterThanOrEqual(48);
    await page.setViewportSize({
      width: phone.width,
      height: phone.height - 280,
    });
    await expect(page.getByLabel('Serie', { exact: true })).toBeInViewport({
      ratio: 1,
    });
    await expect(page.getByLabel('Serie', { exact: true })).toBeFocused();
    await expect(control).toBeInViewport({ ratio: 1 });
    await bounded(page);
    await page.setViewportSize(phone);
    await button(page, 'Conferma Serie').click();
    await button(page, 'Aumenta Serie').click();
    await button(page, 'Range reps').click();
    await button(page, 'Zavorra').click();
    await button(page, 'Salva esercizio').click();
    await expect(page.getByTestId('day-dialog-detail')).toContainText(
      '1 esercizio',
    );
    await expect(page.getByTestId('day-dialog-detail')).toContainText('Dip');
    const created = f.source.program.days.find((d) => d.dayOfWeek === 2)!;
    expect(created.dayOfWeek).toBe(2);
    expect(created.exercises[0]!.targetSets).toBe(6);
    expect(created.exercises[0]!.targetRepMin).toBe(8);
    expect(created.exercises[0]!.targetRepMax).toBe(12);
    expect(created.exercises[0]!.loadMode).toBe('weighted');
    await button(page, 'Modifica esercizio Dip').click();
    await expect(button(page, 'Range reps')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await button(page, 'Aumenta Serie').click();
    await button(page, 'Salva modifiche').click();
    await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
    expect(created.exercises[0]!.targetSets).toBe(7);
    await button(page, 'Chiudi popup').click();
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await page.getByTestId('home-date-2').click();
    await expect(page.getByTestId('home-workout-card')).toContainText(
      'Upper reale',
    );
    await expect(page.getByTestId('home-upcoming-exercise')).toContainText(
      'Dip',
    );
    await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
    await page.getByTestId(`program-day-${created.id}`).click();
    await button(page, 'Modifica esercizio Dip').click();
    await button(page, 'Rimuovi esercizio').click();
    await button(page, 'Conferma').click();
    await expect(page.getByTestId('day-dialog-detail')).toContainText(
      '0 esercizi',
    );
    await button(page, 'Modifica giorno').click();
    await page
      .getByLabel('Nome giornata', { exact: true })
      .fill('Upper aggiornato');
    await button(page, 'Salva giorno').click();
    await expect(page.getByTestId('day-dialog-detail')).toContainText(
      'Upper aggiornato',
    );
    await page.screenshot({ path: info.outputPath('day-dialog.png') });
    await button(page, 'Chiudi popup').click();
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(page.getByTestId('home-workout-card')).toContainText(
      'Upper aggiornato',
    );
    await expect(page.getByTestId('home-upcoming-exercise')).toHaveCount(0);
    await expect(page.getByTestId('home-start-affordance')).toHaveCount(0);
    expect(
      f.writes.filter((w) => w.path.endsWith('/days') && w.method === 'POST'),
    ).toHaveLength(1);
  });
}

test('Internal steps preserve custom duration, pyramid targets, EMOM, ordering and day removal', async ({
  page,
}) => {
  const f = await setup(page, phones[1]!);
  await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
  const day = f.source.program.days[0]!;
  await page.getByTestId(`program-day-${day.id}`).click();
  const url = page.url();
  await button(page, '+ Aggiungi esercizio').click();
  await button(page, 'Dip').click();
  await button(page, 'Indietro').click();
  await expect(
    page.getByLabel('Cerca esercizio', { exact: true }),
  ).toBeVisible();
  await button(page, '+ Crea esercizio personalizzato').click();
  await page
    .getByLabel('Nome esercizio', { exact: true })
    .fill('Tenuta nuova reale');
  await button(page, 'Durata').click();
  await button(page, 'Corpo libero').click();
  await button(page, 'Salva esercizio personalizzato').click();
  await button(page, 'Salva esercizio').click();
  await expect(page.getByTestId('day-dialog-detail')).toContainText(
    'Tenuta nuova reale',
  );
  expect(day.exercises.at(-1)!.exercise.isCustom).toBe(true);
  expect(day.exercises.at(-1)!.targetDurationSeconds).toBe(60);
  await button(page, '+ Aggiungi esercizio').click();
  await button(page, 'Dip').click();
  await button(page, 'Piramidale').click();
  await expect(button(page, 'Aumenta Ripetizioni')).toHaveCount(0);
  await button(page, 'Target serie 2').click();
  const pyramidRow = page.getByTestId('pyramid-set-2');
  await pyramidRow
    .getByRole('button', { name: 'Aumenta Ripetizioni serie 2', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Aumenta Ripetizioni', exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel('Note (opzionali)', { exact: true })
    .fill('Piramide reale');
  await button(page, 'Salva esercizio').click();
  await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
  const pyramid = structuredClone(day.exercises.at(-1)!);
  expect(pyramid.workoutMode).toBe('pyramid');
  expect(pyramid.setTargets).toHaveLength(3);
  expect(pyramid.setTargets![1]!.targetReps).toBe(9);
  await page.getByTestId(`day-dialog-exercise-${pyramid.id}`).click();
  await expect(button(page, 'Piramidale')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await button(page, 'Salva modifiche').click();
  await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
  expect(day.exercises.at(-1)!.setTargets).toEqual(pyramid.setTargets);
  await button(page, '+ Aggiungi esercizio').click();
  await button(page, 'Dip').click();
  await button(page, 'EMOM').click();
  await button(page, 'Aumenta Round / minuti').click();
  await button(page, 'Salva esercizio').click();
  await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
  const emom = day.exercises.at(-1)!;
  expect(emom.workoutMode).toBe('emom');
  expect(emom.targetSets).toBe(4);
  expect(emom.emomIntervalSeconds).toBe(60);
  await page.getByTestId(`day-dialog-exercise-${emom.id}`).click();
  await expect(button(page, 'EMOM')).toHaveAttribute('aria-pressed', 'true');
  await button(page, 'Salva modifiche').click();
  await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
  await button(page, 'Riordina').click();
  await page
    .getByTestId(`day-dialog-exercise-${emom.id}`)
    .locator('..')
    .getByRole('button', { name: 'Sposta su Dip', exact: true })
    .click();
  await expect.poll(() => day.exercises.at(-2)!.id).toBe(emom.id);
  await button(page, 'Elimina').click();
  await button(page, 'Conferma').click();
  await expect(page.getByTestId('day-dialog-detail')).toContainText(
    'Giorno di riposo',
  );
  await expect(page).toHaveURL(url);
  await button(page, 'Chiudi popup').click();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('home-workout-card')).toContainText(
    'Giorno di riposo',
  );
  await expect(button(page, 'Inizia allenamento')).toHaveCount(0);
});

import { expect, test } from '@playwright/test';
import { activePlanFixture } from './active-plan-fixture';
import { workoutFixture } from './workout-fixture';
import { simulateSafeArea } from './helpers';

const phones = [
  { width: 320, height: 740, top: 24, bottom: 48 },
  { width: 390, height: 780, top: 24, bottom: 48 },
  { width: 393, height: 851, top: 47, bottom: 34 },
  { width: 430, height: 860, top: 47, bottom: 34 },
];
test.use({ timezoneId: 'Europe/Rome' });
for (const phone of phones) {
  test(`Daily Home data: rest, activation, exercise add/remove and day removal ${phone.width}x${phone.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(phone);
    await page.clock.install({ time: new Date('2026-10-08T10:00:00Z') });
    const f = await activePlanFixture(page),
      day = f.alternate.days[0]!;
    day.dayOfWeek = 4;
    day.exercises = [day.exercises[0]!];
    day.exercises[0]!.exercise.displayName = 'Esercizio reale di oggi';
    await page.goto('/');
    await expect(page.getByTestId('home-workout-card')).toContainText(
      'Giorno di riposo',
    );
    await expect(page.getByTestId('home-upcoming-exercise')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Inizia allenamento', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
    await page
      .getByRole('button', { name: 'Cambia scheda', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Ipertrofia, NON ATTIVA', exact: true })
      .click();
    await page.getByRole('button', { name: 'Attiva', exact: true }).click();
    await expect(page.getByTestId('program-popup-overlay')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(page.getByTestId('home-workout-card')).toContainText(
      'Ipertrofia',
    );
    await expect(page.getByTestId('home-upcoming-exercise')).toHaveText(
      /Esercizio reale di oggi/,
    );
    await expect(
      page.getByRole('button', { name: 'Inizia allenamento', exact: true }),
    ).toBeEnabled();
    await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
    await page.getByTestId(`program-day-${day.id}`).click();
    await page
      .getByRole('button', {
        name: 'Modifica esercizio Esercizio reale di oggi',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Rimuovi esercizio', exact: true })
      .click();
    await page.getByRole('button', { name: 'Conferma', exact: true }).click();
    await expect(page.getByTestId('program-action-overlay')).toHaveCount(0);
    await page
      .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
      .click();
    await page.getByLabel('Cerca esercizio', { exact: true }).fill('Dip');
    await page.clock.runFor(350);
    await page.getByRole('button', { name: 'Dip', exact: true }).click();
    await page
      .getByRole('button', { name: 'Salva esercizio', exact: true })
      .click();
    await expect(page.getByTestId('program-action-overlay')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Indietro', exact: true })
      .last()
      .click();
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(page.getByTestId('home-upcoming-exercise')).toContainText(
      'Dip',
    );
    await expect(page.getByTestId('home-body')).not.toContainText(
      'Esercizio reale di oggi',
    );
    await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
    await page.getByTestId(`program-day-${day.id}`).click();
    await page
      .getByRole('button', { name: `Azioni giornata ${day.name}`, exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Elimina giorno', exact: true })
      .click();
    await page.getByRole('button', { name: 'Conferma', exact: true }).click();
    await expect(page).toHaveURL(/\/program$/);
    await expect(page.getByTestId(`program-day-${day.id}`)).toHaveCount(0);
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(page.getByTestId('home-workout-card')).toContainText(
      'Giorno di riposo',
    );
    await expect(page.getByTestId('home-upcoming-exercise')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('home-upcoming-exercise')).toHaveCount(0);
  });

  test(`Essential edit popup, preserved metadata, draft description and weekday flow ${phone.width}x${phone.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(phone);
    await simulateSafeArea(page, phone.top, phone.bottom);
    const f = await activePlanFixture(page);
    f.source.program.description = 'Descrizione reale';
    await page.goto('/program');
    const body = page.getByTestId('program-tab-body');
    await expect(body).toHaveCSS('background-color', 'rgb(255, 247, 250)');
    await expect(body).not.toContainText(/Settimana \d|settimane|Giorno \d/);
    await expect(page.getByTestId('program-week-selector')).toHaveCount(0);
    const rest = page.getByTestId('program-rest-4');
    await expect(rest).toContainText('Giovedì');
    await expect(rest).toContainText('Giorno di riposo');
    await page
      .getByRole('button', { name: 'Modifica scheda', exact: true })
      .click();
    const popup = page.getByTestId('program-central-popup'),
      box = (await popup.boundingBox())!;
    expect(box.width / phone.width).toBeCloseTo(0.84, 2);
    expect(box.y).toBeGreaterThanOrEqual(phone.top + 16);
    expect(box.y + box.height).toBeLessThanOrEqual(
      phone.height - phone.bottom - 16 + 1,
    );
    expect(box.height).toBeLessThan(phone.height * 0.8);
    await expect(popup.getByLabel('Nome scheda', { exact: true })).toHaveValue(
      'FORZA',
    );
    await expect(
      popup.getByLabel('Descrizione (opzionale)', { exact: true }),
    ).toHaveValue('Descrizione reale');
    await expect(popup.getByText('GIORNATE', { exact: true })).toHaveCount(0);
    await expect(popup.locator('input[type="date"]')).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe('/program');
    await page.screenshot({ path: info.outputPath('edit-plan-popup.png') });
    await popup
      .getByLabel('Nome scheda', { exact: true })
      .fill('Forza essenziale');
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Continua a modificare', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Continua a modificare', exact: true })
      .click();
    await page.getByRole('button', { name: 'Salva', exact: true }).dblclick();
    await expect(popup).toHaveCount(0);
    const updated = f.plans.get(f.source.program.id)!;
    expect(updated.name).toBe('Forza essenziale');
    expect(updated.description).toBe('Descrizione reale');
    expect(updated.durationWeeks).toBe(4);
    expect(updated.startsOn).toBe('2026-10-05');
    expect(updated.status).toBe('active');
    expect(
      f.writes.filter(
        (w) => w.method === 'PATCH' && w.path === `/programs/${updated.id}`,
      ),
    ).toHaveLength(1);
    await page
      .getByRole('button', { name: '+ Nuova scheda', exact: true })
      .click();
    await page
      .getByLabel('Nome scheda', { exact: true })
      .fill('Bozza essenziale');
    await page
      .getByLabel('Descrizione (opzionale)', { exact: true })
      .fill('Obiettivo personale');
    await page
      .getByRole('button', { name: 'Crea scheda', exact: true })
      .click();
    await expect(popup).toHaveCount(0);
    const draft = [...f.plans.values()].find(
      (p) => p.name === 'Bozza essenziale',
    )!;
    expect(draft.status).toBe('draft');
    expect(draft.description).toBe('Obiettivo personale');
    await expect(page.getByTestId('active-plan-heading')).toContainText(
      'Forza essenziale',
    );
    await rest.click();
    await expect(
      page.getByRole('button', { name: 'Giovedì', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Nome giornata', { exact: true }).fill('Upper');
    await page
      .getByRole('button', { name: 'Salva giorno', exact: true })
      .click();
    await expect(page.getByTestId('program-action-overlay')).toHaveCount(0);
    const day = f.plans.get(updated.id)!.days.find((d) => d.name === 'Upper')!;
    expect(day.dayOfWeek).toBe(4);
    expect(new URL(page.url()).pathname).toBe('/program');
    await page.getByTestId(`program-day-${day.id}`).click();
    await expect(page).toHaveURL(/day-detail/);
    await expect(
      page.getByRole('button', { name: '+ Aggiungi esercizio', exact: true }),
    ).toBeVisible();
  });
}

test('Completing a real workout clears the resume CTA and survives a Home reload', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-08T10:00:00Z') });
  const f = await workoutFixture(page),
    day = f.program.days[0]!;
  day.dayOfWeek = 4;
  day.exercises = [day.exercises[0]!];
  day.exercises[0]!.targetSets = 1;
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .click();
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Termina allenamento', exact: true })
    .click();
  await expect.poll(() => f.workout.status).toBe('completed');
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Riprendi allenamento', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Inizia allenamento', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Riprendi allenamento', exact: true }),
  ).toHaveCount(0);
});

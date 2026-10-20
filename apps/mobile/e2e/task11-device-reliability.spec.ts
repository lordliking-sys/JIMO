import { expect, test } from '@playwright/test';
import { activePlanFixture } from './active-plan-fixture';

test.use({ timezoneId: 'Europe/Rome' });
test('tapping Today keeps Home following local midnight without losing the active workout', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-12T21:59:50Z') });
  await activePlanFixture(page);
  await page.goto('/');
  const monday = page.getByTestId('home-date-1'),
    tuesday = page.getByTestId('home-date-2');
  await expect(monday).toHaveAttribute('aria-pressed', 'true');
  await monday.click();
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .click();
  await expect(page).toHaveURL(/\/workout\/[^/]+$/);
  const session = page.url();
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await monday.click();
  await page.clock.fastForward(20_000);
  await expect(tuesday).toHaveAttribute('aria-pressed', 'true');
  await expect(monday).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('home-workout-card')).toContainText(
    'Giorno di riposo',
  );
  await page.getByTestId('home-resume-workout').click();
  await expect(page).toHaveURL(session);
});
test('Sunday to Monday follows Today while an explicitly selected other day stays selected', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-18T21:59:50Z') });
  await activePlanFixture(page);
  await page.goto('/');
  await page.getByTestId('home-date-7').click();
  await page.clock.fastForward(20_000);
  await expect(page.getByTestId('home-date-1')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('home-workout-card')).toContainText('Push');
  await page.getByTestId('home-date-3').click();
  await page.clock.fastForward(86_400_000);
  await expect(page.getByTestId('home-date-3')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('home-workout-card')).toContainText('Pull');
});
test('shared popup survives 20 repeated day, editor, switch, create and avatar cycles without trapping the page', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
  const f = await activePlanFixture(page),
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.name));
  await page.goto('/program');
  await expect(page.getByTestId('active-plan-heading')).toContainText('FORZA');
  const button = (name: string) =>
      page.getByRole('button', { name, exact: true }),
    panel = page.getByTestId('program-central-popup');
  for (let cycle = 0; cycle < 20; cycle++) {
    await page
      .getByTestId(`program-day-${f.source.program.days[0]!.id}`)
      .click();
    await button('+ Aggiungi esercizio').click();
    await expect(
      page.getByLabel('Cerca esercizio', { exact: true }),
    ).toBeVisible();
    await button('Dip').click();
    await expect(button('Salva esercizio')).toBeVisible();
    await button('Indietro').click();
    await button('Indietro').click();
    await button('Modifica giorno').click();
    await expect(
      page.getByLabel('Nome giornata', { exact: true }),
    ).toBeVisible();
    await button('Indietro').click();
    await button('Chiudi popup').click();
    await expect(panel).toHaveCount(0);
    await button('Cambia scheda').click();
    await button('+ Nuova scheda').click();
    await expect(page.getByLabel('Nome scheda', { exact: true })).toBeVisible();
    await button('Chiudi popup').click();
    await expect(panel).toHaveCount(0);
    await button('Cambia scheda').click();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  }
  await page.getByRole('tab', { name: 'Profilo', exact: true }).click();
  for (let cycle = 0; cycle < 20; cycle++) {
    await page.getByTestId('profile-avatar').click();
    await expect(
      panel.getByRole('button', { name: 'Scatta foto', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  }
  await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
  await button('Cambia scheda').click();
  await expect(panel).toHaveCount(1);
  await button('Chiudi popup').click();
  expect(f.writes).toHaveLength(0);
  expect(errors).toEqual([]);
});

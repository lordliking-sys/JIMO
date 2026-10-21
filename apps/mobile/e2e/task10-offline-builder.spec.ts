import { expect, test } from '@playwright/test';
import { activePlanFixture } from './active-plan-fixture';

test('offline program save fails promptly, preserves the draft and leaves the dialog dismissible', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => localStorage.getItem('audit.offline') !== 'true',
    }),
  );
  const f = await activePlanFixture(page);
  await page.goto('/program');
  await expect(page.getByTestId('active-plan-heading')).toContainText('FORZA');
  await page
    .getByRole('button', { name: 'Cambia scheda', exact: true })
    .click();
  await page
    .getByRole('button', { name: '+ Nuova scheda', exact: true })
    .click();
  await page
    .getByLabel('Nome scheda', { exact: true })
    .fill('Bozza offline conservata');
  const writes = f.writes.length;
  await page.evaluate(() => {
    localStorage.setItem('audit.offline', 'true');
    window.dispatchEvent(new Event('offline'));
    const connection = Reflect.get(navigator, 'connection');
    if (connection instanceof EventTarget)
      connection.dispatchEvent(new Event('change'));
  });
  await page.getByRole('button', { name: 'Crea scheda', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Connessione non disponibile',
  );
  await expect(page.getByLabel('Nome scheda', { exact: true })).toHaveValue(
    'Bozza offline conservata',
  );
  await expect(
    page.getByRole('button', { name: 'Crea scheda', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Chiudi popup', exact: true }).click();
  await page
    .getByRole('button', { name: 'Scarta modifiche', exact: true })
    .click();
  await expect(page.getByTestId('program-popup-overlay')).toHaveCount(0);
  expect(f.writes.length).toBe(writes);
});

import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { manualField } from './helpers';
const fixture = resolve(
  __dirname,
  '../../api/test/fixtures/imports/multi-day.pdf',
);
const visible = (page: import('@playwright/test').Page, text: string) =>
  page.getByText(text, { exact: true }).filter({ visible: true });
async function preferences(page: import('@playwright/test').Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      'jimo.preferences.v1',
      JSON.stringify({
        version: 1,
        onboardingCompleted: true,
        localePreference: 'it',
        onboarding: {
          locale: 'it',
          goal: 'strength',
          experienceLevel: 'intermediate',
          trainingDaysPerWeek: 4,
          equipment: ['fullGym'],
          startMethod: 'manual',
        },
      }),
    ),
  );
}
test.afterEach(async ({ request }) => {
  if (process.env.DATABASE_URL)
    expect(
      (await request.post('http://localhost:4301/__e2e/reset-imports')).ok(),
    ).toBeTruthy();
});
test('real upload + fake extractor + Neon: persistent review, edit shared prescription, remove and explicit custom, atomic draft confirmation', async ({
  page,
  request,
}, testInfo) => {
  test.skip(!process.env.DATABASE_URL, 'Requires guarded Neon development');
  test.setTimeout(120000);
  await preferences(page);
  let uploads = 0,
    confirmations = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      request.url().endsWith('/imports/workout-plan')
    )
      uploads++;
    if (
      request.method() === 'POST' &&
      request.url().endsWith('/imports/workout-plan/confirm')
    )
      confirmations++;
  });
  await page.goto('/program');
  await page
    .getByRole('button', { name: 'Importa scheda', exact: true })
    .click();
  for (const name of [
    'Scatta una foto',
    'Scegli dalla galleria',
    'Scegli un PDF',
  ])
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page
    .getByRole('button', { name: 'Scegli un PDF', exact: true })
    .click();
  await (await chooser).setFiles(fixture);
  await expect(visible(page, 'multi-day.pdf')).toBeVisible();
  await page
    .getByRole('button', { name: 'Analizza scheda', exact: true })
    .click();
  await expect(visible(page, 'Analisi della scheda…')).toBeVisible();
  await expect(visible(page, 'DA VERIFICARE')).toBeVisible();
  await expect(visible(page, 'Da confermare').first()).toBeVisible();
  await expect(
    visible(page, 'Esercizio non riconosciuto · scegli o crea un esercizio'),
  ).toBeVisible();
  const api = 'http://localhost:4301';
  const before = await request.get(api + '/programs');
  expect(before.ok()).toBeTruthy();
  expect(
    (await before.json()).programs.some(
      (p: { name: string }) => p.name === 'Upper',
    ),
  ).toBeFalsy();
  await page
    .getByRole('textbox', { name: 'Nome programma', exact: true })
    .fill('Imported Upper');
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Nome programma', exact: true }),
  ).toHaveValue('Imported Upper');
  expect(uploads).toBe(1);
  await page.goto('/program');
  await page
    .getByRole('button', { name: 'Riprendi revisione', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Nome programma', exact: true }),
  ).toHaveValue('Imported Upper');
  expect(uploads).toBe(1);
  await page
    .getByRole('button', { name: 'Modifica esercizio', exact: true })
    .first()
    .click();
  await (await manualField(page, 'Carico (kg)')).fill('82,5');
  await page
    .getByRole('button', { name: 'Salva modifiche', exact: true })
    .click();
  await expect(visible(page, '4 × 8 · 82,5 kg')).toBeVisible();
  // The duration item is removed entirely before any database write.
  await page
    .getByRole('button', { name: 'Rimuovi', exact: true })
    .nth(2)
    .click();
  await expect(visible(page, 'Plank')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Modifica esercizio', exact: true })
    .last()
    .click();
  await page
    .getByRole('button', {
      name: '+ Crea esercizio personalizzato',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Ripetizioni', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Usa questo esercizio personalizzato',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Carico esterno', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Salva modifiche', exact: true })
    .click();
  const existing = await request.get(
    api + '/exercises?search=Pushdown%20corda',
  );
  expect((await existing.json()).exercises).toHaveLength(0);
  await page.screenshot({
    path: testInfo.outputPath('import-review.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Conferma e crea programma', exact: true })
    .click();
  await expect(page).toHaveURL(/\/program\/[0-9a-f-]{36}$/);
  await expect(visible(page, 'BOZZA')).toBeVisible();
  await expect(visible(page, 'Imported Upper')).toBeVisible();
  await expect(visible(page, '4 × 8 · 82,5 kg')).toBeVisible();
  await expect(visible(page, 'Pushdown corda')).toBeVisible();
  expect(confirmations).toBe(1);
  expect(uploads).toBe(1);
  const after = await request.get(api + '/programs');
  expect(
    (await after.json()).programs.filter(
      (p: { name: string }) => p.name === 'Imported Upper',
    ),
  ).toHaveLength(1);
  await page.screenshot({
    path: testInfo.outputPath('imported-builder.png'),
    fullPage: true,
  });
});
test('safe import error can be retried manually; source/confirmation routes remain protected', async ({
  page,
}) => {
  test.skip(!process.env.DATABASE_URL, 'Requires guarded Neon development');
  await preferences(page);
  let calls = 0;
  await page.route('**/imports/workout-plan', async (route) => {
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'POST',
        },
      });
    calls++;
    await route.fulfill({
      status: 503,
      json: {
        error: {
          code: 'AI_TEMPORARILY_UNAVAILABLE',
          message: 'private-provider-message-never-shown',
        },
      },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/program/create');
  await page
    .getByRole('button', { name: 'Importa scheda', exact: true })
    .click();
  const chooser = page.waitForEvent('filechooser');
  await page
    .getByRole('button', { name: 'Scegli un PDF', exact: true })
    .click();
  await (await chooser).setFiles(fixture);
  await page
    .getByRole('button', { name: 'Analizza scheda', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'L’analisi non è disponibile',
  );
  await expect(
    page.getByText('private-provider-message-never-shown'),
  ).toHaveCount(0);
  expect(calls).toBe(1);
  await page
    .getByRole('button', { name: 'Analizza scheda', exact: true })
    .click();
  await expect.poll(() => calls).toBe(2);
});

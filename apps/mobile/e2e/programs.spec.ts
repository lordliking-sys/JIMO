import { expect, test } from '@playwright/test';
test('manual program persists on Neon: builder, edit, activation, archive and custom exercise', async ({
  page,
}, testInfo) => {
  test.skip(!process.env.DATABASE_URL, 'Requires Neon development');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
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
  const visibleText = (value: string) =>
    page.getByText(value, { exact: true }).filter({ visible: true });
  await page.goto('/program');
  await expect(visibleText('Non hai ancora un programma.')).toBeVisible();
  await page
    .getByRole('button', { name: 'Crea programma', exact: true })
    .click();
  await expect(visibleText('In arrivo')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Crea manualmente', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Nome programma', exact: true })
    .fill('Upper');
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await expect(visibleText('Upper')).toBeVisible();
  await page
    .getByRole('button', { name: '+ Aggiungi giorno', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Nome giorno', exact: true })
    .fill('Push');
  await page.getByRole('button', { name: 'Salva giorno', exact: true }).click();
  await expect(visibleText('Push')).toBeVisible();
  await page
    .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Cerca esercizio', exact: true })
    .fill('panca');
  await page.getByRole('button', { name: 'Panca piana', exact: true }).click();
  await page
    .getByRole('button', { name: 'Carico esterno', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Serie', exact: true }).fill('4');
  await page
    .getByRole('textbox', { name: 'Ripetizioni', exact: true })
    .fill('8');
  await page
    .getByRole('textbox', { name: 'Carico (kg)', exact: true })
    .fill('80');
  await page
    .getByRole('textbox', {
      name: 'Recupero (secondi, opzionale)',
      exact: true,
    })
    .fill('180');
  await page
    .getByRole('textbox', { name: 'RPE (opzionale)', exact: true })
    .fill('8');
  await page
    .getByRole('button', { name: 'Salva esercizio', exact: true })
    .click();
  await expect(visibleText('4 × 8')).toBeVisible();
  await expect(visibleText('Carico esterno · 80 kg')).toBeVisible();
  await expect(visibleText('Recupero 3:00')).toBeVisible();
  const url = page.url();
  await page.reload();
  await expect(visibleText('Panca piana')).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Modifica esercizio Panca piana',
      exact: true,
    })
    .click();
  await page
    .getByRole('textbox', { name: 'Carico (kg)', exact: true })
    .fill('82,5');
  await page
    .getByRole('button', { name: 'Salva esercizio', exact: true })
    .click();
  await expect(visibleText('Carico esterno · 82,5 kg')).toBeVisible();
  await page
    .getByRole('button', { name: 'Attiva programma', exact: true })
    .click();
  await expect(visibleText('ATTIVO')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('builder.png'),
    fullPage: true,
  });
  await page.goto('/');
  await expect(visibleText('PROGRAMMA ATTIVO')).toBeVisible();
  await page
    .getByRole('button', { name: 'Visualizza programma', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Archivia programma', exact: true })
    .click();
  await expect(
    visibleText('Archiviare il programma attivo? Lo storico sarà conservato.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Conferma', exact: true }).click();
  await expect(visibleText('ARCHIVIATO')).toBeVisible();
  await page
    .getByRole('button', { name: '+ Aggiungi esercizio', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: '+ Crea esercizio personalizzato',
      exact: true,
    })
    .click();
  await page
    .getByRole('textbox', { name: 'Nome esercizio', exact: true })
    .fill('Push-Up Deficit');
  await page.getByRole('button', { name: 'Corpo libero', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Salva esercizio personalizzato',
      exact: true,
    })
    .click();
  await expect(visibleText('Push-Up Deficit')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Carico (kg)', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Salva esercizio', exact: true })
    .click();
  await expect(visibleText('Push-Up Deficit')).toBeVisible();
  await page.goto(url);
  await expect(visibleText('Push-Up Deficit')).toBeVisible();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

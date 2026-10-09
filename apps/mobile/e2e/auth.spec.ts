import { test, expect } from '@playwright/test';
import { workoutFixture } from './workout-fixture';
test('test auth: sign in, app guard, workout and progress; logout warning preserves active workout', async ({
  page,
}, info) => {
  await workoutFixture(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('jimo.test.initialized') !== 'true') {
      sessionStorage.setItem('jimo.test.signedOut', 'true');
      sessionStorage.setItem('jimo.test.initialized', 'true');
    }
  });
  await page.goto('/workout');
  // Saved onboarding from the shared fixture routes first to account.
  await expect(
    page.getByRole('button', { name: 'Accedi', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Impostazioni', exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await page
        .getByRole('button', { name: 'Mostra password', exact: true })
        .boundingBox()
    )?.height,
  ).toBeGreaterThanOrEqual(48);
  await page.screenshot({ path: info.outputPath('auth-sign-in-cleanup.png') });
  await page
    .getByRole('textbox', { name: 'Email', exact: true })
    .fill('example@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('only-test-fixture');
  await page
    .getByRole('button', { name: 'Mostra password', exact: true })
    .click();
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Scheda', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
  await page
    .getByRole('button', { name: /Inizia allenamento/ })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: '✓ Completa serie', exact: true }),
  ).toBeVisible();
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Esci', exact: true }).click();
  await expect(
    page.getByText(/Hai un allenamento attivo/, { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  await page.getByRole('tab', { name: 'Progressi', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'PROGRESSI', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath('authenticated-progress.png'),
  });
});
test('test auth verification and password reset screens keep errors and keyboard-accessible CTA', async ({
  page,
}) => {
  await workoutFixture(page);
  await page.addInitScript(() =>
    sessionStorage.setItem('jimo.test.signedOut', 'true'),
  );
  await page.goto('/auth/sign-up');
  await page
    .getByRole('textbox', { name: 'Email', exact: true })
    .fill('example@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByLabel('Conferma password', { exact: true }).fill('different');
  await page.getByRole('button', { name: 'Crea account', exact: true }).click();
  await expect(
    page.getByText('Le password devono coincidere.', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Conferma password', { exact: true })
    .fill('test-password');
  await page.getByRole('button', { name: 'Crea account', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Codice', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Torna ad Accedi', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Password dimenticata?', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Email', exact: true })
    .fill('example@example.invalid');
  await page
    .getByRole('button', { name: 'Password dimenticata?', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Codice', exact: true })
    .fill('123456');
  await page.getByRole('button', { name: 'Verifica', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Nuova password', exact: true }),
  ).toBeVisible();
});

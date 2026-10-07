import { expect, test } from '@playwright/test';
test('AI off: manual creation stays available, imports and AI are non-clickable and deep links cannot open review', async ({
  page,
}) => {
  test.skip(
    process.env.EXPO_PUBLIC_AI_IMPORT_ENABLED === 'true',
    'Checks the default AI-off build',
  );
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
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.hostname === 'api.openai.com' ||
      url.pathname.startsWith('/imports/') ||
      url.pathname === '/features'
    )
      forbiddenRequests.push(url.pathname);
  });
  await page.route('**/features', (route) =>
    route.fulfill({
      json: { workoutPlanImport: true, aiProgramCreation: false },
    }),
  );
  await page.route('**/programs', (route) =>
    route.fulfill({ json: { programs: [] } }),
  );
  await page.goto('/program');
  await expect(
    page.getByText('Importa scheda · In arrivo', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Importa scheda', exact: true }),
  ).toHaveCount(0);
  await page.goto('/program/create');
  await expect(page.getByText('In arrivo', { exact: true })).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Crea con AI', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Importa scheda', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Crea manualmente', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Nome programma', exact: true }),
  ).toBeVisible();
  for (const path of ['/import', '/import/review', '/import/exercise']) {
    await page.goto(path);
    await expect(
      page.getByRole('tab', { name: 'Home', exact: true }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/import(?:\/|$)/);
  }
  expect(forbiddenRequests).toEqual([]);
});

import { expect, test } from '@playwright/test';

test('first onboarding persists validated preferences, back navigation and language after reopen', async ({
  page,
}) => {
  await page.route('http://localhost:4301/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
    };
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers });
    const payload =
      path === '/sync/identity'
        ? { userId: '3c9e1b7d-7596-4f15-a11c-48b8ef237413' }
        : path === '/programs'
          ? { programs: [] }
          : path === '/workouts/active'
            ? { workout: null }
            : path === '/workouts'
              ? { workouts: [] }
              : path === '/features'
                ? { workoutPlanImport: false, aiProgramCreation: false }
                : null;
    return route.fulfill({
      json: payload,
      headers,
      status: payload === null ? 404 : 200,
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Inizia', exact: true }).click();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Continue', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('radio', { name: 'Build strength', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: 'Build strength', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('radio', { name: 'Intermediate', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByRole('radio', { name: '3 days per week', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Bodyweight', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Dumbbells', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByRole('radio', { name: 'Create manually', exact: true })
    .click();
  await expect(
    page.getByRole('tab', { name: 'Home', exact: true }),
  ).toBeVisible();
  const preferences = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('jimo.preferences.v1') ?? '{}'),
  );
  expect(preferences.onboardingCompleted).toBe(true);
  expect(preferences.onboarding).toMatchObject({
    goal: 'strength',
    experienceLevel: 'intermediate',
    trainingDaysPerWeek: 3,
    equipment: ['bodyweight', 'dumbbells'],
    startMethod: 'manual',
    locale: 'en',
  });
  await page.reload();
  await expect(
    page.getByRole('tab', { name: 'Home', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Get started', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('jimo.preferences.v1') ?? '{}'),
  );
  expect(stored.onboarding).toEqual(preferences.onboarding);
});

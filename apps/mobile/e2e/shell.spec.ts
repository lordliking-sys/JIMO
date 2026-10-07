import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/sync/identity', (route) =>
    route.fulfill({ json: { userId: '3c9e1b7d-7596-4f15-a11c-48b8ef237413' } }),
  );
  await page.route('**/progress/**', (route) => {
    const url = new URL(route.request().url()),
      period = {
        range: url.searchParams.get('range') ?? '8w',
        timeZone: url.searchParams.get('timeZone') ?? 'UTC',
        from: '2026-08-12T00:00:00Z',
        to: '2026-10-06T19:00:00Z',
        effectiveWeeks: 8,
      };
    const payload = url.pathname.endsWith('/summary')
      ? {
          period,
          completedWorkouts: 0,
          trainingSeconds: null,
          completedSets: 0,
          skippedSets: 0,
          totalReps: null,
          averageRpe: null,
          sessionsPerWeek: 0,
          adherence: null,
        }
      : url.pathname.endsWith('/weekly')
        ? { period, weeks: [] }
        : url.pathname.endsWith('/prs')
          ? { period, records: [], nextCursor: null }
          : { period, exercises: [], nextCursor: null };
    return route.fulfill({
      json: payload,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
      },
    });
  });
  await page.route('**/workouts/active', (route) =>
    route.fulfill({ json: { workout: null } }),
  );
  await page.route('**/workouts?*', (route) =>
    route.fulfill({ json: { workouts: [] } }),
  );
});
async function checkWidths(page: Page) {
  for (const width of [320, 375, 390, 393, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
test('complete onboarding, reload, change language and open program placeholders', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  await page.clock.install({ time: new Date('2026-10-06T19:00:00Z') });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/programs', async (route) => {
    if (route.request().method() === 'GET')
      await route.fulfill({ json: { programs: [] } });
    else await route.continue();
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Inizia', exact: true }),
  ).toBeVisible();
  await checkWidths(page);
  await page.screenshot({
    path: testInfo.outputPath('welcome.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Inizia', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: 'Sistema', exact: true }),
  ).toBeChecked();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await expect(page.getByText('Your language.', { exact: true })).toBeVisible();
  await checkWidths(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Continue', exact: true }),
  ).toBeDisabled();
  await checkWidths(page);
  await page
    .getByRole('radio', { name: 'Build strength', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await checkWidths(page);
  await page.getByRole('radio', { name: 'Intermediate', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: 'Intermediate', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await checkWidths(page);
  await page
    .getByRole('radio', { name: '3 days per week', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await checkWidths(page);
  await page.getByRole('checkbox', { name: 'Bodyweight', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Dumbbells', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await checkWidths(page);
  await page
    .getByRole('radio', { name: 'Create manually', exact: true })
    .click();
  await expect(page.getByText('Good evening', { exact: true })).toBeVisible();
  await checkWidths(page);
  await page.screenshot({
    path: testInfo.outputPath('home.png'),
    fullPage: true,
  });
  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('jimo.preferences.v1') ?? '{}'),
  );
  expect(persisted.onboardingCompleted).toBe(true);
  expect(persisted.onboarding).toMatchObject({
    goal: 'strength',
    experienceLevel: 'intermediate',
    trainingDaysPerWeek: 3,
    equipment: ['bodyweight', 'dumbbells'],
    startMethod: 'manual',
    locale: 'en',
  });
  await page.reload();
  await expect(page.getByText('Good evening', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Get started', exact: true }),
  ).toHaveCount(0);
  await page.getByText('Program', { exact: true }).last().click();
  await expect(
    page.getByText("You don't have a program yet.", { exact: true }),
  ).toBeVisible();
  await checkWidths(page);
  await page
    .getByRole('button', { name: 'Create program', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Program name', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByText('Workout', { exact: true }).last().click();
  await expect(
    page.getByText('Activate a program to get started', { exact: true }),
  ).toBeVisible();
  await checkWidths(page);
  await page.getByText('Progress', { exact: true }).last().click();
  await expect(
    page.getByText('Complete your first workout to start seeing progress.', {
      exact: true,
    }),
  ).toBeVisible();
  await checkWidths(page);
  await page.getByText('Profile', { exact: true }).last().click();
  await page.getByRole('radio', { name: 'Italiano', exact: true }).click();
  await expect(page.getByText('Lingua', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await page.reload();
  await expect(page.getByText('Lingua', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await expect(page.getByText('Language', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'System', exact: true }).click();
  await expect(page.getByText('Lingua', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(
    page.getByRole('radio', { name: 'Sistema', exact: true }),
  ).toBeChecked();
  await checkWidths(page);
  await page.getByText('Home', { exact: true }).last().click();
  await page
    .getByRole('button', { name: 'Crea il tuo primo programma', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Nome programma', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await page.goto('/program/create');
  await expect(page.getByText('In arrivo', { exact: true })).toHaveCount(1);
  await checkWidths(page);
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await expect(page.getByText('Buonasera', { exact: true })).toBeVisible();
  await page.goto('/onboarding');
  await expect(page.getByText('Buonasera', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('unsupported device language falls back to English and deep links cannot bypass onboarding', async ({
  browser,
}) => {
  const context = await browser.newContext({
    locale: 'fr-FR',
    reducedMotion: 'no-preference',
    viewport: { width: 320, height: 700 },
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4173/program/create');
  await expect(
    page.getByRole('button', { name: 'Get started', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Coming soon', { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe('rgb(9, 11, 15)');
  await context.close();
});

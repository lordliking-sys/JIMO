import { expect, test } from '@playwright/test';
test.use({ timezoneId: 'Europe/Rome' });
test('compact tabs, a single manual CTA, local greeting and accessible language rows', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date('2026-10-06T08:00:00Z') });
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
  await page.route('**/programs', (route) =>
    route.fulfill({ json: { programs: [] } }),
  );
  await page.goto('/');
  await expect(
    page.getByText('Buongiorno', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(5);
    for (const tab of await tabs.all()) {
      const bounds = await tab.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(48);
      expect(bounds?.height).toBeGreaterThanOrEqual(48);
      expect(await tab.innerText()).not.toMatch(/\.\.\.|…/);
      expect(
        await tab.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Programma', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Crea programma', exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Crea manualmente', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Crea con AI · In arrivo', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Importa scheda · In arrivo', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('program.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Crea programma', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Nome programma', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await page.getByRole('tab', { name: 'Profilo', exact: true }).click();
  for (const name of ['Sistema', 'Italiano', 'English']) {
    const row = page.getByRole('radio', { name, exact: true });
    expect((await row.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  }
  await page.screenshot({
    path: testInfo.outputPath('profile.png'),
    fullPage: true,
  });
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: 'English', exact: true }),
  ).toBeChecked();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(
    page.getByText('Good morning', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.clock.fastForward(2 * 60 * 60 * 1000);
  await expect(
    page.getByText('Good afternoon', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.clock.fastForward(6 * 60 * 60 * 1000);
  await expect(
    page.getByText('Good evening', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('home.png'),
    fullPage: true,
  });
});

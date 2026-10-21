import { expect, test } from '@playwright/test';
import { activePlanFixture } from './active-plan-fixture';

test('a stale program list cannot override the active detail used by Home, Scheda and start', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-19T10:00:00Z') });
  const f = await activePlanFixture(page);
  f.alternate.days[0]!.name = 'Upper nuovo';
  f.alternate.days[0]!.exercises[0]!.exercise.displayName = 'Esercizio nuovo';
  await page.goto('/program');
  await expect(page.getByTestId('active-plan-heading')).toContainText('FORZA');
  f.source.program.status = 'archived';
  f.alternate.status = 'active';
  await page.route(
    `http://localhost:4301/programs/${f.source.program.id}`,
    (route) => route.abort(),
  );
  const summary = (program: typeof f.alternate) => {
    const { days: _days, ...item } = program;
    return item;
  };
  let lists = 0;
  await page.route('http://localhost:4301/programs', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    lists++;
    const programs =
      lists === 1
        ? [summary(f.source.program), summary(f.alternate)]
        : [
            { ...summary(f.source.program), status: 'active' },
            { ...summary(f.alternate), status: 'draft' },
          ];
    return route.fulfill({
      json: { programs },
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
      },
    });
  });
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('home-workout-card')).toContainText(
    'Upper nuovo',
  );
  await expect(page.getByTestId('home-upcoming-exercise')).toContainText(
    'Esercizio nuovo',
  );
  await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
  await expect(page.getByTestId('active-plan-heading')).toContainText(
    'Ipertrofia',
  );
  await expect(page.getByTestId('active-plan-heading')).not.toContainText(
    'FORZA',
  );
  // Subsequent requests also return the stale list; freeze transport failures
  // now so this assertion exercises the validated cached active detail.
  await page.route('http://localhost:4301/programs', (route) => route.abort());
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('home-workout-card')).toContainText(
    'Upper nuovo',
  );
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .click();
  await expect(page).toHaveURL(/\/workout\/[^/]+$/);
  await expect(
    page.getByRole('heading', { name: 'Upper nuovo', exact: true }),
  ).toBeVisible();
});

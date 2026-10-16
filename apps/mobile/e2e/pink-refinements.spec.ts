import { expect, test } from '@playwright/test';
import { activePlanFixture } from './active-plan-fixture';
import { workoutFixture } from './workout-fixture';
import { simulateSafeArea } from './helpers';

const sizes = [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
];
for (const size of sizes) {
  test(`Home deletion updates while sync is unavailable ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.clock.install({ time: new Date('2026-10-08T10:00:00Z') });
    const f = await activePlanFixture(page);
    const day = f.source.program.days[0]!;
    day.dayOfWeek = 4;
    f.source.program.days.slice(1).forEach((d) => {
      d.exercises = [];
    });
    await page.goto('/');
    const upcoming = page.getByTestId('home-upcoming-exercise');
    await expect(upcoming).toContainText('Panca piana');
    // Mutations return actual DTOs but reconciliation cannot repair SQLite for this test.
    await page.route('**/sync/identity', (route) =>
      route.fulfill({
        status: 503,
        headers: { 'access-control-allow-origin': '*' },
        json: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Isolated sync unavailable',
          },
        },
      }),
    );
    await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
    await page.getByTestId(`program-day-${day.id}`).click();
    await page
      .getByRole('button', {
        name: 'Modifica esercizio Panca piana',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Rimuovi esercizio', exact: true })
      .click();
    await page.getByRole('button', { name: 'Conferma', exact: true }).click();
    await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
    await page
      .getByRole('button', { name: 'Chiudi popup', exact: true })
      .last()
      .click();
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(upcoming).toContainText('Trazioni');
    await expect(
      page.getByTestId('home-body').getByText('Panca piana', { exact: true }),
    ).toHaveCount(0);
    await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
    await page.getByTestId(`program-day-${day.id}`).click();
    await page.getByRole('button', { name: 'Riordina', exact: true }).click();
    await page.getByRole('button', { name: 'Elimina', exact: true }).click();
    await page.getByRole('button', { name: 'Conferma', exact: true }).click();
    await expect(
      page.getByRole('button', {
        name: `Apri giorno ${day.name}`,
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(/\/program$/);
    await page
      .getByRole('button', { name: 'Chiudi popup', exact: true })
      .click();
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(upcoming).toHaveCount(0);
    await expect(
      page.getByText('I tuoi esercizi appariranno qui.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
    await page
      .getByRole('button', { name: 'Modifica scheda', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Altre azioni', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Elimina programma', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Elimina programma', exact: true })
      .last()
      .click();
    await expect(page.getByTestId('program-popup-overlay')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(page.getByTestId('home-workout-card')).not.toContainText(
      'FORZA',
    );
    await expect(upcoming).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('home-workout-card')).not.toContainText(
      'FORZA',
    );
    await expect(upcoming).toHaveCount(0);
    expect(f.plans.has(f.source.program.id)).toBe(false);
    await expect(page.getByTestId('home-workout-card')).toContainText(
      'Nessuna scheda attiva',
    );
    await expect(
      page.getByRole('button', { name: 'Vai a Scheda', exact: true }),
    ).toBeEnabled();
  });

  test(`Home clears a server-deleted synced workout ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    const f = await workoutFixture(page);
    f.workout.name = 'Sessione eliminata';
    f.workout.exercises[0]!.exerciseNameSnapshot = 'Esercizio eliminato';
    f.setStarted();
    await page.goto('/');
    await expect(page.getByTestId('home-workout-card')).toContainText(
      'Sessione eliminata',
    );
    await expect(page.getByTestId('home-upcoming-exercise')).toContainText(
      'Esercizio eliminato',
    );
    const headers = { 'access-control-allow-origin': '*' };
    await page.route('**/workouts/active', (route) =>
      route.fulfill({ json: { workout: null }, headers }),
    );
    await page.route(`**/workouts/${f.workout.id}`, (route) =>
      route.fulfill({
        status: 404,
        json: {
          error: { code: 'NOT_FOUND', message: 'Isolated deleted workout' },
        },
        headers,
      }),
    );
    await page.getByRole('tab', { name: 'Profilo', exact: true }).click();
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await expect(page.getByTestId('home-workout-card')).not.toContainText(
      'Sessione eliminata',
    );
    await expect(
      page
        .getByTestId('home-body')
        .getByText('Esercizio eliminato', { exact: true }),
    ).toHaveCount(0);
  });

  test(`Pink layout, safe area, gothic Scheda and gear-free Profile ${size.width}x${size.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(size);
    const top = size.width >= 393 ? 47 : 24;
    await simulateSafeArea(page, top, size.width >= 393 ? 34 : 48);
    await activePlanFixture(page);
    for (const [route, heroId] of [
      ['/', 'home-hero'],
      ['/program', 'program-tab-hero'],
      ['/progress', 'progress-tab-hero'],
      ['/profile', 'profile-tab-hero'],
    ]) {
      await page.goto(route!);
      const hero = page.getByTestId(heroId!);
      await expect(hero).toBeVisible();
      const bounds = (await hero.boundingBox())!;
      expect(bounds.y).toBeGreaterThanOrEqual(top);
      const title = hero.locator('[role="heading"]').first();
      expect((await title.boundingBox())!.y).toBeGreaterThanOrEqual(top);
      const fade = page.getByTestId('section-status-fade');
      await expect(fade).toHaveCount(1);
      expect((await fade.boundingBox())!.height).toBe(top + 28);
      expect(
        await fade.evaluate((el) => getComputedStyle(el).pointerEvents),
      ).toBe('none');
      await expect(fade.locator('stop').last()).toHaveAttribute(
        'stop-opacity',
        '0',
      );
      if (route === '/') {
        const label = page.getByTestId('home-brand');
        await expect(label).toHaveText('HOME');
        await expect(hero.getByRole('heading')).toHaveCount(1);
        await expect(
          hero.getByText(/Buongiorno|Buon pomeriggio|Buonasera/),
        ).toHaveCount(0);
        expect((await label.boundingBox())!.y - bounds.y).toBeLessThan(32);
        expect((await label.boundingBox())!.x).toBeLessThan(32);
      }
      if (route === '/program') {
        await expect(hero.locator('[dir="auto"]')).toHaveText(['SCHEDA']);
        await expect(
          page.getByTestId('section-hero-art').locator('img'),
        ).toHaveAttribute('src', /profilo-mood-reference/);
      }
      if (route === '/progress') {
        await expect(page.getByTestId('progress-artwork-depth')).toHaveCount(1);
        await expect(
          page.getByTestId('progress-focused-original'),
        ).toHaveAttribute('mask', /^url\(#depth-/);
        await expect(page.getByTestId('progress-body')).toHaveCSS(
          'background-color',
          'rgb(255, 247, 250)',
        );
        const tabs = page.getByTestId('progress-tabs-scroll');
        const row = (await tabs.boundingBox())!;
        expect(
          await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        ).toBe(true);
        for (const name of ['Panoramica', 'Forza', 'Volume', 'Frequenza']) {
          const tab = page.getByRole('tab', { name, exact: true });
          const b = (await tab.boundingBox())!;
          expect(b.x).toBeGreaterThanOrEqual(row.x);
          expect(b.x + b.width).toBeLessThanOrEqual(row.x + row.width + 1);
          expect(b.height).toBeGreaterThanOrEqual(48);
          await tab.click();
          await expect(tab).toHaveAttribute('aria-selected', 'true');
        }
      }
      if (route === '/profile') {
        await expect(
          page.getByRole('button', { name: 'Impostazioni', exact: true }),
        ).toHaveCount(0);
        await expect(page.getByTestId('profile-body')).toHaveCSS(
          'background-color',
          'rgb(255, 247, 250)',
        );
        await expect(page.getByTestId('profile-editorial-screen')).toHaveCSS(
          'background-color',
          'rgb(255, 247, 250)',
        );
      }
      await page.screenshot({
        path: info.outputPath(
          `${route === '/' ? 'home' : route!.slice(1)}.png`,
        ),
      });
    }
  });
}

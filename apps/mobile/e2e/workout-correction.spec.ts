import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { workoutFixture } from './workout-fixture';

async function watchHistory(page: Page) {
  await page.evaluate(() => {
    const events: string[] = [];
    Object.assign(window, { correctionNavigation: events });
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = history[method].bind(history);
      history[method] = (...args) => {
        events.push(method);
        return original(...args);
      };
    }
  });
}
async function noNavigation(page: Page, url: string) {
  await expect(page).toHaveURL(url);
  expect(
    await page.evaluate(() => Reflect.get(window, 'correctionNavigation')),
  ).toEqual([]);
}

test('no artwork reserves no space; Standard and Pyramid complete buttons are static, with no automatic saves', async ({
  page,
}) => {
  const fixture = await workoutFixture(page);
  fixture.setStarted();
  await page.clock.install({ time: new Date('2026-10-08T10:00:00Z') });
  await page.goto(`/workout/${fixture.workout.id}`);
  const button = page.getByRole('button', {
    name: '✓ Completa serie',
    exact: true,
  });
  await expect(button).toBeVisible();
  await expect(page.getByTestId('workout-exercise-image-slot')).toHaveCount(0);
  await expect(page.getByTestId('workout-exercise-artwork')).toHaveCount(0);
  const title = (await page
    .getByRole('heading', { name: 'Panca piana', exact: true })
    .boundingBox())!;
  const header = (await page
    .getByRole('heading', { name: 'PUSH', exact: true })
    .boundingBox())!;
  expect(title.y - (header.y + header.height)).toBeLessThan(70);
  const before = await button.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  await expect(button.locator('svg')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.clock.fastForward(120000);
  expect(
    await button.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe(before);
  expect(
    await button.evaluate(
      (node) => node.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  expect(fixture.writes).toEqual([]);
  expect(fixture.workout.exercises[0]!.sets[0]!.actualReps).toBeNull();
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await page
    .getByRole('button', { name: 'Anteprima piramidale', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  const previewButton = dialog.getByRole('button', {
    name: '✓ Completa serie',
    exact: true,
  });
  await expect(previewButton).toBeDisabled();
  await expect(dialog.getByTestId('workout-exercise-artwork')).toHaveCount(0);
  await expect(dialog.getByTestId('workout-exercise-image-slot')).toHaveCount(
    0,
  );
  await expect(previewButton.locator('svg')).toHaveCount(0);
  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  const previewColor = await previewButton.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  await page.clock.fastForward(120000);
  expect(
    await previewButton.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    ),
  ).toBe(previewColor);
  expect(fixture.writes).toEqual([]);
});

test('correction opens, cancels, handles modal Back and saves without navigation, remount or rest reset', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const now = new Date('2026-10-08T10:00:00Z');
  await page.clock.install({ time: now });
  const fixture = await workoutFixture(page);
  fixture.setStarted();
  const set = fixture.workout.exercises[0]!.sets[0]!;
  Object.assign(set, {
    status: 'completed',
    actualReps: 5,
    actualLoadKg: '80.00',
    actualRpe: '8.0',
    completedAt: new Date(now.getTime() - 78000).toISOString(),
  });
  fixture.workout.completedSets = 1;
  fixture.workout.pendingSets--;
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (/GO_BACK/.test(message.text())) warnings.push(message.text());
  });
  await page.goto(`/workout/${fixture.workout.id}`);
  const rest = page.getByRole('progressbar', { name: /RECUPERO/ });
  await expect(rest).toBeVisible();
  const surface = await page.getByTestId('workout-surface').elementHandle();
  const scroller = await rest.evaluateHandle((node) => {
    const viewport = node.closest('[data-testid="workout-viewport"]')!;
    return Array.from(viewport.querySelectorAll<HTMLElement>('*')).find(
      (element) =>
        getComputedStyle(element).overflowY === 'auto' ||
        getComputedStyle(element).overflowY === 'scroll',
    )!;
  });
  const completedAt = set.completedAt;
  const before = Number(await rest.getAttribute('aria-valuenow'));
  const url = page.url();
  await watchHistory(page);
  const edit = page.getByRole('button', {
    name: 'Correggi serie 1',
    exact: true,
  });
  await edit.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/correggi serie/i)).toBeVisible();
  const scrollBefore = await scroller.evaluate((node) => node.scrollTop);
  await noNavigation(page, url);
  await page.clock.runFor(10000);
  expect(Number(await rest.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(
    before - 10,
  );
  await dialog
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  await page.screenshot({ path: info.outputPath('correction-overlay.png') });
  await dialog.getByRole('button', { name: 'Indietro', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await noNavigation(page, url);
  expect(fixture.writes).toEqual([]);
  await edit.click();
  await page.keyboard.press('Escape'); // RN web Modal invokes the same onRequestClose used by native hardware Back.
  await expect(dialog).toHaveCount(0);
  await noNavigation(page, url);
  await edit.click();
  await dialog
    .getByRole('button', { name: 'Annulla correzione', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await edit.click();
  await dialog
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Salva correzione', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => set.actualReps).toBe(6);
  expect(set.completedAt).toBe(completedAt);
  await noNavigation(page, url);
  expect(
    await surface!.evaluate(
      (node) =>
        node.isConnected &&
        node === document.querySelector('[data-testid="workout-surface"]'),
    ),
  ).toBe(true);
  expect(
    await scroller.evaluate(
      (node, previous) => node.isConnected && node.scrollTop === previous,
      scrollBefore,
    ),
  ).toBe(true);
  expect(Number(await rest.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(
    before - 10,
  );
  expect(warnings).toEqual([]);
});

test('correction preserves a live next-set draft, and expiry while editing returns to the next set only after closing', async ({
  page,
}) => {
  const now = new Date('2026-10-08T10:00:00Z');
  await page.clock.install({ time: now });
  const fixture = await workoutFixture(page);
  fixture.setStarted();
  const set = fixture.workout.exercises[0]!.sets[0]!;
  Object.assign(set, {
    status: 'completed',
    actualReps: 5,
    actualLoadKg: '80.00',
    actualRpe: '8.0',
    completedAt: new Date(now.getTime() - 175000).toISOString(),
  });
  fixture.workout.completedSets = 1;
  fixture.workout.pendingSets--;
  await page.goto(`/workout/${fixture.workout.id}`);
  await page
    .getByRole('button', { name: 'Correggi serie 1', exact: true })
    .click();
  const surface = await page.getByTestId('workout-surface').elementHandle();
  await page.clock.runFor(10000);
  await expect(
    page.getByRole('progressbar', { name: /RECUPERO/ }),
  ).toHaveAttribute('aria-valuenow', '0');
  expect(await surface!.evaluate((node) => node.isConnected)).toBe(true);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Indietro', exact: true })
    .click();
  await expect(page.getByLabel('Serie 2 di 2', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  const nextSurface = await page.getByTestId('workout-surface').elementHandle();
  await page
    .getByRole('button', { name: 'Correggi serie 1', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Salva correzione', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: 'Modifica manualmente Ripetizioni',
      exact: true,
    }),
  ).toHaveText('9');
  expect(await nextSurface!.evaluate((node) => node.isConnected)).toBe(true);
  expect(fixture.workout.exercises[0]!.sets[1]!.actualReps).toBeNull();
});

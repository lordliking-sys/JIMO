import { expect, test, type Page } from '@playwright/test';
import { activePlanFixture } from './active-plan-fixture';
import { simulateSafeArea } from './helpers';
import { randomUUID } from 'node:crypto';
test.use({ timezoneId: 'Europe/Rome' });
const phones = [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
];
async function open(page: Page, phone = phones[1]!) {
  await page.setViewportSize(phone);
  await simulateSafeArea(page, 24, 34);
  const f = await activePlanFixture(page),
    day = f.source.program.days[0]!;
  day.exercises = day.exercises.slice(0, 3);
  await page.goto('/program');
  await page.getByTestId(`program-day-${day.id}`).click();
  await expect(page.getByTestId('sortable-day-exercises')).toBeVisible();
  return { f, day };
}
async function drag(page: Page, from: string, to: string) {
  const first = page.getByTestId(`drag-exercise-${from}`),
    second = page.getByTestId(`drag-exercise-${to}`);
  await first.scrollIntoViewIfNeeded();
  const a = (await first.boundingBox())!,
    b = (await second.boundingBox())!;
  expect(a.width).toBeGreaterThanOrEqual(48);
  expect(a.height).toBeGreaterThanOrEqual(48);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 8, {
    steps: 14,
  });
  await expect
    .poll(async () => (await first.boundingBox())!.y)
    .toBeGreaterThan(a.y + a.height / 2);
  await page.mouse.up();
}
for (const phone of phones) {
  test(`Drag exercise rows persists order without reorder buttons ${phone.width}`, async ({
    page,
  }, info) => {
    const { f, day } = await open(page, phone),
      ids = day.exercises.map((e) => e.id);
    await expect(
      page.getByRole('button', { name: 'Riordina', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Sposta (su|giù)/ }),
    ).toHaveCount(0);
    await drag(page, ids[0]!, ids[1]!);
    await expect
      .poll(() => day.exercises.map((e) => e.id))
      .toEqual([ids[1], ids[0], ids[2]]);
    expect(
      f.writes.filter((w) => w.path.endsWith('/exercises/reorder')),
    ).toHaveLength(1);
    await page.screenshot({
      path: info.outputPath('day-draggable-exercises.png'),
    });
    await page.reload();
    await page.getByTestId(`program-day-${day.id}`).click();
    const handles = page
      .getByTestId('sortable-day-exercises')
      .locator('[data-testid^="drag-exercise-"]');
    await expect(handles.first()).toHaveAttribute(
      'data-testid',
      `drag-exercise-${ids[1]}`,
    );
    // Keyboard/screen-reader users retain an alternative to the pointer gesture.
    await handles.first().focus();
    await handles.first().press('ArrowDown');
    await expect.poll(() => day.exercises.map((e) => e.id)).toEqual(ids);
  });
}
test('Failed drag rolls back order and keeps retry possible', async ({
  page,
}) => {
  const { day } = await open(page),
    ids = day.exercises.map((e) => e.id);
  await page.route(`**/program-days/${day.id}/exercises/reorder`, (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    return route.fulfill({
      status: 503,
      json: { error: { code: 'UNAVAILABLE', message: 'Unavailable' } },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await drag(page, ids[0]!, ids[1]!);
  await expect(page.getByRole('alert')).toBeVisible();
  expect(day.exercises.map((e) => e.id)).toEqual(ids);
  await expect(
    page
      .getByTestId('sortable-day-exercises')
      .locator('[data-testid^="drag-exercise-"]')
      .first(),
  ).toHaveAttribute('data-testid', `drag-exercise-${ids[0]}`);
  await page.unroute(`**/program-days/${day.id}/exercises/reorder`);
  await page.getByTestId(`drag-exercise-${ids[0]}`).press('ArrowDown');
  await expect
    .poll(() => day.exercises.map((e) => e.id))
    .toEqual([ids[1], ids[0], ids[2]]);
});

test('Dragging near the popup edge scrolls a long list before saving its full order', async ({
  page,
}) => {
  await page.setViewportSize(phones[0]!);
  const f = await activePlanFixture(page),
    day = f.source.program.days[0]!;
  day.exercises = Array.from({ length: 12 }, (_, i) => ({
    ...structuredClone(day.exercises[i % day.exercises.length]!),
    id: randomUUID(),
    position: i,
  }));
  const original = day.exercises.map((e) => e.id);
  await page.goto('/program');
  await page.getByTestId(`program-day-${day.id}`).click();
  const handle = page.getByTestId(`drag-exercise-${original[0]}`);
  await handle.scrollIntoViewIfNeeded();
  const a = (await handle.boundingBox())!,
    scroll = page.getByTestId('program-popup-scroll'),
    viewport = (await scroll.boundingBox())!,
    before = await scroll.evaluate((el) => el.scrollTop);
  await page.mouse.move(a.x + 24, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 24, viewport.y + viewport.height - 8, {
    steps: 10,
  });
  await expect
    .poll(() => scroll.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(before + 140);
  await page.mouse.up();
  await expect
    .poll(
      () =>
        f.writes.filter((w) => w.path.endsWith('/exercises/reorder')).length,
    )
    .toBe(1);
  expect(day.exercises.findIndex((e) => e.id === original[0])).toBeGreaterThan(
    1,
  );
  expect(day.exercises.map((e) => e.id).sort()).toEqual([...original].sort());
});

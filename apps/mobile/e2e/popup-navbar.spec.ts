import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { activePlanFixture } from './active-plan-fixture';
import { simulateSafeArea } from './helpers';
const phones = [
  { width: 320, height: 740, top: 24, bottom: 48 },
  { width: 390, height: 780, top: 24, bottom: 48 },
  { width: 393, height: 851, top: 47, bottom: 34 },
  { width: 430, height: 860, top: 47, bottom: 34 },
];
async function open(page: Page, size: (typeof phones)[number]) {
  await page.setViewportSize(size);
  await simulateSafeArea(page, size.top, size.bottom);
  const f = await activePlanFixture(page);
  f.source.program.durationWeeks = 8;
  f.alternate.durationWeeks = 12;
  for (const [name, weeks] of [
    ['Calisthenics', 8],
    ['Full Body', 6],
  ] as const) {
    const p = {
      ...f.alternate,
      id: randomUUID(),
      name,
      durationWeeks: weeks,
      days: [],
      daysCount: 0,
    };
    f.plans.set(p.id, p);
  }
  await page.goto('/program');
  await expect(page.getByTestId('active-plan-heading')).toContainText('FORZA');
  return f;
}
async function bounds(page: Page, size: (typeof phones)[number]) {
  const box = (await page.getByTestId('program-central-popup').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(16);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width - 16);
  expect(box.width / size.width).toBeGreaterThanOrEqual(0.8);
  expect(box.width / size.width).toBeLessThanOrEqual(0.86);
  expect(box.y).toBeGreaterThanOrEqual(size.top + 16);
  expect(box.y + box.height).toBeLessThanOrEqual(
    size.height - size.bottom - 16 + 1,
  );
  expect(box.height).toBeLessThan(size.height - 80);
  const footer = (await page
    .getByTestId('program-popup-footer')
    .boundingBox())!;
  expect(footer.y + footer.height).toBeLessThanOrEqual(box.y + box.height);
}
for (const size of phones) {
  test(`Central popups: dismissal, dirty draft, keyboard, creation and activation ${size.width}x${size.height}`, async ({
    page,
  }, info) => {
    const f = await open(page, size),
      popup = page.getByTestId('program-popup-overlay');
    const create = () =>
      page.getByRole('button', { name: '+ Nuova scheda', exact: true }).click();
    await create();
    await bounds(page, size);
    await page
      .getByRole('button', { name: 'Chiudi popup', exact: true })
      .click();
    await expect(popup).toHaveCount(0);
    await create();
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await create();
    await page
      .getByTestId('program-popup-backdrop')
      .click({ position: { x: 4, y: 4 } });
    await expect(popup).toHaveCount(0);
    await create();
    await page.getByLabel('Nome scheda', { exact: true }).fill('Bozza popup');
    await page
      .getByTestId('program-popup-backdrop')
      .click({ position: { x: 4, y: 4 } });
    await expect(popup).toHaveCount(1);
    await expect(page.getByLabel('Nome scheda', { exact: true })).toHaveValue(
      'Bozza popup',
    );
    expect(
      await page
        .locator('#root')
        .evaluate((el) => el instanceof HTMLElement && el.inert),
    ).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Scarta modifiche', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Scarta modifiche', exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Scarta modifiche', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Continua a modificare', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Aumenta durata', exact: true })
      .click();
    await expect(
      page.getByLabel('Durata (settimane)', { exact: true }),
    ).toHaveValue('9');
    await page.locator('input[type="date"]').fill('2026-10-25');
    await bounds(page, size);
    await page.screenshot({ path: info.outputPath('new-plan-popup.png') });
    // A resized visual viewport models the space left by an on-screen keyboard.
    await page.setViewportSize({ width: size.width, height: 460 });
    await page.getByLabel('Nome scheda', { exact: true }).focus();
    await expect(
      page.getByRole('button', { name: 'Crea scheda', exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page.getByLabel('Durata (settimane)', { exact: true }).fill('12');
    await expect(
      page.getByLabel('Durata (settimane)', { exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole('button', { name: 'Crea scheda', exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page.setViewportSize(size);
    await page
      .getByRole('button', { name: 'Crea scheda', exact: true })
      .dblclick();
    await expect(popup).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe('/program');
    const draft = [...f.plans.values()].find((p) => p.name === 'Bozza popup')!;
    expect(draft.status).toBe('draft');
    expect(draft.durationWeeks).toBe(12);
    expect(draft.startsOn).toBe('2026-10-25');
    expect(
      f.writes.filter((w) => w.path === '/programs' && w.method === 'POST'),
    ).toHaveLength(1);
    await expect(page.getByTestId('active-plan-heading')).toContainText(
      'FORZA',
    );
    await page
      .getByRole('button', { name: 'Cambia scheda', exact: true })
      .click();
    await bounds(page, size);
    await expect(
      popup.getByRole('button', { name: 'FORZA, ATTIVA', exact: true }),
    ).toBeVisible();
    await expect(
      popup.getByRole('button', {
        name: 'Ipertrofia, NON ATTIVA',
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath('switch-plan-popup.png') });
    await popup
      .getByRole('button', { name: 'Ipertrofia, NON ATTIVA', exact: true })
      .click();
    await expect(page.getByTestId('switch-plan-confirmation')).toBeInViewport({
      ratio: 1,
    });
    await popup.getByRole('button', { name: 'Annulla', exact: true }).click();
    expect(f.alternate.status).toBe('draft');
    await popup
      .getByRole('button', { name: 'Ipertrofia, NON ATTIVA', exact: true })
      .click();
    await popup.getByRole('button', { name: 'Attiva', exact: true }).click();
    await expect(popup).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe('/program');
    await expect(page.getByTestId('active-plan-heading')).toContainText(
      'Ipertrofia',
    );
    expect(f.source.program.status).toBe('archived');
    await page
      .getByRole('button', { name: 'Cambia scheda', exact: true })
      .click();
    await popup
      .getByRole('button', { name: '+ Nuova scheda', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Nuova scheda', exact: true }),
    ).toBeVisible();
    await expect(popup).toHaveCount(1);
    expect(new URL(page.url()).pathname).toBe('/program');
    await page
      .getByRole('button', { name: 'Chiudi popup', exact: true })
      .click();
    await expect(popup).toHaveCount(0);
  });

  test(`Floating capsule, active pill, rapid tabs and body insets ${size.width}x${size.height}`, async ({
    page,
  }, info) => {
    await open(page, size);
    for (const name of [
      'Home',
      'Scheda',
      'Progressi',
      'Profilo',
      'Scheda',
      'Home',
      'Progressi',
    ]) {
      const nav = page.getByTestId('floating-navbar'),
        button = nav.getByRole('tab', { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-selected', 'true');
      const b = (await nav.boundingBox())!,
        tab = (await button.boundingBox())!,
        pill = (await page.getByTestId('floating-navbar-pill').boundingBox())!;
      expect(b.x).toBe(size.width < 360 ? 16 : 24);
      expect(b.width).toBe(size.width - b.x * 2);
      expect(b.height).toBe(80);
      expect(size.height - (b.y + b.height)).toBe(size.bottom + 12);
      expect(tab.width).toBeGreaterThanOrEqual(48);
      expect(tab.height).toBeGreaterThanOrEqual(48);
      expect(
        Math.abs(pill.x + pill.width / 2 - tab.x - tab.width / 2),
      ).toBeLessThanOrEqual(2);
      expect(pill.y).toBeGreaterThan(b.y);
      expect(pill.y + pill.height).toBeLessThan(b.y + b.height);
    }
    const body = (await page.getByTestId('progress-body').boundingBox())!,
      tabs = (await page.getByTestId('progress-hero-seam').boundingBox())!;
    expect(tabs.y).toBeGreaterThanOrEqual(body.y + 16);
    expect(tabs.x + tabs.width).toBeLessThanOrEqual(body.x + body.width);
    const scroll = page
      .getByTestId('progress-editorial-screen')
      .getByTestId('editorial-scroll');
    await scroll.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const last = (await page.getByTestId('progress-content').boundingBox())!,
      nav = (await page.getByTestId('floating-navbar').boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(nav.y - 16);
    await scroll.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({
      path: info.outputPath('floating-progress-navbar.png'),
    });
  });
}

test('long switch list scrolls internally while close and CTA stay visible', async ({
  page,
}) => {
  const size = phones[0]!,
    f = await open(page, size);
  for (let i = 0; i < 15; i++) {
    const id = randomUUID();
    f.plans.set(id, {
      ...f.alternate,
      id,
      name: `Scheda ${i + 1}`,
      days: [],
      daysCount: 0,
    });
  }
  await page.reload();
  await expect(page.getByTestId('active-plan-heading')).toContainText('FORZA');
  await page
    .getByRole('button', { name: 'Cambia scheda', exact: true })
    .click();
  // The opened query already includes the list because the fixture response reads the map.
  const scroll = page.getByTestId('program-popup-scroll');
  await expect
    .poll(() => scroll.evaluate((el) => el.scrollHeight > el.clientHeight))
    .toBe(true);
  await scroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(
    page.getByRole('button', { name: 'Chiudi popup', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    page
      .getByTestId('program-popup-footer')
      .getByRole('button', { name: '+ Nuova scheda', exact: true }),
  ).toBeInViewport({ ratio: 1 });
});

test.describe('animation enabled', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('active pill interpolates between slots and finishes on the selected tab', async ({
    page,
  }) => {
    await open(page, phones[1]!);
    const pill = page.getByTestId('floating-navbar-pill');
    await expect(pill).toBeVisible();
    const nav = page.getByTestId('floating-navbar');
    const settled = (name: string) =>
      expect
        .poll(async () => {
          const p = (await pill.boundingBox())!,
            tab = (await nav
              .getByRole('tab', { name, exact: true })
              .boundingBox())!;
          return Math.abs(p.x + p.width / 2 - tab.x - tab.width / 2);
        })
        .toBeLessThan(1);
    // Warm both scenes before measuring animation rather than cold artwork/JS initialization.
    await nav.getByRole('tab', { name: 'Progressi', exact: true }).click();
    await expect(page.getByTestId('progress-tabs-scroll')).toBeVisible();
    await settled('Progressi');
    await nav.getByRole('tab', { name: 'Scheda', exact: true }).click();
    await settled('Scheda');
    const samples = await page.evaluate(async () => {
      const capsule = document.querySelector(
        '[data-testid="floating-navbar"]',
      )!;
      const pill = capsule.querySelector(
        '[data-testid="floating-navbar-pill"]',
      )!;
      const samples = [pill.getBoundingClientRect().x];
      (
        capsule.querySelector('[aria-label="Progressi"]') as HTMLElement
      ).click();
      const started = performance.now();
      while (performance.now() - started < 340) {
        await new Promise(requestAnimationFrame);
        samples.push(pill.getBoundingClientRect().x);
      }
      return samples;
    });
    const start = samples[0]!,
      end = samples.at(-1)!;
    expect(end - start, JSON.stringify(samples)).toBeGreaterThan(40);
    expect(samples.some((x) => x > start + 2 && x < end - 2)).toBe(true);
    expect(
      samples.every((x, i) => i === 0 || x >= samples[i - 1]! - 1),
      JSON.stringify(samples),
    ).toBe(true);
    await expect(
      page
        .getByTestId('floating-navbar')
        .getByRole('tab', { name: 'Progressi', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
  });
});

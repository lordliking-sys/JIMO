import { expect, test, type Page } from '@playwright/test';
import { workoutFixture } from './workout-fixture';

async function enlargeText(page: Page, screen: string) {
  await page.getByTestId(screen).evaluate((root) => {
    root.querySelectorAll<HTMLElement>('[dir="auto"]').forEach((text) => {
      const style = getComputedStyle(text);
      text.style.fontSize = `${parseFloat(style.fontSize) * 1.3}px`;
      if (style.lineHeight !== 'normal')
        text.style.lineHeight = `${parseFloat(style.lineHeight) * 1.3}px`;
    });
  });
}
for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
]) {
  test(`anime theme: missing-art slots, calendar, navigation and 1.3x text at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await workoutFixture(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [route, screen, scroll] of [
      ['/', 'home-main-screen', 'main-scroll'],
      ['/program', 'program-main-screen', 'main-scroll'],
      ['/progress', 'progress-editorial-screen', 'editorial-scroll'],
      ['/profile', 'profile-editorial-screen', 'editorial-scroll'],
    ]) {
      await page.goto(route!);
      await expect(page.getByTestId(screen!)).toBeVisible();
      const art = page.getByTestId('section-hero-art');
      const hero = (await art.boundingBox())!;
      expect(hero.x).toBeCloseTo(0, 0);
      expect(hero.width).toBeCloseTo(viewport.width, 0);
      expect(hero.height / viewport.height).toBeGreaterThanOrEqual(0.42);
      expect(hero.height / viewport.height).toBeLessThanOrEqual(0.48);
      await expect(art.locator('img')).toHaveCount(0);
      await expect(
        page.getByTestId('section-hero-image-placeholder'),
      ).toHaveCount(1);
      if (route === '/progress') {
        for (const name of ['Panoramica', 'Forza', 'Volume', 'Frequenza'])
          await expect(
            page.getByRole('tab', { name, exact: true }),
          ).toBeInViewport({ ratio: 1 });
      }
      await enlargeText(page, screen!);
      expect(
        await page
          .getByTestId(screen!)
          .getByTestId(scroll!)
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      if (route === '/') {
        const calendar = page.getByTestId('home-week-strip');
        expect(
          await calendar.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        ).toBe(true);
        await expect(calendar.locator('[dir="auto"]')).toHaveCount(14);
      }
      const navigation = page
        .getByRole('tab')
        .filter({ hasNot: page.locator('[role="tablist"]') });
      for (const name of ['Home', 'Scheda', 'Progressi', 'Profilo']) {
        const tab = navigation.filter({ hasText: name }).first();
        const bounds = (await tab.boundingBox())!;
        expect(bounds.height).toBeGreaterThanOrEqual(48);
        expect(bounds.width).toBeGreaterThanOrEqual(48);
        const label = tab.locator('[dir="auto"]').last();
        await label.evaluate((el) => {
          const text = el as HTMLElement;
          const style = getComputedStyle(text);
          text.style.fontSize = `${parseFloat(style.fontSize) * 1.3}px`;
          text.style.lineHeight = `${parseFloat(style.lineHeight) * 1.3}px`;
        });
        expect(
          await label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        ).toBe(true);
      }
      await page.screenshot({
        path: info.outputPath(
          `${route === '/' ? 'home' : route!.slice(1)}-text-130.png`,
        ),
      });
    }
    expect(errors).toEqual([]);
  });
}

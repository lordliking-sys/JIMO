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
  test(`anime theme: original artwork mapping, calendar, navigation and 1.3x text at ${viewport.width}x${viewport.height}`, async ({
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
      if (route === '/')
        expect(hero.height).toBeCloseTo(viewport.width * 1.02 + 24, 0);
      else expect(hero.height / viewport.height).toBeLessThanOrEqual(0.48);
      const original =
        route === '/'
          ? 'hero_home'
          : route === '/program'
            ? 'profilo-mood-reference'
            : route === '/progress'
              ? 'progressi-hero-reference'
              : 'profilo-terrace-background';
      await expect(art.locator('img')).toHaveCount(1);
      await expect(art.locator('img')).toHaveAttribute(
        'src',
        new RegExp(original),
      );
      await expect
        .poll(() =>
          art
            .locator('img')
            .evaluate(
              (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
            ),
        )
        .toBe(true);
      await expect(
        page.getByTestId('section-hero-image-placeholder'),
      ).toHaveCount(0);
      if (route === '/profile') {
        const character = page.getByTestId('profile-character-overlay');
        await expect(character.locator('img')).toHaveAttribute(
          'src',
          /profilo-character-overlay/,
        );
        await expect
          .poll(() =>
            character
              .locator('img')
              .evaluate(
                (el: HTMLImageElement) =>
                  el.complete && el.naturalWidth === 1024,
              ),
          )
          .toBe(true);
        const pose = (await character.boundingBox())!,
          avatar = (await page.getByTestId('profile-avatar').boundingBox())!,
          body = (await page.getByTestId('profile-body').boundingBox())!,
          identity = (await page
            .getByTestId('profile-display-name')
            .boundingBox())!;
        expect(pose.y + pose.height).toBeGreaterThan(
          hero.y + hero.height + 120,
        );
        expect(
          Math.abs(pose.y + (850 * pose.height) / 1536 - body.y),
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(
            avatar.x + avatar.width / 2 - (pose.x + (512 * pose.width) / 1024),
          ),
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(
            avatar.y +
              avatar.height / 2 -
              (pose.y + (1250 * pose.height) / 1536),
          ),
        ).toBeLessThanOrEqual(1);
        expect(avatar.y).toBeGreaterThan(hero.y + hero.height);
        expect(identity.y).toBeGreaterThan(pose.y + pose.height + 12);
        expect(
          await page
            .getByTestId('profile-avatar-dock')
            .evaluate((el) => getComputedStyle(el).boxShadow),
        ).toBe('none');
        await page.getByTestId('profile-avatar').click();
        await expect(
          page.getByRole('button', { name: 'Annulla', exact: true }),
        ).toBeVisible();
        await page
          .getByRole('button', { name: 'Annulla', exact: true })
          .click();
      }
      await page.screenshot({
        path: info.outputPath(
          `${route === '/' ? 'home' : route!.slice(1)}-original-art.png`,
        ),
      });
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

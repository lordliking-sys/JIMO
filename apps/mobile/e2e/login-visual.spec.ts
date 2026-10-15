import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loginComponentFixture } from './login-component';
test.beforeAll(loginComponentFixture);
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});
async function openLogin(page: Page, query = '') {
  await page.route('**/__login-component/**', async (route) => {
    const path = new URL(route.request().url()).pathname.slice(
      '/__login-component/'.length,
    );
    if (!path)
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}#root{display:flex;height:100vh}body{font-family:Arial}</style><div id="root"></div><script src="/__login-component/login-harness.js"></script></html>',
      });

    return route.fulfill({
      contentType: path.endsWith('.js')
        ? 'application/javascript'
        : path.endsWith('.ttf')
          ? 'font/ttf'
          : 'image/png',
      body: await readFile(join('/tmp/jimo-login-component', path)),
    });
  });
  await page.goto(`/__login-component/${query}`);
}
const phones = [
  { width: 320, height: 740 },
  { width: 360, height: 800 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 412, height: 915 },
  { width: 430, height: 860 },
];
for (const phone of phones)
  test(`Login original composition, real fields and safe area ${phone.width}x${phone.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(phone);
    const top = phone.width >= 393 ? 47 : 24,
      bottom = phone.width >= 393 ? 34 : 48;
    await openLogin(page, `?top=${top}&bottom=${bottom}`);
    await expect(page.getByTestId('login-visual-screen')).toBeVisible();
    const email = page.getByLabel('Email', { exact: true }),
      password = page.getByLabel('Password', { exact: true }),
      eye = page.getByRole('button', { name: 'Mostra password', exact: true });
    for (const control of [
      email,
      password,
      eye,
      page.getByRole('button', { name: 'Accedi', exact: true }),
      page.getByRole('button', { name: 'Crea account', exact: true }),
      page.getByRole('button', { name: 'Password dimenticata?', exact: true }),
    ]) {
      await expect(control).toBeInViewport({ ratio: 1 });
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    }
    await email.fill('fixture@example.invalid');
    await expect(email).toBeFocused();
    await password.fill('only-synthetic-fixture');
    await expect(password).toBeFocused();
    await eye.click();
    await expect(password).toHaveJSProperty('type', 'text');
    await page
      .getByRole('button', { name: 'Nascondi password', exact: true })
      .click();
    await expect(password).toHaveJSProperty('type', 'password');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await expect(password).toHaveAttribute('autocomplete', 'current-password');
    const background = (await page
      .getByTestId('login-background')
      .boundingBox())!;
    expect(background).toMatchObject({
      x: 0,
      y: 0,
      width: phone.width,
      height: phone.height,
    });
    expect(
      (await page.getByTestId('login-header').boundingBox())!.y,
    ).toBeGreaterThan(top);
    for (const id of ['login-fairy', 'login-lifter-crop']) {
      await expect(page.getByTestId(id)).toHaveAttribute('aria-hidden', 'true');
      await expect(page.getByTestId(id)).toHaveCSS('pointer-events', 'none');
    }
    const fairy = (await page.getByTestId('login-fairy-image').boundingBox())!,
      seat = (await page.getByTestId('login-fairy-contact').boundingBox())!,
      emailPill = (await page.getByTestId('login-field-Email').boundingBox())!,
      passwordPill = (await page
        .getByTestId('login-field-Password')
        .boundingBox())!,
      lifter = (await page.getByTestId('login-lifter-crop').boundingBox())!;
    expect(fairy.x).toBeGreaterThan(phone.width * 0.55);
    expect(fairy.x + fairy.width).toBeLessThanOrEqual(phone.width - 4);
    expect(Math.abs(seat.y - emailPill.y)).toBeLessThanOrEqual(2);
    expect(
      Math.abs(lifter.y - passwordPill.y - passwordPill.height),
    ).toBeLessThanOrEqual(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`login-${phone.width}.png`),
    });
  });

test('Login submission: pending lock, real errors, preserved values and verification', async ({
  page,
}) => {
  await openLogin(page);
  const submit = page.getByRole('button', { name: 'Accedi', exact: true }),
    email = page.getByLabel('Email', { exact: true }),
    password = page.getByLabel('Password', { exact: true });
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText(
    'Inserisci un indirizzo email valido.',
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { loginActions: string[] }).loginActions,
    ),
  ).toEqual([]);
  await email.fill('fixture@example.invalid');
  await password.fill('synthetic-only-password');
  await page.evaluate(() => {
    (
      window as unknown as { loginFixture: { error: string | null } }
    ).loginFixture.error = 'form_password_incorrect';
  });
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText(
    'Controlla email e password.',
  );
  await expect(password).toHaveValue('synthetic-only-password');
  await page.evaluate(() => {
    const f = (
      window as unknown as {
        loginFixture: { error: string | null; deferred: boolean };
      }
    ).loginFixture;
    f.error = null;
    f.deferred = true;
  });
  await submit.dblclick();
  await expect(submit).toHaveAttribute('aria-busy', 'true');
  await expect(submit).toBeDisabled();
  // React Native Web maps editable=false to readonly; the fields cannot be edited while pending.
  await expect(email).not.toBeEditable();
  await expect(password).not.toBeEditable();
  await expect(
    page.getByRole('button', { name: 'Crea account', exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { loginActions: string[] }).loginActions,
    ),
  ).toEqual(['signIn', 'signIn']);
  await page.evaluate(() =>
    (
      window as unknown as {
        loginFixture: { release: (() => void) | null };
      }
    ).loginFixture.release?.(),
  );
  await expect(submit).toHaveAttribute('aria-busy', 'false');
  await expect(submit).toBeEnabled();
  await page.evaluate(() => {
    const f = (
      window as unknown as {
        loginFixture: { deferred: boolean; verify: boolean };
      }
    ).loginFixture;
    f.deferred = false;
    f.verify = true;
  });
  await submit.click();
  await expect(page.getByLabel('Codice', { exact: true })).toBeVisible();
  await page.getByLabel('Codice', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verifica', exact: true }).click();
  expect(
    (
      await page.evaluate(
        () => (window as unknown as { loginActions: string[] }).loginActions,
      )
    ).at(-1),
  ).toBe('verifySignIn');
});

test('Login existing navigation callbacks and English labels are unchanged', async ({
  page,
}) => {
  await openLogin(page, '?locale=en');
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Forgot password?', exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (window as unknown as { loginActions: string[] }).loginActions,
    ),
  ).toEqual(['push:/auth/sign-up', 'push:/auth/forgot-password']);
  await page.goto('/__login-component/?unloaded');
  await expect(
    page.getByRole('button', { name: 'Accedi', exact: true }),
  ).toBeDisabled();
});

for (const width of [320, 393])
  test(`Login keyboard resize keeps inputs and sprites attached ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 851 });
    await openLogin(page);
    const password = page.getByLabel('Password', { exact: true });
    await password.focus();
    const artwork = (await page
      .getByTestId('login-background')
      .locator('img')
      .boundingBox())!;
    await page.setViewportSize({ width, height: 390 });
    await password.focus();
    await expect(password).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole('button', { name: 'Mostra password', exact: true }),
    ).toBeInViewport({ ratio: 1 });
    const pill = (await page
        .getByTestId('login-field-Password')
        .boundingBox())!,
      crop = (await page.getByTestId('login-lifter-crop').boundingBox())!;
    expect(Math.abs(crop.y - pill.y - pill.height)).toBeLessThanOrEqual(2);
    expect(
      (await page.getByTestId('login-background').locator('img').boundingBox())!
        .height,
    ).toBe(artwork.height);
    await page.setViewportSize({ width, height: 851 });
    await page
      .getByRole('button', { name: 'Accedi', exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('button', { name: 'Accedi', exact: true }),
    ).toBeInViewport({ ratio: 1 });
  });

test('Login landscape remains scrollable, focusable and free from horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 851, height: 393 });
  await openLogin(page, '?top=0&bottom=24');
  const email = page.getByLabel('Email', { exact: true }),
    password = page.getByLabel('Password', { exact: true });
  await email.fill('fixture@example.invalid');
  await expect(email).toBeInViewport({ ratio: 1 });
  await password.fill('synthetic-only');
  await expect(password).toBeInViewport({ ratio: 1 });
  await page
    .getByRole('button', { name: 'Accedi', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('button', { name: 'Accedi', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('Login press scale respects the motion preference', async ({ page }) => {
  const button = page.getByTestId('login-submit'),
    animated = button.locator('..');
  const horizontalScale = () =>
    animated.evaluate((element) => {
      const transform = getComputedStyle(element).transform;
      return transform === 'none' ? 1 : new DOMMatrix(transform).a;
    });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openLogin(page);
  await button.hover();
  await page.mouse.down();
  await expect.poll(horizontalScale).toBeCloseTo(0.985, 3);
  await page.mouse.up();
  await expect.poll(horizontalScale).toBeCloseTo(1, 3);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await button.hover();
  await page.mouse.down();
  expect(await horizontalScale()).toBe(1);
  await page.mouse.up();
});

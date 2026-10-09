import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { passwordComponentFixture } from './password-component';

test.beforeAll(passwordComponentFixture);
async function open(page: Page, query = '') {
  await page.route('**/__password-component/**', async (route) => {
    const path = new URL(route.request().url()).pathname.slice(
      '/__password-component/'.length,
    );
    if (!path)
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0}#root{display:flex;height:100vh}</style><div id="root"></div><script src="/ __password-component/password-harness.js"></script></html>'.replace(
          '/ __',
          '/__',
        ),
      });
    return route.fulfill({
      contentType: path.endsWith('.js')
        ? 'application/javascript'
        : 'image/png',
      body: await readFile(join('/tmp/jimo-password-component', path)),
    });
  });
  await page.goto(`/__password-component/${query}`);
}
test('signup: real development minimum, live confirmation and independent accessible eyes', async ({
  page,
}) => {
  await open(page);
  const password = page.getByLabel('Password', { exact: true });
  const confirmation = page.getByLabel('Conferma password', { exact: true });
  const rule = page.getByTestId('password-rule-length');
  await expect(rule).toHaveAttribute(
    'aria-label',
    /Almeno 15 caratteri.*Non ancora soddisfatto/,
  );
  await expect(
    page
      .getByTestId('password-requirements')
      .locator('[data-testid^="password-rule-"]'),
  ).toHaveCount(1);
  await expect(page.getByTestId('password-confirmation-feedback')).toHaveCount(
    0,
  );
  await password.fill('a-long-fixture-password');
  await expect(rule).toHaveAttribute('aria-label', /Soddisfatto/);
  await expect(page.getByTestId('password-confirmation-feedback')).toHaveCount(
    0,
  );
  await confirmation.fill('different');
  await expect(page.getByTestId('password-confirmation-feedback')).toHaveText(
    'Le password non coincidono',
  );
  await page
    .getByRole('button', { name: 'Mostra password', exact: true })
    .click();
  await expect(password).toHaveJSProperty('type', 'text');
  await expect(confirmation).toHaveAttribute('type', 'password');
  const eye = page.getByRole('button', {
    name: 'Mostra conferma password',
    exact: true,
  });
  expect((await eye.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await eye.click();
  await expect(confirmation).toHaveJSProperty('type', 'text');
  await page
    .getByRole('button', { name: 'Nascondi password', exact: true })
    .click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(confirmation).toHaveJSProperty('type', 'text');
  await page
    .getByLabel('Email', { exact: true })
    .fill('fixture@example.invalid');
  await page.getByRole('button', { name: 'Crea account', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Le password devono coincidere.',
  );
  await confirmation.fill('a-long-fixture-password');
  await expect(page.getByTestId('password-confirmation-feedback')).toHaveText(
    'Le password coincidono',
  );
  await page.getByRole('button', { name: 'Crea account', exact: true }).click();
  await expect(page.getByLabel('Codice', { exact: true })).toBeVisible();
});
test('policy: fallback and only configured optional requirements, English', async ({
  page,
}) => {
  await open(page, '?fallback&locale=en');
  await expect(page.getByTestId('password-rule-length')).toHaveAttribute(
    'aria-label',
    /8/,
  );
  await page.goto('/__password-component/?strict&locale=en');
  await expect(page.getByTestId('password-rule-uppercase')).toBeVisible();
  await expect(page.getByTestId('password-rule-number')).toBeVisible();
  await expect(page.getByTestId('password-rule-special')).toHaveCount(0);
  await page.getByLabel('Password', { exact: true }).fill('Longfixturepass1');
  await expect(page.getByTestId('password-rule-uppercase')).toHaveAttribute(
    'aria-label',
    /Met/,
  );
  await expect(page.getByTestId('password-rule-number')).toHaveAttribute(
    'aria-label',
    /Met/,
  );
});
test('provider errors: breach, too short and weak; preserve values and no raw provider output', async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel('Email', { exact: true })
    .fill('fixture@example.invalid');
  const password = page.getByLabel('Password', { exact: true }),
    confirm = page.getByLabel('Conferma password', { exact: true });
  const cases = [
    [
      'form_password_pwned',
      "Questa password è comparsa in precedenti violazioni di dati. Scegline un'altra.",
    ],
    ['form_password_length_too_short', 'Usa almeno 15 caratteri.'],
    [
      'form_password_not_strong_enough',
      'Questa password è troppo comune o facile da indovinare. Scegline una più sicura.',
    ],
  ];
  for (const [code, message] of cases) {
    await page.evaluate((code) => {
      (
        window as unknown as { passwordFixture: { error: string | null } }
      ).passwordFixture.error = code!;
    }, code);
    await password.fill('a-long-fixture-password');
    await confirm.fill('a-long-fixture-password');
    await page
      .getByRole('button', { name: 'Crea account', exact: true })
      .click();
    await expect(page.getByRole('alert')).toHaveText(message!);
    await expect(password).toHaveValue('a-long-fixture-password');
    await password.fill('another-long-fixture-password');
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
});
test('reset: same policy above new password, confirmation and independent eyes', async ({
  page,
}) => {
  await open(page, '?reset');
  await page
    .getByLabel('Email', { exact: true })
    .fill('fixture@example.invalid');
  await page
    .getByRole('button', { name: 'Password dimenticata?', exact: true })
    .click();
  await page.getByLabel('Codice', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verifica', exact: true }).click();
  const password = page.getByLabel('Nuova password', { exact: true });
  const requirements = page.getByTestId('password-requirements');
  expect((await requirements.boundingBox())!.y).toBeLessThan(
    (await password.boundingBox())!.y,
  );
  await password.fill('new-long-fixture-password');
  await page
    .getByLabel('Conferma password', { exact: true })
    .fill('new-long-fixture-password');
  await page
    .getByRole('button', { name: 'Mostra conferma password', exact: true })
    .click();
  await expect(password).toHaveAttribute('type', 'password');
  await page
    .getByRole('button', { name: 'Salva password', exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { passwordActions: string[] }).passwordActions,
    ),
  ).toEqual(['forgotPassword', 'verifyReset', 'resetPassword']);
});

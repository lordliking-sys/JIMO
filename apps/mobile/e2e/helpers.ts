import type { Page } from '@playwright/test';
export async function manualField(
  page: Page,
  label: string,
  locale = 'it',
  buttonLabel?: string,
) {
  const field = page.getByRole('textbox', { name: label, exact: true });
  if (!(await field.count()))
    await page
      .getByRole('button', {
        name:
          buttonLabel ??
          (locale === 'it'
            ? `Modifica manualmente ${label}`
            : `Edit ${label} manually`),
        exact: true,
      })
      .click();
  return field;
}
export function valueButton(
  page: Page,
  label: string,
  locale = 'it',
  buttonLabel?: string,
) {
  return page.getByRole('button', {
    name:
      buttonLabel ??
      (locale === 'it'
        ? `Modifica manualmente ${label}`
        : `Edit ${label} manually`),
    exact: true,
  });
}

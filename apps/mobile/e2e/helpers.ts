import type { Page } from '@playwright/test';
/** Let RN Web's safe-area provider measure representative device insets. */
export async function simulateSafeArea(
  page: Page,
  top: number,
  bottom: number,
) {
  await page.addInitScript(
    ({ top, bottom }) => {
      const original = window.getComputedStyle.bind(window);
      window.getComputedStyle = (element, pseudo) => {
        const style = original(element, pseudo);
        if (
          !(element instanceof HTMLElement) ||
          !element.style.paddingTop.includes('safe-area-inset')
        )
          return style;
        return new Proxy(style, {
          get(target, key) {
            if (key === 'paddingTop') return `${top}px`;
            if (key === 'paddingBottom') return `${bottom}px`;
            const value: unknown = Reflect.get(target, key, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      };
    },
    { top, bottom },
  );
}
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

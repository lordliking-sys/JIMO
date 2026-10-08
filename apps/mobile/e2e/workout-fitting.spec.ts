import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { workoutFixture } from './workout-fixture';

const devices = [
  { name: 'small Android', width: 320, height: 740, top: 24, bottom: 48 },
  { name: '390 Android', width: 390, height: 780, top: 24, bottom: 48 },
  { name: '430 iOS', width: 430, height: 860, top: 47, bottom: 34 },
  { name: 'Pixel-like Android', width: 393, height: 851, top: 24, bottom: 48 },
];

/** Supply real-like CSS env insets to the existing web SafeAreaProvider.
 * No test-only settings or layout overrides are added to production code. */
async function safeInsets(page: Page, top: number, bottom: number) {
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

async function cleanFullscreen(page: Page) {
  const dialog = page.getByRole('dialog');
  const screen = (await dialog.count()) ? dialog : page;
  await expect(screen.getByRole('tab')).toHaveCount(0);
  if (await dialog.count()) {
    // React Native web retains the covered tab route underneath its native Modal.
    // Verify full-screen coverage instead of requiring its DOM to be unmounted.
    const box = (await dialog.boundingBox())!;
    const size = page.viewportSize()!;
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
    expect(box.width).toBe(size.width);
    expect(box.height).toBe(size.height);
  }
  await expect(
    screen.getByRole('button', { name: /^(Impostazioni|Settings)$/ }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function insideViewport(
  page: Page,
  labels: string[],
  fullyVisible: boolean,
) {
  const viewport = page.getByTestId('workout-viewport');
  for (const label of labels) {
    const control = page.getByRole('button', { name: label, exact: true });
    if (!fullyVisible) await control.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        const box = await control.boundingBox(),
          frame = await viewport.boundingBox();
        return Boolean(
          box &&
          frame &&
          box.y >= frame.y - 1 &&
          box.y + box.height <= frame.y + frame.height + 1,
        );
      })
      .toBe(true);
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const frame = (await viewport.boundingBox())!,
    footer = (await page.getByTestId('workout-footer').boundingBox())!;
  expect(frame.y + frame.height).toBeLessThanOrEqual(footer.y + 1);
}

for (const device of devices) {
  test(`${device.name}: standard, recovery and both previews respect safe areas without overlap`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize(device);
    await safeInsets(page, device.top, device.bottom);
    const fixture = await workoutFixture(page);
    fixture.setStarted();
    const exercise = fixture.workout.exercises[0]!;
    exercise.exerciseNameSnapshot = 'DIP';
    exercise.loadModeSnapshot = 'weighted';
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (/GO_BACK.*not handled/.test(message.text()))
        errors.push(message.text());
    });
    await page.goto(`/workout/${fixture.workout.id}`);
    await expect(page.getByText('DIP', { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await cleanFullscreen(page);
    await insideViewport(
      page,
      ['Aumenta Ripetizioni', 'Aumenta Zavorra', 'Aumenta RPE'],
      device.width >= 390,
    );
    const cta = (await page
      .getByRole('button', { name: '✓ Completa serie', exact: true })
      .boundingBox())!;
    expect(cta.y + cta.height).toBeLessThanOrEqual(
      device.height - device.bottom,
    );
    await page.screenshot({ path: info.outputPath('standard-safe-area.png') });
    await page
      .getByRole('button', { name: '✓ Completa serie', exact: true })
      .click();
    await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
    await cleanFullscreen(page);
    await expect(
      page.getByRole('button', { name: 'Azioni allenamento', exact: true }),
    ).toHaveCount(0);
    await insideViewport(page, ['Indietro', 'Correggi serie 1'], true);
    await page.screenshot({ path: info.outputPath('recovery-safe-area.png') });
    const restSurface = await page
      .getByTestId('workout-surface')
      .elementHandle();
    await page
      .getByRole('button', { name: 'Correggi serie 1', exact: true })
      .click();
    const correction = page.getByRole('dialog');
    await expect(
      correction.getByTestId('set-correction-overlay'),
    ).toBeVisible();
    const rows = await correction.getByTestId('correction-number-row').all();
    expect(rows).toHaveLength(3);
    const dimensions = await Promise.all(rows.map((row) => row.boundingBox()));
    expect(new Set(dimensions.map((box) => box!.height)).size).toBe(1);
    const columns = [[], [], [], []] as number[][];
    for (const [index, label] of ['Ripetizioni', 'Zavorra', 'RPE'].entries()) {
      const row = rows[index]!;
      const cells = [
        row.getByTestId('correction-row-label'),
        row.getByRole('button', { name: `Diminuisci ${label}`, exact: true }),
        row.getByRole('button', {
          name: `Modifica manualmente ${label}`,
          exact: true,
        }),
        row.getByRole('button', { name: `Aumenta ${label}`, exact: true }),
      ];
      for (const [column, cell] of cells.entries()) {
        const box = (await cell.boundingBox())!;
        columns[column]!.push(box.x);
        if (device.width >= 390) {
          const frame = dimensions[index]!;
          expect(
            Math.abs(box.y + box.height / 2 - (frame.y + frame.height / 2)),
          ).toBeLessThanOrEqual(1);
        }
      }
      const icon = (await row.locator('svg').first().boundingBox())!;
      const labelBox = (await row
        .getByTestId('correction-row-label')
        .boundingBox())!;
      expect(
        await row
          .getByTestId('correction-row-label')
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      ).toBe(true);
      expect(
        Math.abs(icon.y + icon.height / 2 - (labelBox.y + labelBox.height / 2)),
      ).toBeLessThanOrEqual(1);
    }
    for (const values of columns)
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    await expect(
      correction.getByTestId('correction-row-label').nth(1),
    ).toHaveText('ZAVORRA (kg)');
    const correctionFrame = (await correction
      .getByTestId('workout-viewport')
      .boundingBox())!;
    for (const label of [
      'Aumenta Ripetizioni',
      'Aumenta Zavorra',
      'Aumenta RPE',
    ]) {
      const bounds = (await correction
        .getByRole('button', { name: label, exact: true })
        .boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.y).toBeGreaterThanOrEqual(correctionFrame.y - 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(
        correctionFrame.y + correctionFrame.height + 1,
      );
    }
    const save = (await correction
      .getByRole('button', { name: 'Salva correzione', exact: true })
      .boundingBox())!;
    expect(save.y).toBeGreaterThanOrEqual(
      correctionFrame.y + correctionFrame.height - 1,
    );
    expect(save.y + save.height).toBeLessThanOrEqual(
      device.height - device.bottom,
    );
    await page.screenshot({
      path: info.outputPath('correction-safe-area.png'),
    });
    await correction
      .getByRole('button', { name: 'Indietro', exact: true })
      .click();
    await expect(correction).toHaveCount(0);
    expect(await restSurface!.evaluate((node) => node.isConnected)).toBe(true);
    await page.getByRole('button', { name: 'Indietro', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Riprendi allenamento', exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/workout$/);
    await expect.poll(() => fixture.workout.completedSets).toBe(1);
    const writesBefore = fixture.writes.length;
    for (const mode of ['EMOM', 'piramidale']) {
      await page
        .getByRole('button', { name: `Anteprima ${mode}`, exact: true })
        .click();
      await expect(page.getByText('PREVIEW', { exact: true })).toBeVisible();
      await cleanFullscreen(page);
      const target =
        mode === 'EMOM'
          ? page.getByText('in corso', { exact: true })
          : page.getByLabel('Serie 7: 12 reps, 60 kg, Da eseguire', {
              exact: true,
            });
      const box = (await target.boundingBox())!,
        frame = (await page.getByTestId('workout-viewport').boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(
        frame.y + frame.height + 1,
      );
      expect(frame.y + frame.height).toBeLessThanOrEqual(
        device.height - device.bottom + 1,
      );
      await page.screenshot({ path: info.outputPath(`${mode}-safe-area.png`) });
      await page.getByRole('button', { name: 'Indietro', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Riprendi allenamento', exact: true }),
      ).toBeVisible();
    }
    expect(fixture.writes.length).toBe(writesBefore);
    expect(errors).toEqual([]);
  });
}

test('SafeBack handles deep links and a real prior route without reopening the session', async ({
  page,
}) => {
  const fixture = await workoutFixture(page),
    warnings: string[] = [];
  fixture.setStarted();
  page.on('console', (message) => {
    if (/GO_BACK/.test(message.text())) warnings.push(message.text());
  });
  await page.goto(`/workout/${fixture.workout.id}`);
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Riprendi allenamento', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Riprendi allenamento', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '✓ Completa serie', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await expect(page).toHaveURL(/\/workout$/);
  await expect(
    page.getByRole('button', { name: 'Riprendi allenamento', exact: true }),
  ).toBeVisible();
  expect(fixture.writes).toEqual([]);
  expect(warnings).toEqual([]);
});

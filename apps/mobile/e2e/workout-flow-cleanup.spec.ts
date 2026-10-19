import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { workoutFixture } from './workout-fixture';
import { simulateSafeArea } from './helpers';

test.use({ timezoneId: 'Europe/Rome' });
const phones = [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
];
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
for (const phone of phones) {
  test(`Recovery contains no completed rows; pink summary owns corrections and fitting values ${phone.width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(phone);
    await simulateSafeArea(page, 24, 34);
    const f = await workoutFixture(page),
      exercise = f.workout.exercises[1]!;
    f.setStarted();
    exercise.restSecondsSnapshot = 180;
    exercise.sets = [1, 2, 3].map((n) => ({
      ...structuredClone(exercise.sets[0]!),
      id: randomUUID(),
      setNumber: n,
      targetLoadKg: '125.50',
    }));
    f.workout.exercises = [exercise];
    f.workout.exercisesCount = 1;
    f.workout.pendingSets = 3;
    await page.goto(`/workout/${f.workout.id}`);
    const rows = page.getByTestId('workout-number-row');
    await expect(rows).toHaveCount(3);
    const dimensions = await Promise.all(
      (await rows.all()).map((row) => row.boundingBox()),
    );
    for (let i = 1; i < dimensions.length; i++)
      expect(
        dimensions[i]!.y - dimensions[i - 1]!.y - dimensions[i - 1]!.height,
      ).toBeGreaterThanOrEqual(12);
    await expect(page.getByTestId('workout-numeric-value').nth(1)).toHaveText(
      '+125,5',
    );
    for (const value of await page.getByTestId('workout-numeric-value').all()) {
      expect(
        await value.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      expect(
        await value.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeLessThanOrEqual(22);
    }
    await page.screenshot({ path: info.outputPath('workout-values.png') });
    for (let n = 1; n <= 3; n++) {
      await button(page, '✓ Completa serie').click();
      if (n < 3) {
        await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
        await expect(
          page.getByText('Ultima serie completata', { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: /^Correggi serie/ }),
        ).toHaveCount(0);
        await expect(page.getByTestId('session-summary')).toHaveCount(0);
        await page.screenshot({ path: info.outputPath(`rest-${n}.png`) });
        await button(page, 'Salta recupero').click();
      }
    }
    const summary = page.getByTestId('workout-summary-screen');
    await expect(summary).toBeVisible();
    await expect(page.getByTestId('workout-summary-body')).toHaveCSS(
      'background-color',
      'rgb(255, 247, 250)',
    );
    await expect(page.getByTestId('session-summary')).toContainText(
      'Da confermare',
    );
    await expect(
      page.getByRole('button', { name: /^Correggi serie/ }),
    ).toHaveCount(3);
    await expect.poll(() => exercise.sets[0]!.actualLoadKg).toBe('125.50');
    const completedAt = exercise.sets[0]!.completedAt;
    await button(page, 'Correggi serie 1').click();
    const correction = page.getByTestId('set-correction-overlay'),
      correctionRows = correction.getByTestId('correction-number-row');
    await expect(correctionRows).toHaveCount(3);
    const frames = await Promise.all(
      (await correctionRows.all()).map((row) => row.boundingBox()),
    );
    expect(new Set(frames.map((frame) => frame!.height)).size).toBe(1);
    const minusX: number[] = [],
      plusX: number[] = [],
      valueX: number[] = [];
    for (const [i, label] of ['Ripetizioni', 'Zavorra', 'RPE'].entries()) {
      const row = correctionRows.nth(i),
        minus = (await row
          .getByRole('button', { name: `Diminuisci ${label}`, exact: true })
          .boundingBox())!,
        plus = (await row
          .getByRole('button', { name: `Aumenta ${label}`, exact: true })
          .boundingBox())!;
      expect(minus.width).toBeGreaterThanOrEqual(48);
      expect(plus.height).toBeGreaterThanOrEqual(48);
      minusX.push(minus.x);
      plusX.push(plus.x);
      valueX.push(
        (await row
          .getByRole('button', {
            name: `Modifica manualmente ${label}`,
            exact: true,
          })
          .boundingBox())!.x,
      );
      expect(
        await row
          .getByTestId('workout-numeric-value')
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    }
    for (const positions of [minusX, plusX, valueX])
      expect(
        Math.max(...positions) - Math.min(...positions),
      ).toBeLessThanOrEqual(1);
    await expect(
      correction.getByTestId('workout-numeric-value').nth(1),
    ).toHaveText('+125,5');
    await page.screenshot({ path: info.outputPath('correction-fitting.png') });
    await correction
      .getByRole('button', {
        name: 'Modifica manualmente Zavorra',
        exact: true,
      })
      .click();
    const input = correction.getByRole('textbox', {
      name: 'Zavorra',
      exact: true,
    });
    await expect(input).toBeFocused();
    await input.fill('125,5');
    expect(
      await correction.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    const inputBox = (await input.boundingBox())!,
      panelBox = (await correction.boundingBox())!;
    expect(inputBox.x).toBeGreaterThanOrEqual(panelBox.x);
    expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(
      panelBox.x + panelBox.width,
    );
    await correction
      .getByRole('button', { name: 'Conferma Zavorra', exact: true })
      .click();
    await correction
      .getByRole('button', { name: 'Aumenta Zavorra', exact: true })
      .click();
    await correction
      .getByRole('button', { name: 'Salva correzione', exact: true })
      .click();
    await expect(correction).toHaveCount(0);
    await expect.poll(() => exercise.sets[0]!.actualLoadKg).toBe('128.00');
    expect(exercise.sets[0]!.completedAt).toBe(completedAt);
    expect(exercise.sets[0]!.targetLoadKg).toBe('125.50');
    await button(page, 'Termina allenamento').click();
    await expect.poll(() => f.workout.status).toBe('completed');
    await expect(summary).toBeVisible();
    await expect(page.getByTestId('session-summary')).toContainText('128');
    await page.screenshot({ path: info.outputPath('completed-pink.png') });
    await button(page, 'Torna alla Home').click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('workout-hub-hero')).toHaveCount(0);
  });

  test(`Home can cancel an active workout, preserve actuals and start another weekday ${phone.width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(phone);
    await simulateSafeArea(page, 24, 34);
    await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
    const f = await workoutFixture(page),
      monday = f.program.days[0]!,
      wednesday = f.program.days[1]!;
    wednesday.exercises = [
      {
        ...structuredClone(monday.exercises[0]!),
        id: randomUUID(),
        targetSets: 1,
      },
    ];
    await page.goto('/');
    await button(page, 'Inizia allenamento').click();
    await expect(page).toHaveURL(/\/workout\/[^/]+$/);
    const originalId = page.url().split('/').at(-1)!;
    await button(page, '✓ Completa serie').click();
    await expect.poll(() => f.workout.completedSets).toBe(1);
    const actual = { ...f.workout.exercises[0]!.sets[0]! };
    await page.goto('/');
    await button(page, 'Interrompi allenamento').click();
    await expect(
      page.getByRole('heading', {
        name: 'Interrompere l’allenamento?',
        exact: true,
      }),
    ).toBeVisible();
    await button(page, 'Annulla').click();
    expect(f.workout.status).toBe('in_progress');
    await page.getByTestId('home-date-3').click();
    await button(page, 'Inizia allenamento').click();
    await button(page, 'Interrompi allenamento').click();
    await page.screenshot({
      path: info.outputPath('home-stop-confirmation.png'),
    });
    await button(page, 'Conferma interruzione').dblclick();
    await expect.poll(() => f.workout.status).toBe('cancelled');
    expect(f.workout.exercises[0]!.sets[0]).toEqual(actual);
    expect(f.workout.completedSets).toBe(1);
    const operations = () =>
      f.writes.map((entry) => entry.body as { operationType: string });
    expect(
      operations().filter((op) => op.operationType === 'CANCEL_WORKOUT'),
    ).toHaveLength(1);
    await expect(button(page, 'Riprendi allenamento')).toHaveCount(0);
    await page.reload();
    await expect(button(page, 'Riprendi allenamento')).toHaveCount(0);
    await page.getByTestId('home-date-3').click();
    await button(page, 'Inizia allenamento').click();
    await expect(page).toHaveURL(/\/workout\/[^/]+$/);
    expect(page.url().split('/').at(-1)).not.toBe(originalId);
    await expect.poll(() => f.workout.programDayId).toBe(wednesday.id);
    await expect
      .poll(
        () =>
          operations().filter((op) => op.operationType === 'START_WORKOUT')
            .length,
      )
      .toBe(2);
  });
}
test('Old hub and exercise-detail URLs resolve to main tabs without intermediate pages', async ({
  page,
}) => {
  await workoutFixture(page);
  await page.goto('/workout');
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('workout-hub-hero')).toHaveCount(0);
  await page.goto(`/progress/${randomUUID()}`);
  await expect(page).toHaveURL('/progress');
  await expect(page.getByTestId('progress-editorial-screen')).toBeVisible();
});

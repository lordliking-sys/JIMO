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
  test(`Home checks and resume preserve the exercise cursor ${phone.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(phone);
    await simulateSafeArea(page, 24, 34);
    await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
    const f = await workoutFixture(page),
      day = f.program.days[0]!;
    day.exercises = day.exercises
      .slice(0, 2)
      .map((e) => ({ ...e, targetSets: 1, restSeconds: 0 }));
    // A second entry for the same catalog exercise must not inherit its check.
    day.exercises.push({
      ...structuredClone(day.exercises[0]!),
      id: randomUUID(),
      position: 2,
    });
    f.program.days[1]!.exercises = [
      { ...structuredClone(day.exercises[0]!), id: randomUUID() },
    ];
    await page.goto('/');
    await button(page, 'Inizia allenamento').click();
    await expect(page).toHaveURL(/\/workout\/[^/]+$/);
    const session = page.url();
    await button(page, '✓ Completa serie').click();
    await expect(
      page.getByRole('heading', { name: 'Trazioni', exact: true }),
    ).toBeVisible();
    await expect(button(page, 'Continua')).toHaveCount(0);
    await page.goto('/');
    await expect(
      page.getByTestId(`home-exercise-completed-${day.exercises[0]!.id}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`home-exercise-completed-${day.exercises[1]!.id}`),
    ).toHaveCount(0);
    await expect(
      page.getByTestId(`home-exercise-completed-${day.exercises[2]!.id}`),
    ).toHaveCount(0);
    await page.getByTestId('home-date-3').click();
    await expect(
      page
        .getByTestId('home-upcoming-exercise')
        .getByTestId(/^home-exercise-completed-/),
    ).toHaveCount(0);
    await page.getByTestId('home-date-1').click();
    await page.reload();
    await button(page, 'Riprendi allenamento').click();
    await expect(page).toHaveURL(session);
    await expect(
      page.getByRole('heading', { name: 'Trazioni', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Trazioni', exact: true }),
    ).toBeVisible();
    await button(page, '✓ Completa serie').click();
    await expect(
      page.getByRole('heading', { name: 'Panca piana', exact: true }),
    ).toBeVisible();
    await button(page, 'Salta serie').click();
    await expect(page.getByTestId('session-summary')).toBeVisible();
    await button(page, 'Termina allenamento').click();
    await expect(button(page, 'Torna alla Home')).toBeVisible();
    await button(page, 'Torna alla Home').click();
    await page.reload();
    for (const exercise of day.exercises.slice(0, 2))
      await expect(
        page.getByTestId(`home-exercise-completed-${exercise.id}`),
      ).toBeVisible();
    await expect(
      page.getByTestId(`home-exercise-completed-${day.exercises[2]!.id}`),
    ).toHaveCount(0);
    expect(
      f.writes.filter(
        (w) =>
          (w.body as { operationType: string }).operationType ===
          'START_WORKOUT',
      ),
    ).toHaveLength(1);
    expect(f.workout.completedSets).toBe(2);
    expect(f.workout.skippedSets).toBe(1);
  });

  test(`Pyramid has no live edits and advances to the next exercise ${phone.width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(phone);
    await simulateSafeArea(page, 24, 34);
    await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
    const f = await workoutFixture(page),
      day = f.program.days[0]!,
      pyramid = day.exercises[0]!;
    day.exercises = [
      pyramid,
      { ...day.exercises[1]!, targetSets: 1, restSeconds: 0 },
    ];
    pyramid.workoutMode = 'pyramid';
    pyramid.targetSets = 2;
    pyramid.restSeconds = 0;
    pyramid.setTargets = [8, 6].map((reps, i) => ({
      targetReps: reps,
      targetDurationSeconds: null,
      targetLoadKg: i === 0 ? '80.00' : '85.00',
      targetAssistanceKg: null,
      targetRpe: '8.0',
      restSeconds: 0,
    }));
    await page.goto('/');
    await button(page, 'Inizia allenamento').click();
    await expect(page.getByTestId('pyramid-live-timeline')).toBeVisible();
    await expect(page.getByTestId('workout-number-row')).toHaveCount(0);
    await button(page, '✓ Completa serie').click();
    await expect(
      page
        .getByTestId('pyramid-live-timeline')
        .getByLabel('Serie 1 · Completata', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByTestId('pyramid-live-timeline').getByRole('button'),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Aumenta|Diminuisci|Correggi serie/ }),
    ).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath('pyramid-no-live-controls.png'),
    });
    await page.reload();
    await expect(page.getByTestId('pyramid-live-timeline')).toBeVisible();
    await button(page, '✓ Completa serie').click();
    await expect(
      page.getByRole('heading', { name: 'Trazioni', exact: true }),
    ).toBeVisible();
    await button(page, '✓ Completa serie').click();
    await expect(page.getByTestId('session-summary')).toBeVisible();
    await button(page, 'Correggi serie 1').first().click();
    await expect(page.getByTestId('set-correction-overlay')).toBeVisible();
    await button(page, 'Aumenta Ripetizioni').click();
    await button(page, 'Salva correzione').click();
    await expect(page.getByTestId('set-correction-overlay')).toHaveCount(0);
    await expect
      .poll(() => f.workout.exercises[0]!.sets[0]!.actualReps)
      .toBe(9);
    expect(f.workout.exercises[0]!.sets[1]!.actualReps).toBe(6);
    expect(f.workout.exercises[0]!.sets[1]!.actualLoadKg).toBe('85.00');
    await button(page, 'Termina allenamento').click();
    await expect(button(page, 'Torna alla Home')).toBeVisible();
  });
}

test('EMOM automatically advances after its last persisted round', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
  const f = await workoutFixture(page),
    day = f.program.days[0]!,
    emom = day.exercises[0]!;
  emom.workoutMode = 'emom';
  emom.targetSets = 2;
  emom.emomIntervalSeconds = 60;
  day.exercises = [
    emom,
    { ...day.exercises[1]!, targetSets: 1, restSeconds: 0 },
  ];
  await page.goto('/');
  await button(page, 'Inizia allenamento').click();
  await button(page, 'Inizia EMOM').click();
  await expect(page.getByText('PREPARATI', { exact: true })).toBeVisible();
  await page.clock.fastForward(131_000);
  await expect(
    page.getByRole('heading', { name: 'Trazioni', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Trazioni', exact: true }),
  ).toBeVisible();
  await button(page, '✓ Completa serie').click();
  await expect(page.getByTestId('session-summary')).toBeVisible();
  expect(
    f.workout.exercises[0]!.sets.every((s) => s.status === 'completed'),
  ).toBe(true);
});

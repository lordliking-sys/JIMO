import { expect, test } from '@playwright/test';
import {
  programDetailSchema,
  exerciseDtoSchema,
  workoutDetailSchema,
  activeWorkoutSchema,
  progressSummarySchema,
  progressExerciseDetailSchema,
} from '@jimo/schemas';
import { valueButton } from './helpers';
test('real Neon workout E2E: start snapshot, check actual, reload rest, finish and history', async ({
  page,
  request,
}, info) => {
  test.skip(!process.env.DATABASE_URL, 'Requires verified Neon development');
  test.setTimeout(120000);
  const origin = 'http://localhost:4301';
  const call = async (path: string, body: unknown) => {
    const r = await request.post(origin + path, {
      data: body,
      headers: { 'x-jimo-locale': 'it' },
    });
    expect(r.ok()).toBe(true);
    return r.json();
  };
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      'jimo.preferences.v1',
      JSON.stringify({
        version: 1,
        onboardingCompleted: true,
        localePreference: 'it',
        onboarding: {
          locale: 'it',
          goal: 'strength',
          experienceLevel: 'intermediate',
          trainingDaysPerWeek: 3,
          equipment: ['fullGym'],
          startMethod: 'manual',
        },
      }),
    ),
  );
  const e = exerciseDtoSchema.parse(
    await call('/exercises', {
      name: 'E2E Panca snapshot',
      trackingMode: 'reps',
      defaultLoadMode: 'external',
    }),
  );
  let p = programDetailSchema.parse(
    await call('/programs', { name: 'E2E Workout Engine' }),
  );
  p = programDetailSchema.parse(
    await call(`/programs/${p.id}/days`, { name: 'PUSH E2E', dayOfWeek: 1 }),
  );
  const day = p.days[0]!;
  p = programDetailSchema.parse(
    await call(`/program-days/${day.id}/exercises`, {
      exerciseId: e.id,
      loadMode: 'external',
      targetSets: 2,
      targetReps: 8,
      targetLoadKg: '80',
      targetRpe: '8',
      restSeconds: 180,
    }),
  );
  p = programDetailSchema.parse(await call(`/programs/${p.id}/activate`, {}));
  await page.goto(`/program/${p.id}`);
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .click();
  await expect(page.getByText('Serie 1 di 2', { exact: true })).toBeVisible();
  await expect(valueButton(page, 'Ripetizioni')).toHaveText('8');
  await expect(valueButton(page, 'Carico')).toHaveText('80 kg');
  await expect
    .poll(
      async () =>
        activeWorkoutSchema.parse(
          await (await request.get(origin + '/workouts/active')).json(),
        ).workout?.name,
    )
    .toBe('PUSH E2E');
  let active = activeWorkoutSchema.parse(
    await (await request.get(origin + '/workouts/active')).json(),
  ).workout!;
  expect(active.exercises[0]!.sets[0]!.actualLoadKg).toBeNull();
  await page
    .getByRole('button', { name: 'Diminuisci Ripetizioni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Aumenta Carico', exact: true })
    .click();
  await page.getByRole('button', { name: 'RPE 9', exact: true }).click();
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  await expect
    .poll(
      async () =>
        workoutDetailSchema.parse(
          await (await request.get(origin + `/workouts/${active.id}`)).json(),
        ).completedSets,
    )
    .toBe(1);
  active = workoutDetailSchema.parse(
    await (await request.get(origin + `/workouts/${active.id}`)).json(),
  );
  const set = active.exercises[0]!.sets[0]!;
  expect([set.targetReps, set.targetLoadKg, set.targetRpe]).toEqual([
    8,
    '80.00',
    '8.0',
  ]);
  expect([set.actualReps, set.actualLoadKg, set.actualRpe]).toEqual([
    7,
    '82.50',
    '9.0',
  ]);
  await page.reload();
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('neon-rest.png') });
  await page
    .getByRole('button', { name: 'Salta recupero', exact: true })
    .click();
  await expect(page.getByText('Serie 2 di 2', { exact: true })).toBeVisible();
  await expect(valueButton(page, 'Carico')).toHaveText('80 kg');
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await expect(
    page.getByText('Allenamento completato', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Termina allenamento', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Torna agli allenamenti', exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        activeWorkoutSchema.parse(
          await (await request.get(origin + '/workouts/active')).json(),
        ).workout,
    )
    .toBeNull();
  expect(
    activeWorkoutSchema.parse(
      await (await request.get(origin + '/workouts/active')).json(),
    ).workout,
  ).toBeNull();
  await page.goto('/progress');
  await expect(page.getByText('PUSH E2E', { exact: true })).toBeVisible();
  await expect(page.getByText('PANORAMICA', { exact: true })).toBeVisible();
  const summary = progressSummarySchema.parse(
    await (
      await request.get(origin + '/progress/summary?range=8w&timeZone=UTC')
    ).json(),
  );
  expect(summary.completedSets).toBe(2);
  expect(summary.totalReps).toBe(15);
  await page
    .getByRole('button', {
      name: 'E2E Panca snapshot, Carico massimo, 82,5 kg × 7 reps',
      exact: true,
    })
    .click();
  await expect(
    page
      .getByText('82,5 kg × 7 reps', { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  const progress = progressExerciseDetailSchema.parse(
    await (
      await request.get(
        origin + `/progress/exercises/${e.id}?range=8w&timeZone=UTC`,
      )
    ).json(),
  );
  expect(progress.modes[0]?.maxLoadKg).toBe('82.50');
  expect(progress.modes[0]?.totalReps).toBe(15);
  await page.screenshot({ path: info.outputPath('neon-progress.png') });
  await page.getByRole('button', { name: 'Indietro', exact: true }).click();
  await page
    .getByRole('button', { name: 'Riepilogo allenamento', exact: true })
    .first()
    .click();
  await expect(
    page.getByText('E2E Panca snapshot', { exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '✓ Completa serie', exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

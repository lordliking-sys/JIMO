import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { workoutFixture } from './workout-fixture';
import {
  progressSummarySchema,
  progressWeeklySchema,
  progressExercisesSchema,
  progressExerciseDetailSchema,
  progressRecordsSchema,
} from '@jimo/schemas';
test('Progress ranges, actual/PR mode detail, accessible charts, SQLite cached responses and pending-sync notice', async ({
  page,
}, info) => {
  const fixture = await workoutFixture(page),
    id = fixture.workout.exercises[0]!.exerciseId,
    sid = fixture.workout.id,
    set = randomUUID(),
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const stamp = '2026-10-06T11:00:00Z';
  const record = {
    type: 'MAX_LOAD',
    exerciseId: id,
    displayName: 'Panca piana',
    trackingMode: 'reps',
    loadMode: 'external',
    value: '82.50',
    reps: 7,
    durationSeconds: null,
    date: stamp,
    sessionId: sid,
    setId: set,
  };
  const latest = {
    sessionId: sid,
    date: stamp,
    trackingMode: 'reps',
    loadMode: 'external',
    reps: 7,
    durationSeconds: null,
    loadKg: '82.50',
    assistanceKg: null,
  };
  const point = {
    sessionId: sid,
    date: stamp,
    completedSets: 1,
    totalReps: 7,
    maxReps: 7,
    maxDurationSeconds: null,
    averageDurationSeconds: null,
    totalDurationSeconds: null,
    maxLoadKg: '82.50',
    minAssistanceKg: null,
    loadVolume: '577.50',
    averageRpe: 9,
  };
  let offline = false;
  await page.route('http://localhost:4301/progress/**', async (route) => {
    if (offline) return route.abort('internetdisconnected');
    const url = new URL(route.request().url()),
      range = url.searchParams.get('range') ?? '8w';
    const period = {
      range,
      timeZone: url.searchParams.get('timeZone') ?? 'UTC',
      from: '2026-08-13T00:00:00Z',
      to: '2026-10-07T12:00:00Z',
      effectiveWeeks: 7.9,
    };
    const reply = (data: unknown) =>
      route.fulfill({
        json: data,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
        },
      });
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
        },
      });
    if (url.pathname === '/progress/summary')
      return reply(
        progressSummarySchema.parse({
          period,
          completedWorkouts: 1,
          trainingSeconds: 3600,
          completedSets: 1,
          skippedSets: 0,
          totalReps: 7,
          averageRpe: 9,
          sessionsPerWeek: 1 / 7.9,
          adherence: null,
        }),
      );
    if (url.pathname === '/progress/weekly')
      return reply(
        progressWeeklySchema.parse({
          period,
          weeks: [
            {
              weekStart: '2026-10-05',
              completedWorkouts: 1,
              completedSets: 1,
              totalReps: 7,
              averageRpe: 9,
              trainingSeconds: 3600,
            },
          ],
        }),
      );
    if (url.pathname === '/progress/prs')
      return reply(
        progressRecordsSchema.parse({
          period,
          records: [record],
          nextCursor: null,
        }),
      );
    if (url.pathname === '/progress/exercises')
      return reply(
        progressExercisesSchema.parse({
          period,
          exercises:
            url.searchParams.get('search') === 'missing'
              ? []
              : [
                  {
                    id,
                    displayName: 'Panca piana',
                    sessions: 1,
                    trackingModes: ['reps'],
                    loadModes: ['external', 'assisted'],
                    latest,
                    trend: null,
                  },
                ],
          nextCursor: null,
        }),
      );
    if (url.pathname === `/progress/exercises/${id}`)
      return reply(
        progressExerciseDetailSchema.parse({
          period,
          exercise: { id, displayName: 'Panca piana' },
          sessions: 1,
          trackingModes: ['reps'],
          loadModes: ['external', 'assisted'],
          modes: [
            {
              trackingMode: 'reps',
              loadMode: 'external',
              sessions: 1,
              sessionsPerWeek: 1 / 7.9,
              ...point,
              latest,
              records: [record],
              timeline: [point],
              timelineTruncated: false,
            },
            {
              trackingMode: 'reps',
              loadMode: 'assisted',
              sessions: 1,
              sessionsPerWeek: 1 / 7.9,
              ...point,
              maxLoadKg: null,
              minAssistanceKg: '20.00',
              loadVolume: null,
              latest: {
                ...latest,
                loadMode: 'assisted',
                loadKg: null,
                assistanceKg: '20.00',
              },
              records: [],
              timeline: [
                {
                  ...point,
                  maxLoadKg: null,
                  minAssistanceKg: '20.00',
                  loadVolume: null,
                },
              ],
              timelineTruncated: false,
            },
          ],
        }),
      );
    return route.fallback();
  });
  await page.goto('/progress');
  await expect(page.getByText('PANORAMICA', { exact: true })).toBeVisible();
  const periodControl = page.getByRole('radiogroup', {
    name: 'Periodo',
    exact: true,
  });
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await periodControl.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(48);
    expect(bounds?.height).toBeLessThanOrEqual(64);
    const segments = await periodControl.getByRole('radio').all();
    expect(segments).toHaveLength(5);
    const boxes = await Promise.all(
      segments.map((segment) => segment.boundingBox()),
    );
    expect(new Set(boxes.map((box) => Math.round(box!.y))).size).toBe(1);
    expect(boxes.every((box) => box!.height >= 48 && box!.width >= 48)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const historyControl = page.getByRole('radiogroup', {
    name: 'STORICO ALLENAMENTI',
    exact: true,
  });
  expect((await historyControl.boundingBox())?.height).toBeLessThanOrEqual(64);
  await expect(historyControl.getByRole('radio')).toHaveCount(3);
  await expect(
    page.getByRole('button', { name: 'Impostazioni', exact: true }),
  ).toHaveCount(0);

  await expect(
    page.getByRole('radio', { name: '8 settimane', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('7 ripetizioni', { exact: false })).toBeVisible();
  await page.getByRole('radio', { name: '4 settimane', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: '4 settimane', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
  await page
    .getByRole('textbox', { name: 'Cerca esercizi allenati', exact: true })
    .fill('missing');
  await expect(
    page.getByText('Nessun esercizio allenato corrisponde alla ricerca.', {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Cerca esercizi allenati', exact: true })
    .fill('');
  await page
    .getByRole('button', {
      name: 'Panca piana, Carico massimo, 82,5 kg × 7 reps',
      exact: true,
    })
    .click();
  await expect(
    page
      .getByText('82,5 kg × 7 reps', { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByText('Servono altre sessioni per mostrare l’andamento.', {
        exact: true,
      })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Assistito', exact: true }).click();
  await expect(
    page.getByText('20 kg assistenza × 7 reps', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Assistenza minima per sessione', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('radio', { name: 'Carico esterno', exact: true })
    .click();
  await page.screenshot({ path: info.outputPath('exercise-progress.png') });
  offline = true;
  await page.reload();
  await expect(page.getByText(/Ultimo aggiornamento/)).toBeVisible();
  await expect(
    page
      .getByText('82,5 kg × 7 reps', { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page.goto('/progress');
  await expect(page.getByText('PANORAMICA', { exact: true })).toBeVisible();
  await expect(page.getByText(/Ultimo aggiornamento/).first()).toBeVisible();
  // Pending actual data must never be added to server analytics locally.
  await page.route('http://localhost:4301/sync/workout-operations', (route) =>
    route.abort('internetdisconnected'),
  );
  await page.goto('/workout');
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: '✓ Completa serie', exact: true }),
  ).toBeVisible();
  await page.goto('/progress');
  await expect(
    page.getByText('Dati recenti in attesa di sincronizzazione.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('progress-offline.png') });
  expect(errors).toEqual([]);
});
test('Progress empty state is localized and provides one Workout CTA', async ({
  page,
}) => {
  await workoutFixture(page);
  await page.goto('/progress');
  await expect(
    page.getByText(
      'Completa il tuo primo allenamento per iniziare a vedere i progressi.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Vai a Workout', exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Vai a Workout', exact: true })
    .click();
  await expect(
    page
      .getByRole('button', { name: 'Inizia allenamento', exact: true })
      .first(),
  ).toBeVisible();
});

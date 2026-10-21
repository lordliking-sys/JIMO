import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  activeWorkoutSchema,
  exerciseDtoSchema,
  programDetailSchema,
  programListSchema,
  progressSummarySchema,
  workoutDetailSchema,
  workoutHistorySchema,
} from '@jimo/schemas';
import { manualField, simulateSafeArea } from './helpers';

test.use({ timezoneId: 'Europe/Rome' });
test.skip(
  !process.env.DATABASE_URL,
  'Requires identity-verified Neon development',
);
const origin = 'http://localhost:4301';
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
async function api(
  request: APIRequestContext,
  path: string,
  method = 'GET',
  data?: unknown,
) {
  const response = await request.fetch(origin + path, {
    method,
    headers: { 'x-jimo-locale': 'it' },
    ...(data === undefined ? {} : { data }),
  });
  expect(response.ok(), `${method} ${path}: HTTP ${response.status()}`).toBe(
    true,
  );
  return response.json() as Promise<unknown>;
}
test.beforeEach(async ({ request }) => {
  const { workout } = activeWorkoutSchema.parse(
    await api(request, '/workouts/active'),
  );
  if (workout) await api(request, `/workouts/${workout.id}/cancel`, 'POST', {});
});
async function device(page: Page) {
  await page.setViewportSize({ width: 390, height: 780 });
  await simulateSafeArea(page, 24, 34);
  await page.clock.install({ time: new Date('2026-10-19T10:00:00Z') });
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
}
async function number(page: Page, label: string, value: string) {
  await (await manualField(page, label)).fill(value);
  await button(page, `Conferma ${label}`).click();
}
async function close(page: Page) {
  await button(page, 'Chiudi popup').last().click();
}
async function cachedPlan(request: APIRequestContext, name: string) {
  const exercise = exerciseDtoSchema.parse(
    await api(request, '/exercises', 'POST', {
      name: `Dip ${name}`,
      trackingMode: 'reps',
      defaultLoadMode: 'bodyweight',
    }),
  );
  let program = programDetailSchema.parse(
    await api(request, '/programs', 'POST', { name }),
  );
  program = programDetailSchema.parse(
    await api(request, `/programs/${program.id}/days`, 'POST', {
      name: 'Upper',
      dayOfWeek: 1,
    }),
  );
  program = programDetailSchema.parse(
    await api(
      request,
      `/program-days/${program.days[0]!.id}/exercises`,
      'POST',
      {
        exerciseId: exercise.id,
        loadMode: 'bodyweight',
        targetSets: 3,
        targetReps: 8,
        restSeconds: 180,
      },
    ),
  );
  program = programDetailSchema.parse(
    await api(request, `/programs/${program.id}/activate`, 'POST', {}),
  );
  return { program, exercise };
}

test('Task10 critical live flow: login, create plan/day/prescription, selected dates, actuals, analytics and reopen', async ({
  page,
  request,
}, info) => {
  test.setTimeout(240000);
  await device(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('audit.login')) {
      sessionStorage.setItem('jimo.test.signedOut', 'true');
      sessionStorage.setItem('audit.login', 'true');
    }
  });
  const name = `Audit ${randomUUID().slice(0, 8)}`;
  const exercise = exerciseDtoSchema.parse(
    await api(request, '/exercises', 'POST', {
      name: `Dip ${name}`,
      trackingMode: 'reps',
      defaultLoadMode: 'bodyweight',
    }),
  );
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Email', exact: true })
    .fill('fixture@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await button(page, 'Accedi').click();
  await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
  await button(page, 'Cambia scheda').click();
  await button(page, '+ Nuova scheda').click();
  await page.getByLabel('Nome scheda', { exact: true }).fill(name);
  await button(page, 'Crea scheda').dblclick();
  await expect(page.getByTestId('program-popup-overlay')).toHaveCount(0);
  let list = programListSchema.parse(await api(request, '/programs'));
  expect(list.programs.filter((p) => p.name === name)).toHaveLength(1);
  expect(list.programs.find((p) => p.name === name)!.status).toBe('draft');
  await button(page, 'Cambia scheda').click();
  await button(page, `${name}, NON ATTIVA`).click();
  await button(page, 'Attiva').dblclick();
  await expect(page.getByTestId('active-plan-heading')).toContainText(name);
  await button(page, 'Lunedì, Giorno di riposo').click();
  await button(page, 'Crea allenamento per Lunedì').click();
  await page
    .getByRole('textbox', { name: 'Nome giornata', exact: true })
    .fill('Upper');
  await button(page, 'Salva giorno').dblclick();
  await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
  await button(page, '+ Aggiungi esercizio').click();
  await page
    .getByLabel('Cerca esercizio', { exact: true })
    .fill(exercise.displayName);
  await page.clock.runFor(350);
  await button(page, exercise.displayName).click();
  await number(page, 'Serie', '3');
  await number(page, 'Ripetizioni', '8');
  await number(page, 'Recupero (secondi, opzionale)', '180');
  await button(page, 'Salva esercizio').dblclick();
  await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
  await close(page);
  list = programListSchema.parse(await api(request, '/programs'));
  const program = programDetailSchema.parse(
    await api(
      request,
      `/programs/${list.programs.find((p) => p.name === name)!.id}`,
    ),
  );
  expect(program.days).toHaveLength(1);
  expect(program.days[0]!.exercises).toHaveLength(1);
  const entry = program.days[0]!.exercises[0]!;
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('home-upcoming-exercise')).toContainText(
    exercise.displayName,
  );
  await page.getByTestId('home-date-2').click();
  await expect(page.getByTestId('home-workout-card')).toContainText(
    'Giorno di riposo',
  );
  await expect(page.getByTestId('home-upcoming-exercise')).toHaveCount(0);
  await page.getByTestId('home-date-1').click();
  await button(page, 'Inizia allenamento').dblclick();
  await expect(page).toHaveURL(/\/workout\/[^/]+$/);
  const url = page.url(),
    id = new URL(url).pathname.split('/').at(-1)!;
  await number(page, 'Ripetizioni', '10');
  await button(page, '✓ Completa serie').dblclick();
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  await button(page, 'Salta recupero').click();
  await button(page, 'Salta serie').click();
  await expect(page.getByLabel('Serie 3 di 3', { exact: true })).toBeVisible();
  await button(page, 'Salta serie').click();
  await expect(page.getByTestId('session-summary')).toBeVisible();
  await expect(page.getByTestId('session-summary')).toBeVisible();
  await button(page, 'Termina allenamento').dblclick();
  await expect(button(page, 'Torna alla Home')).toBeVisible();
  await expect
    .poll(
      async () => {
        const response = await request.get(origin + `/workouts/${id}`);
        if (response.status() === 404) return null; // SQLite commit precedes the first server ACK.
        expect(response.ok()).toBe(true);
        return workoutDetailSchema.parse(await response.json()).status;
      },
      { timeout: 60000 },
    )
    .toBe('completed');
  let stored = workoutDetailSchema.parse(await api(request, `/workouts/${id}`));
  expect(stored.completedSets).toBe(1);
  expect(stored.skippedSets).toBe(2);
  expect(stored.exercises[0]!.sets[0]!.targetReps).toBe(8);
  expect(stored.exercises[0]!.sets[0]!.actualReps).toBe(10);
  await button(page, 'Correggi serie 1').click();
  await page
    .getByTestId('set-correction-overlay')
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  await button(page, 'Salva correzione').click();
  await expect
    .poll(
      async () =>
        workoutDetailSchema.parse(await api(request, `/workouts/${id}`))
          .exercises[0]!.sets[0]!.actualReps,
    )
    .toBe(11);
  await button(page, 'Torna alla Home').click();
  await expect(page.getByTestId('home-workout-card')).toContainText(
    'Completato',
  );
  await expect(
    page.getByTestId(`home-exercise-completed-${entry.id}`),
  ).toHaveCount(0); // two sets were skipped
  await page.getByRole('tab', { name: 'Progressi', exact: true }).click();
  await expect(page.getByTestId('workouts-stat')).toContainText('1');
  await expect(page.getByTestId('completed-sets-stat')).toContainText('1');
  const summary = progressSummarySchema.parse(
    await api(request, '/progress/summary?timeZone=Europe%2FRome&range=8w'),
  );
  expect(summary.totalReps).toBe(11);
  expect(summary.skippedSets).toBe(2);
  await page.reload();
  await expect(page.getByTestId('workouts-stat')).toContainText('1');
  const history = workoutHistorySchema.parse(
    await api(request, '/workouts?status=completed'),
  );
  expect(history.workouts.filter((w) => w.id === id)).toHaveLength(1);
  stored = workoutDetailSchema.parse(await api(request, `/workouts/${id}`));
  expect(stored.exercises[0]!.sets[0]!.targetReps).toBe(8);
  expect(stored.exercises[0]!.sets[0]!.actualReps).toBe(11);
  expect(Date.parse(stored.updatedAt)).toBeGreaterThanOrEqual(
    Date.parse(stored.exercises[0]!.sets[0]!.updatedAt),
  );
  await page.screenshot({
    path: info.outputPath('critical-live-progress.png'),
  });
});

test('Task10 offline: complete/skip/correct, close page, reopen offline and automatic reconnect sync once', async ({
  page,
  context,
  request,
}, info) => {
  test.setTimeout(240000);
  await device(page);
  const f = await cachedPlan(request, `Offline ${randomUUID().slice(0, 8)}`);
  let offline = false;
  await context.route(origin + '/**', (route) =>
    offline ? route.abort('internetdisconnected') : route.continue(),
  );
  await context.addInitScript(() =>
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => localStorage.getItem('audit.offline') !== 'true',
    }),
  );
  await page.goto('/');
  await expect(page.getByTestId('home-upcoming-exercise')).toContainText(
    f.exercise.displayName,
  );
  offline = true;
  await page.evaluate(() => {
    localStorage.setItem('audit.offline', 'true');
    window.dispatchEvent(new Event('offline'));
    const connection = Reflect.get(navigator, 'connection');
    if (connection instanceof EventTarget)
      connection.dispatchEvent(new Event('change'));
  });
  await button(page, 'Inizia allenamento').click();
  await expect(page).toHaveURL(/\/workout\/[^/]+$/);
  const url = page.url(),
    id = new URL(url).pathname.split('/').at(-1)!;
  await number(page, 'Ripetizioni', '10');
  await button(page, '✓ Completa serie').click();
  await button(page, 'Salta recupero').click();
  await button(page, 'Salta serie').click();
  await expect(page.getByLabel('Serie 3 di 3', { exact: true })).toBeVisible();
  await button(page, 'Salta serie').click();
  await expect(page.getByTestId('session-summary')).toBeVisible();
  await button(page, 'Correggi serie 1').click();
  await page
    .getByTestId('set-correction-overlay')
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  await button(page, 'Salva correzione').click();
  await button(page, 'Termina allenamento').click();
  await expect(button(page, 'Torna alla Home')).toBeVisible();
  expect((await request.get(origin + `/workouts/${id}`)).status()).toBe(404);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(url);
  await expect(button(reopened, 'Torna alla Home')).toBeVisible();
  await expect(reopened.getByTestId('session-summary')).toContainText(
    '11 reps',
  );
  await reopened.screenshot({
    path: info.outputPath('reopened-offline-summary.png'),
  });
  offline = false;
  await reopened.evaluate(() => {
    localStorage.removeItem('audit.offline');
    window.dispatchEvent(new Event('online'));
    const connection = Reflect.get(navigator, 'connection');
    if (connection instanceof EventTarget)
      connection.dispatchEvent(new Event('change'));
  });
  await expect
    .poll(
      async () => {
        const response = await request.get(origin + `/workouts/${id}`);
        return response.ok()
          ? workoutDetailSchema.parse(await response.json()).status
          : null;
      },
      { timeout: 60000 },
    )
    .toBe('completed');
  await expect
    .poll(
      async () =>
        workoutDetailSchema.parse(await api(request, `/workouts/${id}`))
          .syncSequence,
    )
    .toBe(6);
  await reopened.reload();
  await expect(button(reopened, 'Torna alla Home')).toBeVisible();
  const stored = workoutDetailSchema.parse(
    await api(request, `/workouts/${id}`),
  );
  expect(stored.syncSequence).toBe(6);
  expect(stored.completedSets).toBe(1);
  expect(stored.skippedSets).toBe(2);
  expect(stored.exercises[0]!.sets[0]!.actualReps).toBe(11);
  expect(stored.exercises[0]!.sets[0]!.targetReps).toBe(8);
  const history = workoutHistorySchema.parse(
    await api(request, '/workouts?status=completed'),
  );
  expect(history.workouts.filter((w) => w.id === id)).toHaveLength(1);
  await reopened.close();
});

test('Task10 cache: add/remove exercise and delete Monday update Home without refresh', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await device(page);
  const f = await cachedPlan(request, `Cache ${randomUUID().slice(0, 8)}`);
  const extra = exerciseDtoSchema.parse(
    await api(request, '/exercises', 'POST', {
      name: `Push-up ${randomUUID().slice(0, 8)}`,
      trackingMode: 'reps',
      defaultLoadMode: 'bodyweight',
    }),
  );
  await page.goto('/');
  await expect(page.getByTestId('home-upcoming-exercise')).toContainText(
    f.exercise.displayName,
  );
  await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
  await page.getByTestId(`program-day-${f.program.days[0]!.id}`).click();
  await button(page, '+ Aggiungi esercizio').click();
  await page
    .getByLabel('Cerca esercizio', { exact: true })
    .fill(extra.displayName);
  await page.clock.runFor(350);
  await button(page, extra.displayName).click();
  await button(page, 'Salva esercizio').click();
  await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
  await close(page);
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('home-upcoming-exercise')).toContainText(
    extra.displayName,
  );
  await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
  await page.getByTestId(`program-day-${f.program.days[0]!.id}`).click();
  await button(page, `Modifica esercizio ${extra.displayName}`).click();
  await button(page, 'Rimuovi esercizio').click();
  await button(page, 'Conferma').click();
  await expect(page.getByTestId('day-dialog-detail')).toBeVisible();
  await close(page);
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('home-upcoming-exercise')).not.toContainText(
    extra.displayName,
  );
  await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
  await page.getByTestId(`program-day-${f.program.days[0]!.id}`).click();
  await button(page, 'Elimina').click();
  await button(page, 'Conferma').click();
  await close(page);
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('home-workout-card')).toContainText(
    'Giorno di riposo',
  );
  await expect(page.getByTestId('home-upcoming-exercise')).toHaveCount(0);
});

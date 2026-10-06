import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Prescription, ProgramDetail } from '@jimo/schemas';

const id = 'c50afad0-7c5c-43ef-91b0-201e5795b316';
const dayId = '3dcf18ea-f4a1-4057-9b87-607dafd879b6';
const exerciseId = 'e2cf26e7-b6a4-4940-ae67-ac6060cf6c9b';
const audit = {
  createdAt: '2026-10-06T08:00:00Z',
  updatedAt: '2026-10-06T08:00:00Z',
};

async function mockApi(
  page: Page,
  trackingMode: 'reps' | 'duration' = 'reps',
  locale = 'it',
) {
  await page.addInitScript(
    (language) =>
      localStorage.setItem(
        'jimo.preferences.v1',
        JSON.stringify({
          version: 1,
          onboardingCompleted: true,
          localePreference: language,
          onboarding: {
            locale: language,
            goal: 'strength',
            experienceLevel: 'intermediate',
            trainingDaysPerWeek: 4,
            equipment: ['fullGym'],
            startMethod: 'manual',
          },
        }),
      ),
    locale,
  );
  const exercise = {
    id: exerciseId,
    displayName: trackingMode === 'reps' ? 'Panca piana' : 'Plank',
    canonicalName: 'Fixture',
    trackingMode,
    defaultLoadMode: 'external' as const,
    isCustom: false,
  };
  let program: ProgramDetail = {
    id,
    name: 'Upper',
    description: null,
    status: 'draft',
    durationWeeks: null,
    startsOn: null,
    daysCount: 1,
    ...audit,
    days: [
      {
        id: dayId,
        name: 'Push',
        dayOfWeek: null,
        notes: null,
        position: 0,
        exercises: [],
        ...audit,
      },
    ],
  };
  const saved: Prescription[] = [];
  const metadata: Record<string, unknown>[] = [];
  // Intercept the whole test API origin: these tests never call a real backend.
  await page.route('http://localhost:4301/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    const reply = (json: unknown) =>
      route.fulfill({ json, headers: { 'access-control-allow-origin': '*' } });
    if (path === `/exercises/${exerciseId}`) return reply(exercise);
    if (path === '/programs' && method === 'GET')
      return reply({ programs: [] });
    if (path === '/programs' && method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      metadata.push(body);
      program = { ...program, ...body, daysCount: 0, days: [] };
      return reply(program);
    }
    if (path === `/programs/${id}`) return reply(program);
    if (path === `/program-days/${dayId}/exercises` && method === 'POST') {
      const body = route.request().postDataJSON() as Prescription;
      saved.push(body);
      program = {
        ...program,
        days: [
          {
            ...program.days[0]!,
            exercises: [
              {
                ...body,
                id: 'eac3caa8-b6a5-4ac5-8fca-3bb6f2035142',
                position: 0,
                exercise,
                ...audit,
              },
            ],
          },
        ],
      };
      return reply(program);
    }
    return route.fulfill({
      status: 404,
      json: {
        error: { code: 'NOT_FOUND', message: 'Unexpected fixture request' },
      },
    });
  });
  return { saved, metadata };
}

test('manual form: quick weeks, localized calendar date, clear date and visible footer', async ({
  page,
}, testInfo) => {
  const { metadata } = await mockApi(page);
  await page.goto('/program/manual');
  const weeks = page.getByRole('textbox', {
    name: 'Durata in settimane (opzionale)',
    exact: true,
  });
  await page
    .getByRole('button', {
      name: 'Aumenta Durata in settimane (opzionale)',
      exact: true,
    })
    .click();
  await expect(weeks).toHaveValue('4');
  await page.getByRole('button', { name: '8 settimane', exact: true }).click();
  await expect(weeks).toHaveValue('8');
  await weeks.fill('7');
  await page
    .getByRole('button', {
      name: 'Aumenta Durata in settimane (opzionale)',
      exact: true,
    })
    .click();
  await expect(weeks).toHaveValue('8');
  const date = page.locator('input[type="date"]');
  await date.fill('2026-10-25');
  await expect(
    page.getByText('25 ottobre 2026', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Rimuovi data', exact: true }).click();
  await expect(date).toHaveValue('');
  await date.fill('2026-10-06');
  await page
    .getByRole('textbox', { name: 'Nome programma', exact: true })
    .fill('Upper');
  const description = page.getByRole('textbox', {
    name: 'Descrizione (opzionale)',
    exact: true,
  });
  await description.fill('Forza');
  await description.focus();
  await page.setViewportSize({ width: 320, height: 430 });
  const next = page.getByRole('button', { name: 'Continua', exact: true });
  await expect(async () => {
    const field = await description.boundingBox(),
      footer = await next.boundingBox();
    expect(field!.y).toBeGreaterThanOrEqual(0);
    expect(field!.y + field!.height).toBeLessThanOrEqual(footer!.y);
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(430);
  }).toPass();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('manual-form.png'),
    fullPage: true,
  });
  await next.click();
  await expect(
    page.getByText('Upper', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  expect(metadata).toEqual([
    {
      name: 'Upper',
      description: 'Forza',
      durationWeeks: 8,
      startsOn: '2026-10-06',
    },
  ]);
});

test('inline prescription steps preserve precise loads, half-point RPE, custom rest and bounds', async ({
  page,
}, testInfo) => {
  const { saved } = await mockApi(page);
  await page.goto(
    `/program/${id}/exercise?dayId=${dayId}&exerciseId=${exerciseId}`,
  );
  await page
    .getByRole('button', { name: 'Aumenta Serie', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Serie', exact: true }),
  ).toHaveValue('4');
  await page
    .getByRole('button', { name: 'Aumenta Ripetizioni', exact: true })
    .click();
  const load = page.getByRole('textbox', { name: 'Carico (kg)', exact: true });
  await load.fill('1,25');
  await page
    .getByRole('button', { name: 'Aumenta Carico (kg)', exact: true })
    .click();
  await expect(load).toHaveValue('3,75');
  await page.getByRole('button', { name: 'RPE 8', exact: true }).click();
  await page
    .getByRole('button', { name: 'Aumenta RPE (opzionale)', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'RPE (opzionale)', exact: true }),
  ).toHaveValue('8,5');
  await page.getByRole('button', { name: '1:30', exact: true }).click();
  const rest = page.getByRole('textbox', {
    name: 'Recupero (secondi, opzionale)',
    exact: true,
  });
  await expect(rest).toHaveValue('90');
  await rest.fill('75');
  await page
    .getByRole('button', {
      name: 'Aumenta Recupero (secondi, opzionale)',
      exact: true,
    })
    .click();
  await expect(rest).toHaveValue('105');
  const reps = page.getByRole('textbox', { name: 'Ripetizioni', exact: true });
  await reps.fill('0');
  await expect(
    page.getByRole('button', { name: 'Diminuisci Ripetizioni', exact: true }),
  ).toBeDisabled();
  await reps.fill('9');
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const plus = await page
      .getByRole('button', { name: 'Aumenta Serie', exact: true })
      .boundingBox();
    expect(plus!.width).toBeGreaterThanOrEqual(48);
    expect(plus!.height).toBeGreaterThanOrEqual(48);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('textbox', { name: 'Note (opzionali)', exact: true })
    .fill('Tempo 3-1-1');
  await page.screenshot({
    path: testInfo.outputPath('prescription.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Salva esercizio', exact: true })
    .click();
  await expect(
    page.getByText('4 × 9', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  expect(saved).toEqual([
    {
      exerciseId,
      loadMode: 'external',
      targetSets: 4,
      targetReps: 9,
      targetRepMin: null,
      targetRepMax: null,
      targetDurationSeconds: null,
      targetLoadKg: '3.75',
      targetAssistanceKg: null,
      targetRpe: '8.5',
      restSeconds: 105,
      notes: 'Tempo 3-1-1',
    },
  ]);
});

test('range controls preserve validation and hidden fixed targets are not submitted', async ({
  page,
}) => {
  const { saved } = await mockApi(page);
  await page.goto(
    `/program/${id}/exercise?dayId=${dayId}&exerciseId=${exerciseId}`,
  );
  await page.getByRole('button', { name: 'Range reps', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Ripetizioni', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Ripetizioni minime', exact: true })
    .fill('13');
  await page
    .getByRole('button', { name: 'Salva esercizio', exact: true })
    .click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(saved).toHaveLength(0);
  await page
    .getByRole('textbox', { name: 'Ripetizioni minime', exact: true })
    .fill('8');
  await page
    .getByRole('button', { name: 'Aumenta Ripetizioni minime', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Salva esercizio', exact: true })
    .click();
  await expect(
    page.getByText('3 × 9–12', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  expect(saved[0]).toMatchObject({
    targetRepMin: 9,
    targetRepMax: 12,
    targetReps: null,
    targetDurationSeconds: null,
  });
});

test('English timed exercise keeps duration controls and omits all repetition fields', async ({
  page,
}) => {
  const { saved } = await mockApi(page, 'duration', 'en');
  await page.goto(
    `/program/${id}/exercise?dayId=${dayId}&exerciseId=${exerciseId}`,
  );
  await page
    .getByRole('button', { name: 'Increase Duration (seconds)', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Duration (seconds)', exact: true }),
  ).toHaveValue('75');
  await page.getByRole('button', { name: 'Bodyweight', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Load (kg)', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Save exercise', exact: true })
    .click();
  await expect(
    page.getByText('3 × 75 sec', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  expect(saved[0]).toMatchObject({
    targetDurationSeconds: 75,
    targetReps: null,
    targetRepMin: null,
    targetRepMax: null,
    targetLoadKg: null,
    targetAssistanceKg: null,
    targetRpe: null,
  });
});

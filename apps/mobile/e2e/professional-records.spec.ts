import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { workoutFixture } from './workout-fixture';
import { simulateSafeArea } from './helpers';
import type { ExerciseModeMetrics } from '@jimo/schemas';

test.use({ timezoneId: 'Europe/Rome' });
async function recordsFixture(page: Page) {
  await workoutFixture(page);
  const choices = [
    {
      id: randomUUID(),
      displayName: 'Dip',
      loadMode: 'weighted',
      trackingMode: 'reps',
    },
    {
      id: randomUUID(),
      displayName: 'Trazioni assistite',
      loadMode: 'assisted',
      trackingMode: 'reps',
    },
    {
      id: randomUUID(),
      displayName: 'Tenuta',
      loadMode: 'bodyweight',
      trackingMode: 'duration',
    },
  ] as const;
  const detailRequests: string[] = [];
  const mode = (choice: (typeof choices)[number]): ExerciseModeMetrics => {
    const timeline = [0, 1, 2].map((i) => ({
      sessionId: randomUUID(),
      date: `2026-10-${String(5 + i * 3).padStart(2, '0')}T10:00:00Z`,
      completedSets: 3,
      totalReps: choice.trackingMode === 'reps' ? 24 + i * 3 : null,
      maxReps: choice.trackingMode === 'reps' ? 8 + i : null,
      maxDurationSeconds:
        choice.trackingMode === 'duration' ? 30 + i * 15 : null,
      averageDurationSeconds:
        choice.trackingMode === 'duration' ? 30 + i * 15 : null,
      totalDurationSeconds:
        choice.trackingMode === 'duration' ? 90 + i * 45 : null,
      maxLoadKg: choice.loadMode === 'weighted' ? String(10 + i * 5) : null,
      minAssistanceKg:
        choice.loadMode === 'assisted' ? String(30 - i * 5) : null,
      loadVolume: null,
      averageRpe: null,
    }));
    const last = timeline.at(-1)!;
    return {
      ...last,
      trackingMode: choice.trackingMode,
      loadMode: choice.loadMode,
      sessions: 3,
      sessionsPerWeek: 0.375,
      completedSets: 9,
      latest: {
        sessionId: last.sessionId,
        date: last.date,
        reps: last.maxReps,
        durationSeconds: last.maxDurationSeconds,
        loadKg: last.maxLoadKg,
        assistanceKg: last.minAssistanceKg,
        trackingMode: choice.trackingMode,
        loadMode: choice.loadMode,
      },
      records: [],
      timeline,
      timelineTruncated: false,
    };
  };
  const modes = choices.map(mode);
  await page.route('**/progress/**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
        },
      });
    const period = {
      range: url.searchParams.get('range') ?? '8w',
      timeZone: 'Europe/Rome',
      from: '2026-08-15T00:00:00Z',
      to: '2026-10-15T00:00:00Z',
      effectiveWeeks: 8,
    };
    let json: unknown;
    if (url.pathname === '/progress/exercises')
      json = {
        period,
        exercises: choices.map((c, i) => ({
          id: c.id,
          displayName: c.displayName,
          sessions: 3,
          trackingModes: [c.trackingMode],
          loadModes: [c.loadMode],
          latest: modes[i]!.latest,
          trend: null,
        })),
        nextCursor: null,
      };
    else {
      const index = choices.findIndex(
        (c) => url.pathname === `/progress/exercises/${c.id}`,
      );
      if (index < 0) return route.fallback();
      detailRequests.push(url.pathname);
      json = {
        period,
        exercise: {
          id: choices[index]!.id,
          displayName: choices[index]!.displayName,
        },
        sessions: 3,
        trackingModes: [choices[index]!.trackingMode],
        loadModes: [choices[index]!.loadMode],
        modes: period.range === '4w' ? [] : [modes[index]],
      };
    }
    return route.fulfill({
      json,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
      },
    });
  });
  return { choices, detailRequests };
}
for (const phone of [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
]) {
  test(`Personal records: real load/reps, exercise dropdown, assistance and duration ${phone.width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(phone);
    await simulateSafeArea(page, 24, 34);
    const fixture = await recordsFixture(page);
    await page.goto('/progress');
    const panel = page.getByTestId('personal-records-panel');
    const chart = panel.getByTestId('personal-performance-chart');
    await expect(chart).toBeVisible();
    await expect(chart).toContainText('20 kg');
    await expect(chart).toContainText('10 reps');
    await expect(chart).toContainText('Seduta 3 di 3');
    await panel
      .getByRole('button', { name: 'Seduta precedente', exact: true })
      .click();
    await expect(chart).toContainText('15 kg');
    await expect(chart).toContainText('9 reps');
    await expect(chart).toContainText('Seduta 2 di 3');
    expect(
      await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await chart.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('records-chart.png') });
    const choose = async (name: string) => {
      await panel
        .getByRole('button', { name: 'Scegli esercizio', exact: true })
        .click();
      await page.getByRole('radio', { name, exact: true }).click();
    };
    await choose('Trazioni assistite');
    await expect(chart).toContainText('Assistenza minima');
    await expect(chart).not.toContainText('Carico massimo');
    await expect(chart).toContainText('Meno assistenza');
    await panel
      .getByRole('button', { name: 'Seduta precedente', exact: true })
      .click();
    await expect(chart).toContainText('25 kg');
    await choose('Tenuta');
    await expect(chart).toContainText('60 s');
    await expect(chart).not.toContainText('kg');
    await expect(chart).not.toContainText('reps');
    await expect(panel.getByTestId('record-exercise-picker')).toContainText(
      'Tenuta',
    );
    await page.getByRole('radio', { name: '4 settimane', exact: true }).click();
    await expect(panel).toContainText('Nessuna serie completata');
    await expect(chart).toHaveCount(0);
    await expect(panel.getByTestId('record-exercise-picker')).toContainText(
      'Tenuta',
    );
    expect(fixture.detailRequests).toContain(
      `/progress/exercises/${fixture.choices[2].id}`,
    );
  });
}

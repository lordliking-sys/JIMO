import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { workoutFixture } from './workout-fixture';

test.use({ timezoneId: 'Europe/Rome' });
const devices = [
  { width: 320, height: 740, top: 24, bottom: 48 },
  { width: 390, height: 780, top: 24, bottom: 48 },
  { width: 393, height: 851, top: 24, bottom: 48 },
  { width: 430, height: 860, top: 47, bottom: 34 },
];
async function insets(page: Page, top: number, bottom: number) {
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
async function visualFixture(page: Page, locale = 'it') {
  const fixture = await workoutFixture(page, locale),
    program = fixture.program;
  program.name = 'Push Pull Legs';
  program.startsOn = '2026-10-05';
  program.durationWeeks = 3;
  const original = program.days[0]!;
  program.days = ['Push', 'Pull', 'Gambe', 'Full Body'].map(
    (name, position) => ({
      ...original,
      id: position === 0 ? original.id : randomUUID(),
      name,
      position,
      dayOfWeek: [2, 4, 6, 7][position]!,
      exercises: original.exercises.map((exercise) => ({
        ...exercise,
        id: randomUUID(),
      })),
    }),
  );
  program.daysCount = program.days.length;
  fixture.workout.name = 'Pull';
  fixture.workout.programDayId = program.days[1]!.id;
  const completed = {
    ...fixture.workout,
    id: randomUUID(),
    name: 'Push',
    status: 'completed',
    programDayId: original.id,
    startedAt: '2026-10-06T10:00:00Z',
    completedAt: '2026-10-06T11:00:00Z',
    completedSets: 6,
    pendingSets: 0,
    exercises: fixture.workout.exercises.map((exercise) => ({
      ...exercise,
      id: randomUUID(),
      sets: exercise.sets.map((set) => ({
        ...set,
        id: randomUUID(),
        status: 'completed',
        completedAt: '2026-10-06T11:00:00Z',
        actualReps: set.targetReps,
        actualDurationSeconds: set.targetDurationSeconds,
        actualLoadKg: set.targetLoadKg,
        actualAssistanceKg: set.targetAssistanceKg,
        actualRpe: set.targetRpe,
      })),
    })),
  };
  await page.route(`**/workouts/${completed.id}`, (route) =>
    route.fulfill({ json: completed }),
  );
  await page.route(/\/workouts(?:\?|$)/, (route) =>
    route.fulfill({
      json: {
        workouts: [completed],
      },
    }),
  );
  await page.route('**/progress/summary?*', (route) =>
    route.fulfill({
      json: {
        period: {
          range: '4w',
          timeZone: 'Europe/Rome',
          from: '2026-09-10T00:00:00Z',
          to: '2026-10-08T10:00:00Z',
          effectiveWeeks: 4,
        },
        completedWorkouts: 7,
        completedSets: 42,
        skippedSets: 0,
        totalReps: null,
        averageRpe: null,
        trainingSeconds: null,
        sessionsPerWeek: 1.75,
        adherence: null,
      },
    }),
  );
  return fixture;
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .getByTestId(
        new URL(page.url()).pathname === '/program'
          ? 'program-main-screen'
          : 'home-main-screen',
      )
      .getByTestId('main-scroll')
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
}
for (const device of devices)
  test(`Home and program references: ${device.width}x${device.height}, real states and four safe-area tabs`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    await page.setViewportSize(device);
    await insets(page, device.top, device.bottom);
    await page.clock.install({ time: new Date('2026-10-08T10:00:00Z') });
    const fixture = await visualFixture(page),
      errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByTestId('home-workout-card')).toContainText(
      'Push Pull Legs',
    );
    await page.evaluate(() => document.fonts.ready);
    const background = (await page
      .getByTestId('home-main-screen')
      .locator('img')
      .first()
      .boundingBox())!;
    expect(background.width).toBeLessThanOrEqual(device.width);
    expect(
      Math.abs(background.height / background.width - 1672 / 941),
    ).toBeLessThan(0.02);
    await expect(page.getByRole('tab')).toHaveText([
      'Home',
      'Scheda',
      'Progressi',
      'Profilo',
    ]);
    for (const tab of await page.getByRole('tab').all()) {
      const box = (await tab.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.y + box.height).toBeLessThanOrEqual(
        device.height - device.bottom + 1,
      );
    }
    await expect(page.getByTestId('home-progress')).toContainText('7');
    await expect(page.getByTestId('home-streak')).toContainText(
      'Non disponibile',
    );
    await expect(page.getByText('Leonardo', { exact: true })).toHaveCount(0);
    await expect(
      page
        .getByTestId('home-week-strip')
        .getByLabel(/Martedì, allenamento completato/),
    ).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath('home-reference.png') });
    await page.getByRole('tab', { name: 'Scheda', exact: true }).click();
    await expect(
      page.getByTestId(`program-day-${fixture.program.days[3]!.id}`),
    ).toBeVisible();
    const push = page.getByTestId(`program-day-${fixture.program.days[0]!.id}`),
      pull = page.getByTestId(`program-day-${fixture.program.days[1]!.id}`),
      legs = page.getByTestId(`program-day-${fixture.program.days[2]!.id}`);
    await expect(push).toHaveAccessibleName(/Rivedi Push, Completato/);
    await expect(pull).toHaveAccessibleName(/Corrente/);
    await expect(legs).toHaveAccessibleName(/Pianificato/);
    await expect(legs).toBeEnabled();
    for (const day of fixture.program.days) {
      const card = page.getByTestId(`program-day-${day.id}`),
        artwork = (await card.locator('img').boundingBox())!,
        frame = (await card.boundingBox())!;
      expect(artwork.width).toBeLessThanOrEqual(frame.width);
      expect(artwork.height).toBeLessThanOrEqual(frame.height);
    }
    await expect(
      page.getByRole('radio', { name: 'Settimana 1', exact: true }),
    ).toBeChecked();
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath('program-reference.png') });
    await page.getByRole('radio', { name: 'Settimana 2', exact: true }).click();
    await expect(push).toHaveAccessibleName(/Pianificato/);
    await page.getByRole('radio', { name: 'Settimana 1', exact: true }).click();
    await expect(push).toHaveAccessibleName(/Completato/);
    await page.getByTestId('program-week-overview').scrollIntoViewIfNeeded();
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath('week-overview.png') });
    expect(fixture.writes).toHaveLength(0);
    expect(errors).toEqual([]);
  });
test('Home starts the actual scheduled day and Workout remains fullscreen', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-08T10:00:00Z') });
  const fixture = await visualFixture(page);
  await page.goto('/');
  await expect(page.getByTestId('home-workout-card')).toContainText(
    'Push Pull Legs',
  );
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '✓ Completa serie', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect
    .poll(
      () =>
        fixture.writes.filter(
          (write) =>
            (write.body as { operationType?: string }).operationType ===
            'START_WORKOUT',
        ).length,
    )
    .toBe(1);
  expect(fixture.workout.programDayId).toBe(fixture.program.days[1]!.id);
});
test('Home shows actual exercise progress and resumes without creating another workout', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-08T10:00:00Z') });
  const fixture = await visualFixture(page);
  fixture.setStarted();
  for (const exercise of fixture.workout.exercises.slice(0, 3))
    for (const set of exercise.sets)
      Object.assign(set, {
        status: 'completed',
        completedAt: '2026-10-08T09:59:00Z',
        actualReps: set.targetReps,
        actualLoadKg: set.targetLoadKg,
        actualAssistanceKg: set.targetAssistanceKg,
        actualRpe: set.targetRpe,
      });
  await page.goto('/');
  await expect(page.getByTestId('home-workout-card')).toContainText(
    '3 / 5 esercizi',
  );
  await page
    .getByRole('button', { name: 'Riprendi allenamento', exact: true })
    .click();
  await expect(page.getByTestId('workout-surface')).toBeVisible();
  expect(
    fixture.writes.filter(
      (write) =>
        (write.body as { operationType?: string }).operationType ===
        'START_WORKOUT',
    ),
  ).toHaveLength(0);
});
test('an active workout remains resumable offline even without a cached program', async ({
  page,
}) => {
  const fixture = await visualFixture(page);
  fixture.setStarted();
  await page.route('**/programs', (route) =>
    route.fulfill({ json: { programs: [] } }),
  );
  await page.goto('/');
  const card = page.getByTestId('home-workout-card');
  await expect(card).toContainText('Pull');
  await page.context().setOffline(true);
  await expect(page.getByText(/Offline ·/)).toBeVisible();
  await expect(card).toBeEnabled();
  await card.click();
  await expect(page.getByTestId('workout-surface')).toBeVisible();
  expect(
    fixture.writes.filter(
      (write) =>
        (write.body as { operationType?: string }).operationType ===
        'START_WORKOUT',
    ),
  ).toHaveLength(0);
});
test('English, unknown artwork, long names and missing dates retain readable fallbacks', async ({
  page,
}) => {
  const fixture = await visualFixture(page, 'en');
  fixture.program.name =
    'A long personal program without a configured start date';
  fixture.program.startsOn = null;
  fixture.program.days[0]!.name =
    'Mobility and recovery with controlled movement';
  await page.goto('/program');
  await expect(page.getByRole('tab')).toHaveText([
    'Home',
    'Program',
    'Progress',
    'Profile',
  ]);
  await expect(page.getByText('This week', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('radio', { name: 'Week 1', exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByTestId(`program-day-${fixture.program.days[0]!.id}`)
      .locator('img'),
  ).toHaveCount(0);
  await noOverflow(page);
  expect(fixture.writes).toHaveLength(0);
});

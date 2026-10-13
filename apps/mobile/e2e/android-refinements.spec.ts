import { expect, test, type Page } from '@playwright/test';
import { workoutFixture } from './workout-fixture';
import { valueButton, manualField } from './helpers';
const devices = [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
];
async function insets(page: Page, left = 0, right = 0) {
  await page.addInitScript(
    ({ left, right }) => {
      const original = window.getComputedStyle.bind(window);
      window.getComputedStyle = (e, p) => {
        const s = original(e, p);
        if (
          !(e instanceof HTMLElement) ||
          !e.style.paddingTop.includes('safe-area-inset')
        )
          return s;
        return new Proxy(s, {
          get(t, k) {
            if (k === 'paddingTop') return '24px';
            if (k === 'paddingBottom') return '48px';
            if (k === 'paddingLeft') return `${left}px`;
            if (k === 'paddingRight') return `${right}px`;
            const v: unknown = Reflect.get(t, k, t);
            return typeof v === 'function' ? v.bind(t) : v;
          },
        });
      };
    },
    { left, right },
  );
}
async function modeFixture(page: Page, mode: 'emom' | 'pyramid') {
  const f = await workoutFixture(page),
    e = f.program.days[0]!.exercises[0]!;
  f.program.days[0]!.exercises = [e];
  e.workoutMode = mode;
  e.targetSets = 3;
  e.targetReps = mode === 'emom' ? 5 : 12;
  e.restSeconds = 90;
  if (mode === 'emom') e.emomIntervalSeconds = 60;
  else
    e.setTargets = [12, 10, 8].map((reps, i) => ({
      targetReps: reps,
      targetDurationSeconds: null,
      targetLoadKg: ['60.00', '70.00', '80.00'][i]!,
      targetAssistanceKg: null,
      targetRpe: '8.0',
      restSeconds: 90,
    }));
  return f;
}
for (const device of devices) {
  test(`scrolling editorial heroes / clean bodies ${device.width}x${device.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(device);
    await insets(page);
    const f = await workoutFixture(page);
    await page.route('**/progress/summary**', (r) =>
      r.request().method() === 'OPTIONS'
        ? r.fulfill({
            status: 204,
            headers: {
              'access-control-allow-origin': '*',
              'access-control-allow-headers': '*',
            },
          })
        : r.fulfill({
            json: {
              period: {
                range: '8w',
                timeZone: 'UTC',
                from: '2026-08-01T00:00:00Z',
                to: new Date().toISOString(),
                effectiveWeeks: 8,
              },
              completedWorkouts: 7,
              completedSets: 39,
              skippedSets: 2,
              totalReps: 273,
              averageRpe: 8.2,
              trainingSeconds: 9180,
              sessionsPerWeek: 0.875,
              adherence: null,
            },
            headers: { 'access-control-allow-origin': '*' },
          }),
    );
    await page.route('**/me', (r) =>
      r.request().method() === 'OPTIONS'
        ? r.fulfill({
            status: 204,
            headers: {
              'access-control-allow-origin': '*',
              'access-control-allow-headers': '*',
            },
          })
        : r.fulfill({
            json: {
              id: '3c9e1b7d-7596-4f15-a11c-48b8ef237413',
              displayName: 'Leo',
              initialized: true,
              locale: 'it',
              unitSystem: 'metric',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            headers: { 'access-control-allow-origin': '*' },
          }),
    );
    for (const [route, frame] of [
      ['/progress', 'progress-tab-hero'],
      ['/profile', 'profile-tab-hero'],
      ['/program', 'program-tab-hero'],
      ['/workout', 'workout-hub-hero'],
    ] as const) {
      await page.goto(route);
      const hero = page.getByTestId(frame);
      if (route === '/progress')
        await expect(
          page.getByText('7', { exact: true }).first(),
        ).toBeVisible();
      await expect(hero).toBeVisible();
      const art = page.getByTestId('section-hero-art');
      const before = (await art.boundingBox())!;
      expect(before.y).toBe(0);
      if (route === '/progress') {
        const title = (await page
          .getByTestId('progress-hero-title')
          .boundingBox())!;
        expect(title.y).toBeLessThan(before.height * 0.3);
        expect(title.y).toBeGreaterThanOrEqual(24);
        expect(title.y + title.height).toBeLessThanOrEqual(before.height);
      }
      if (route === '/profile') {
        await expect(page.getByTestId('profile-readability-wash')).toHaveCount(
          0,
        );
        await expect(
          page.getByText('Disciplina · Costanza · Risultati', { exact: true }),
        ).toHaveCount(0);
        await expect(page.getByTestId('profile-display-name')).toHaveText(
          'Il tuo account',
        );
      }
      if (route === '/program')
        await expect(page.getByTestId('program-day-artwork')).toHaveCount(0);
      const offset = await hero.evaluate((el) => {
        let sc = el.parentElement;
        while (
          sc &&
          !['auto', 'scroll'].includes(getComputedStyle(sc).overflowY)
        )
          sc = sc.parentElement;
        if (!sc) throw new Error('No scrolling ancestor');
        sc.scrollTop = 600;
        sc.dispatchEvent(new Event('scroll'));
        return sc.scrollTop;
      });
      expect(offset).toBeGreaterThan(0);
      const after = (await art.boundingBox())!;
      expect(Math.abs(after.y + offset - before.y)).toBeLessThanOrEqual(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${route.slice(1)}-scrolled.png`),
      });
    }
    await page.goto(
      `/program/${f.program.id}/day-detail?dayId=${f.program.days[0]!.id}`,
    );
    await expect(
      page.getByRole('heading', { name: 'FORZA', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /Giorno 1/ })).toHaveCount(
      0,
    );
    const h = page.getByTestId('program-management-hero'),
      a = page.getByTestId('section-hero-art');
    const b = (await a.boundingBox())!;
    const offset = await h.evaluate((el) => {
      let sc = el.parentElement;
      while (sc && !['auto', 'scroll'].includes(getComputedStyle(sc).overflowY))
        sc = sc.parentElement;
      if (!sc) throw new Error('No scroller');
      sc.scrollTop = 400;
      return sc.scrollTop;
    });
    expect((await a.boundingBox())!.y).toBeCloseTo(b.y - offset, 0);
  });
  for (const mode of ['emom', 'pyramid'] as const)
    test(`real ${mode} layout ${device.width}x${device.height}`, async ({
      page,
    }, info) => {
      await page.setViewportSize(device);
      await insets(page);
      await modeFixture(page, mode);
      await page.goto('/workout');
      await page
        .getByRole('button', { name: 'Inizia allenamento', exact: true })
        .first()
        .click();
      if (mode === 'emom') {
        await expect(page.getByTestId('emom-live')).toBeVisible();
        await page
          .getByRole('button', { name: 'Inizia EMOM', exact: true })
          .click();
        await expect(
          page.getByText('PREPARATI', { exact: true }),
        ).toBeVisible();
        await expect(valueButton(page, 'Ripetizioni')).toHaveCount(0);
      } else {
        await expect(page.getByTestId('pyramid-live-timeline')).toBeVisible();
        await expect(valueButton(page, 'Ripetizioni')).toHaveText('12');
        await expect(valueButton(page, 'Carico')).toHaveText('60 kg');
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath(`${mode}-live.png`) });
    });
}
test('EMOM prepares, auto-advances with defaults and durable timer resumes after reload', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-13T10:00:00Z') });
  const f = await modeFixture(page, 'emom');
  await page.goto('/workout');
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Inizia EMOM', exact: true }).click();
  await expect(page.getByText('PREPARATI', { exact: true })).toBeVisible();
  await page.clock.fastForward(71_000);
  await expect(page.getByText('Round 2 / 3', { exact: true })).toBeVisible();
  await expect.poll(() => f.workout.exercises[0]!.sets[0]!.actualReps).toBe(5);
  expect(f.workout.exercises[0]!.sets[0]!.targetReps).toBe(5);
  expect(f.workout.exercises[0]!.sets[1]!.actualReps).toBeNull();
  await page.reload();
  await expect(page.getByText('Round 2 / 3', { exact: true })).toBeVisible();
  await expect(valueButton(page, 'Ripetizioni')).toHaveCount(0);
});
test('Pyramid confirmation/rest/correction use real per-set snapshots', async ({
  page,
}) => {
  const f = await modeFixture(page, 'pyramid');
  await page.goto('/workout');
  await page
    .getByRole('button', { name: 'Inizia allenamento', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Diminuisci Ripetizioni', exact: true })
    .click();
  await page
    .getByRole('button', { name: '✓ Completa serie', exact: true })
    .click();
  await expect(page.getByText('RECUPERO', { exact: true })).toBeVisible();
  await expect.poll(() => f.workout.exercises[0]!.sets[0]!.actualReps).toBe(11);
  expect(f.workout.exercises[0]!.sets[0]!.targetReps).toBe(12);
  await page
    .getByRole('button', { name: 'Correggi serie 1', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Diminuisci Ripetizioni', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Salva correzione', exact: true })
    .click();
  await expect.poll(() => f.workout.exercises[0]!.sets[0]!.actualReps).toBe(10);
  await page
    .getByRole('button', { name: 'Salta recupero', exact: true })
    .click();
  await expect(valueButton(page, 'Ripetizioni')).toHaveText('10');
  await expect(valueButton(page, 'Carico')).toHaveText('70 kg');
});
test('Builder persists ordered pyramid targets, supports add/remove/reorder and EMOM configuration', async ({
  page,
}) => {
  const f = await workoutFixture(page);
  const day = f.program.days[0]!,
    e = day.exercises[0]!;
  let saved: Record<string, unknown> | null = null;
  await page.route(`**/program-exercises/${e.id}`, async (route) => {
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    saved = route.request().postDataJSON();
    Object.assign(e, saved);
    return route.fulfill({
      json: f.program,
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.route(`**/exercises/${e.exerciseId}`, (r) =>
    r.fulfill({
      json: e.exercise,
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  const url = `/program/${f.program.id}/exercise?dayId=${day.id}&exerciseId=${e.exerciseId}&prescriptionId=${e.id}`;
  await page.goto(url);
  await page.getByRole('button', { name: 'Piramidale', exact: true }).click();
  await expect(page.getByTestId('pyramid-builder')).toBeVisible();
  await page
    .getByRole('button', { name: 'Aggiungi serie', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Rimuovi serie', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Target serie 2', exact: true })
    .click();
  await (await manualField(page, 'Ripetizioni')).fill('6');
  await page
    .getByRole('button', { name: 'Conferma Ripetizioni', exact: true })
    .click();
  await page.getByRole('button', { name: 'Sposta su', exact: true }).click();
  await page
    .getByRole('button', { name: 'Salva modifiche', exact: true })
    .click();
  await expect.poll(() => saved?.workoutMode).toBe('pyramid');
  expect(
    (saved!.setTargets as { targetReps: number }[]).map((s) => s.targetReps),
  ).toEqual([6, 8]);
  await page.goto(url);
  await page.getByRole('button', { name: 'EMOM', exact: true }).click();
  await page
    .getByRole('button', { name: 'Salva modifiche', exact: true })
    .click();
  await expect.poll(() => saved?.workoutMode).toBe('emom');
  expect(saved!.emomIntervalSeconds).toBe(60);
  expect(saved!.setTargets).toBeNull();
});

test('lateral safe insets keep section content protected while artwork remains full bleed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await insets(page, 12, 20);
  const f = await workoutFixture(page);
  for (const [route, frame] of [
    ['/program', 'program-tab-hero'],
    ['/progress', 'progress-tab-hero'],
    ['/profile', 'profile-tab-hero'],
    ['/workout', 'workout-hub-hero'],
    [
      `/program/${f.program.id}/day-detail?dayId=${f.program.days[0]!.id}`,
      'program-management-hero',
    ],
  ]) {
    await page.goto(route!);
    const hero = page.getByTestId(frame!);
    await expect(hero).toBeVisible();
    const art = (await page.getByTestId('section-hero-art').boundingBox())!,
      content = (await hero.boundingBox())!;
    expect(art.x).toBe(0);
    expect(art.width).toBe(390);
    expect(content.x).toBeGreaterThanOrEqual(12);
    expect(content.x + content.width).toBeLessThanOrEqual(370);
  }
});

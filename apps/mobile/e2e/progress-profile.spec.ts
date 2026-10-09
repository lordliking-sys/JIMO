import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { workoutFixture } from './workout-fixture';
import { prepareProfileFixture } from './profile-component';

test.use({ timezoneId: 'Europe/Rome' });
const devices = [
  { width: 320, height: 740 },
  { width: 390, height: 780 },
  { width: 393, height: 851 },
  { width: 430, height: 860 },
];
async function safeInsets(page: Page) {
  await page.addInitScript(() => {
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
          if (key === 'paddingTop') return '24px';
          if (key === 'paddingBottom') return '48px';
          const value: unknown = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    };
  });
}
async function analyticsFixture(page: Page, locale = 'it') {
  await workoutFixture(page, locale);
  const exerciseId = randomUUID(),
    sessionId = randomUUID(),
    requests: string[] = [];
  const latest = {
    sessionId,
    date: '2026-10-06T10:00:00Z',
    trackingMode: 'reps',
    loadMode: 'external',
    reps: 7,
    durationSeconds: null,
    loadKg: '82.50',
    assistanceKg: null,
  };
  const record = {
    exerciseId,
    sessionId,
    setId: randomUUID(),
    displayName: 'Panca piana',
    trackingMode: 'reps',
    loadMode: 'external',
    type: 'MAX_LOAD',
    value: '82.50',
    reps: 7,
    durationSeconds: null,
    date: latest.date,
  };
  await page.route('**/progress/**', (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
        },
      });
    requests.push(url.pathname + url.search);
    const period = {
      range: url.searchParams.get('range') ?? '8w',
      timeZone: 'Europe/Rome',
      from: '2026-08-15T00:00:00Z',
      to: '2026-10-09T00:00:00Z',
      effectiveWeeks: 8,
    };
    const weeks = [0, 1, 0, 0, 1, 1, 0, 4].map((completedWorkouts, i) => ({
      weekStart: `2026-${i < 4 ? '08' : '09'}-${String([10, 17, 24, 31, 7, 14, 21, 28][i]).padStart(2, '0')}`,
      completedWorkouts,
      completedSets: completedWorkouts * 5,
      trainingSeconds: completedWorkouts ? completedWorkouts * 1200 : null,
      totalReps: null,
      averageRpe: completedWorkouts ? 8 : null,
    }));
    let json: unknown;
    if (url.pathname === '/progress/summary')
      json = {
        period,
        completedWorkouts: 7,
        completedSets: 39,
        skippedSets: 2,
        totalReps: 273,
        averageRpe: 8.2,
        trainingSeconds: 9180,
        sessionsPerWeek: 0.875,
        adherence: null,
      };
    else if (url.pathname === '/progress/weekly') json = { period, weeks };
    else if (url.pathname === '/progress/prs')
      json = { period, records: [record], nextCursor: null };
    else if (url.pathname === '/progress/exercises')
      json = {
        period,
        exercises: [
          {
            id: exerciseId,
            displayName: record.displayName,
            sessions: 7,
            trackingModes: ['reps'],
            loadModes: ['external'],
            latest,
            trend: null,
          },
        ],
        nextCursor: null,
      };
    else if (url.pathname === `/progress/exercises/${exerciseId}`)
      json = {
        period,
        exercise: { id: exerciseId, displayName: record.displayName },
        sessions: 7,
        trackingModes: ['reps'],
        loadModes: ['external'],
        modes: [
          {
            trackingMode: 'reps',
            loadMode: 'external',
            sessions: 7,
            sessionsPerWeek: 0.875,
            completedSets: 39,
            totalReps: 273,
            maxReps: 7,
            maxDurationSeconds: null,
            averageDurationSeconds: null,
            totalDurationSeconds: null,
            maxLoadKg: '82.50',
            minAssistanceKg: null,
            loadVolume: '577.50',
            averageRpe: 8.2,
            latest,
            records: [record],
            timelineTruncated: false,
            timeline: ['280.00', '577.50'].map((loadVolume, i) => ({
              sessionId: randomUUID(),
              date: `2026-10-0${5 + i}T10:00:00Z`,
              completedSets: 1,
              totalReps: 7,
              maxReps: 7,
              maxDurationSeconds: null,
              averageDurationSeconds: null,
              totalDurationSeconds: null,
              maxLoadKg: '82.50',
              minAssistanceKg: null,
              loadVolume,
              averageRpe: 8.2,
            })),
          },
        ],
      };
    else return route.fallback();
    return route.fulfill({
      json,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
      },
    });
  });
  return requests;
}
async function bottomInset(page: Page, screen: string, lastItem: string) {
  const root = page.getByTestId(screen),
    scroll = root.getByTestId('editorial-scroll');
  expect(
    await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await scroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const last = root.getByTestId(lastItem),
    bounds = await last.boundingBox(),
    viewport = await scroll.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    viewport!.y + viewport!.height - 24,
  );
  const gap = viewport!.y + viewport!.height - bounds!.y - bounds!.height;
  expect(gap).toBeGreaterThanOrEqual(143);
}
for (const device of devices)
  test(`CLEAN references ${device.width}x${device.height}: charts, real values and safe-area scrolling`, async ({
    page,
  }, info) => {
    await page.setViewportSize(device);
    await safeInsets(page);
    await analyticsFixture(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/progress');
    await expect(page.getByTestId('workouts-stat')).toContainText('7');
    await expect(page.getByTestId('global-volume-stat')).toContainText('—');
    await expect(
      page.getByRole('button', { name: /Panca piana, Carico massimo, 82,5/ }),
    ).toBeVisible();
    await expect(page.getByText('2h 33m', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(8);
    await expect(
      page.getByRole('tab', { name: 'Progressi', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    for (const chart of await page.getByTestId('editorial-chart').all())
      expect(
        await chart.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    expect(
      await page
        .getByRole('heading', { name: 'PROGRESSI', exact: true })
        .evaluate((el) => el.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(24);
    expect(
      await page
        .getByTestId('progress-editorial-screen')
        .evaluate((el) => el.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath('progressi-clean.png') });
    await bottomInset(page, 'progress-editorial-screen', 'progress-content');
    await page.getByRole('tab', { name: 'Profilo', exact: true }).click();
    await expect(page.getByTestId('profile-display-name')).toHaveText(
      'Il tuo account',
    );
    await expect(
      page.getByRole('tab', { name: 'Profilo', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('button', { name: 'Unità', exact: true }),
    ).toBeDisabled();
    for (const button of await page
      .getByTestId('profile-menu')
      .getByRole('button')
      .all())
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: info.outputPath('profilo-clean.png') });
    const settings = page.getByRole('button', {
      name: 'Impostazioni',
      exact: true,
    });
    expect((await settings.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    const menuBefore = (await page.getByTestId('profile-menu').boundingBox())!
      .y;
    await settings.click();
    await expect
      .poll(
        async () => (await page.getByTestId('profile-menu').boundingBox())!.y,
      )
      .toBeGreaterThanOrEqual(24);
    await expect
      .poll(
        async () => (await page.getByTestId('profile-menu').boundingBox())!.y,
      )
      .toBeLessThan(menuBefore);
    const menu = (await page.getByTestId('profile-menu').boundingBox())!,
      viewport = (await page
        .getByTestId('profile-editorial-screen')
        .getByTestId('editorial-scroll')
        .boundingBox())!;
    // Native scrolling clamps at content end on taller screens; the entire menu must still be exposed.
    expect(menu.y + menu.height).toBeLessThanOrEqual(
      viewport.y + viewport.height - 24,
    );
    await bottomInset(page, 'profile-editorial-screen', 'profile-menu');
    expect(errors).toEqual([]);
  });
test('four content tabs stay on one screen, preserve query state and use real exercise volume; all periods survive', async ({
  page,
}) => {
  const requests = await analyticsFixture(page);
  await page.goto('/progress');
  await expect(page.getByTestId('workouts-stat')).toContainText('7');
  await page
    .getByTestId('progress-editorial-screen')
    .evaluate((el) => Object.assign(window, { progressScreenNode: el }));
  const summaryRequests = requests.filter((url) =>
    url.startsWith('/progress/summary'),
  ).length;
  for (const name of ['Forza', 'Volume', 'Frequenza', 'Panoramica']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(new URL(page.url()).pathname).toBe('/progress');
    expect(
      await page
        .getByTestId('progress-editorial-screen')
        .evaluate(
          (el) =>
            el ===
            (window as unknown as { progressScreenNode: Element })
              .progressScreenNode,
        ),
    ).toBe(true);
    if (name === 'Volume') {
      await expect(
        page.getByText('577,5 kg·reps', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('img', { name: /Panca piana.*280.*577/ }),
      ).toBeVisible();
    }
  }
  expect(
    requests.filter((url) => url.startsWith('/progress/summary')).length,
  ).toBe(summaryRequests);
  for (const [name, range] of [
    ['4 settimane', '4w'],
    ['8 settimane', '8w'],
    ['12 settimane', '12w'],
    ['6 mesi', '6m'],
    ['Tutto', 'all'],
  ] as const) {
    await page.getByRole('radio', { name, exact: true }).click();
    await expect(page.getByRole('radio', { name, exact: true })).toBeChecked();
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            url.startsWith('/progress/summary') &&
            url.includes(`range=${range}`),
        ),
      )
      .toBe(true);
  }
});
test('empty and unavailable analytics never create illustrative values; English has working content tabs', async ({
  page,
}) => {
  await workoutFixture(page, 'en');
  await page.goto('/progress');
  await expect(
    page.getByText('Complete your first workout to start seeing progress.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId('workouts-stat')).toContainText('0');
  await expect(page.getByTestId('global-volume-stat')).toContainText('—');
  for (const name of ['Strength', 'Volume', 'Frequency', 'Overview']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  }
  const text = await page.getByTestId('progress-editorial-screen').innerText();
  expect(text).not.toMatch(/24[.,]360|187|8 h 42|\+20%|\+15%/);
  await page.route('**/progress/**', (route) =>
    route.abort('internetdisconnected'),
  );
  await page.getByRole('radio', { name: '12 weeks', exact: true }).click();
  await expect(page.getByText(/Progress.*unavailable/).first()).toBeVisible();
  await expect(page.getByTestId('workouts-stat')).toHaveCount(0);
});

test.describe('isolated Profile component with account data (no Clerk or database connection)', () => {
  test.beforeAll(prepareProfileFixture);
  async function openProfile(page: Page, query = '') {
    await page.route('**/__profile-component/**', async (route) => {
      const path = new URL(route.request().url()).pathname.slice(
        '/__profile-component/'.length,
      );
      if (!path)
        return route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html lang="it"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0}#root{display:flex;height:100vh}</style><div id="root"></div><script src="/ __profile-component/profile-harness.js"></script></html>'.replace(
            '/ __',
            '/__',
          ),
        });
      return route.fulfill({
        contentType: path.endsWith('.png') ? 'image/png' : 'text/javascript',
        body: await readFile(join('/tmp/jimo-profile-component', path)),
      });
    });
    await page.goto(`/__profile-component/${query}`);
    await expect(page.getByTestId('profile-display-name')).toHaveText(
      'Ada Bianchi',
    );
  }
  test('real account props, name save, language, units, disclosure rows and logout', async ({
    page,
  }) => {
    await openProfile(page);
    const settings = page.getByRole('button', {
      name: 'Impostazioni',
      exact: true,
    });
    await settings.click();
    expect(
      (await page.getByTestId('profile-menu').boundingBox())!.y,
    ).toBeGreaterThanOrEqual(24);
    await expect(page.getByTestId('profile-stats')).toContainText('7');
    await expect(page.getByTestId('profile-stats')).not.toContainText('+5%');
    for (const name of [
      'Account',
      'Lingua',
      'Unità',
      'Privacy e dati',
      'Informazioni',
      'Esci',
    ])
      await expect(
        page.getByRole('button', { name, exact: true }),
      ).toBeVisible();
    for (const name of [
      'Tema',
      'Notifiche',
      'Backup manuale',
      'Obiettivi',
      'Misure',
    ])
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(
        0,
      );
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await expect(
      page.getByText('ada@example.invalid', { exact: true }).last(),
    ).toBeVisible();
    await page
      .getByRole('textbox', { name: 'Nome visualizzato', exact: true })
      .fill('Ada Rossi');
    await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await expect(page.getByTestId('profile-display-name')).toHaveText(
      'Ada Rossi',
    );
    await page.getByRole('button', { name: 'Unità', exact: true }).click();
    await page.getByRole('radio', { name: /Imperiale/ }).click();
    await expect(page.getByRole('radio', { name: /Imperiale/ })).toBeChecked();
    await page.getByRole('button', { name: 'Lingua', exact: true }).click();
    for (const name of ['Sistema', 'Italiano', 'English'])
      expect(
        (await page.getByRole('radio', { name, exact: true }).boundingBox())!
          .height,
      ).toBeGreaterThanOrEqual(48);
    await page.getByRole('radio', { name: 'English', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Language', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('radio', { name: 'English', exact: true }),
    ).toBeChecked();
    await page.getByRole('radio', { name: 'System', exact: true }).click();
    await expect(
      page.getByRole('radio', { name: 'Sistema', exact: true }),
    ).toBeChecked();
    await page
      .getByRole('button', { name: 'Privacy e dati', exact: true })
      .click();
    await expect(
      page.getByText(/Gli allenamenti vengono conservati/),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Informazioni', exact: true })
      .click();
    await expect(
      page.getByText('JIMO · Versione 0.1.0', { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { profileFixtureActions: unknown[] })
            .profileFixtureActions,
      ),
    ).toEqual([
      { displayName: 'Ada Rossi' },
      { unitSystem: 'imperial' },
      { locale: 'en' },
      { locale: 'system' },
    ]);
    await page.getByRole('button', { name: 'Esci', exact: true }).click();
    await expect(page.getByText('Fixture signed out')).toBeVisible();
  });
  test('long identity and moderate text scaling keep hero, menu and scrolling readable', async ({
    page,
  }) => {
    await openProfile(page);
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    const name =
      'Ada Bianchi Rossi — un nome composto che rimane leggibile anche su un dispositivo piccolo';
    await page
      .getByRole('textbox', { name: 'Nome visualizzato', exact: true })
      .fill(name);
    await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await expect(page.getByTestId('profile-display-name')).toHaveText(name);
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await page.setViewportSize(devices[0]!);
    await page.getByTestId('profile-editorial-screen').evaluate((root) => {
      root.querySelectorAll<HTMLElement>('[dir="auto"]').forEach((text) => {
        const style = getComputedStyle(text);
        text.style.fontSize = `${parseFloat(style.fontSize) * 1.3}px`;
        if (style.lineHeight !== 'normal')
          text.style.lineHeight = `${parseFloat(style.lineHeight) * 1.3}px`;
      });
    });
    for (const device of devices) {
      await page.setViewportSize(device);
      const scroll = page.getByTestId('editorial-scroll');
      expect(
        await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      await expect
        .poll(async () => {
          const art = await page
              .getByTestId('editorial-hero-art')
              .boundingBox(),
            identity = await page
              .getByTestId('profile-display-name')
              .boundingBox();
          return art!.y + art!.height >= identity!.y + identity!.height;
        })
        .toBe(true);
      await bottomInset(page, 'profile-editorial-screen', 'profile-menu');
    }
  });
  test('offline units disabled; active/pending logout warnings preserve their guard', async ({
    page,
  }) => {
    await openProfile(page, '?offline&active&empty');
    await expect(page.getByTestId('profile-stats')).toContainText('—');
    await page.getByRole('button', { name: 'Unità', exact: true }).click();
    for (const option of await page.getByRole('radio').all())
      await expect(option).toBeDisabled();
    await page.getByRole('button', { name: 'Esci', exact: true }).click();
    await expect(page.getByText(/Hai un allenamento attivo/)).toBeVisible();
    await page.getByRole('button', { name: 'Annulla', exact: true }).click();
    await expect(page.getByTestId('profile-display-name')).toHaveText(
      'Ada Bianchi',
    );
    await openProfile(page, '?pending');
    await page.getByRole('button', { name: 'Esci', exact: true }).click();
    await expect(
      page.getByText(/Ci sono dati di allenamento non ancora sincronizzati/),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Esci comunque', exact: true })
      .click();
    await expect(page.getByText('Fixture signed out')).toBeVisible();
  });
});

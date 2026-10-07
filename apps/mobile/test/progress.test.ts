import { WorkoutLocalRepository } from '../src/db/repositories/workouts';
import { SyncOutboxRepository } from '../src/db/repositories/outbox';
import { cachedProgram } from './offline-fixtures';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import {
  progressRanges,
  type ExerciseModeMetrics,
  type ProgressRecord,
} from '@jimo/schemas';
import {
  formatKg,
  formatNumber,
  formatTrainingDuration,
  formatHold,
  chartMetric,
  modeKey,
  recordText,
  performanceText,
} from '../src/progress/helpers';
import { loadProgress } from '../src/progress/cache';
import { ProgressCacheRepository } from '../src/db/repositories/progress';
import { initialSchema } from '../src/db/migrations/0001_offline_workouts';
import { sqliteAdapter } from './sqlite-adapter';
import { resources } from '../src/i18n/resources';
const schema = z.object({ count: z.number() }),
  a = randomUUID(),
  b = randomUUID(),
  time = '2026-10-07T10:00:00Z';
test('display rounding: canonical kg strings, localized decimals, RPE null, duration and holds', () => {
  assert.equal(formatKg('80.00', 'en'), '80');
  assert.equal(formatKg('82.50', 'en'), '82.5');
  assert.equal(formatKg('81.25', 'it'), '81,25');
  assert.equal(formatKg(null, 'it'), '—');
  assert.equal(formatKg('NaN', 'en'), '—');
  assert.equal(formatNumber(8, 'en'), '8');
  assert.equal(formatNumber(8.5, 'it'), '8,5');
  assert.equal(formatNumber(8.166666, 'en'), '8.2');
  assert.equal(formatNumber(null, 'en'), '—');
  assert.equal(formatTrainingDuration(4320, 'it'), '1h 12m');
  assert.equal(formatTrainingDuration(2880, 'en'), '48 min');
  assert.equal(formatTrainingDuration(-1, 'it'), '—');
  assert.equal(formatTrainingDuration(null, 'it'), '—');
  assert.equal(formatTrainingDuration(30, 'it'), '<1 min');
  assert.equal(formatHold(90), '1:30');
  assert.equal(formatHold(150), '2:30');
});
test('mode-specific chart axes and PR context never conflate weighted, assisted, duration or bodyweight', () => {
  for (const loadMode of [
    'external',
    'weighted',
    'assisted',
    'bodyweight',
  ] as const) {
    const mode = { loadMode, trackingMode: 'reps' } as ExerciseModeMetrics;
    assert.equal(
      chartMetric(mode).key,
      loadMode === 'bodyweight'
        ? 'maxReps'
        : loadMode === 'assisted'
          ? 'minAssistanceKg'
          : 'maxLoadKg',
    );
    assert.equal(chartMetric(mode).lower, loadMode === 'assisted');
    assert.equal(modeKey(mode), `reps:${loadMode}`);
    assert.equal(
      chartMetric({ ...mode, trackingMode: 'duration' }).key,
      'maxDurationSeconds',
    );
  }
  const record = {
    type: 'MAX_LOAD',
    exerciseId: randomUUID(),
    displayName: 'Pull-Up',
    trackingMode: 'reps',
    loadMode: 'weighted',
    value: '35.00',
    reps: 3,
    durationSeconds: null,
    date: time,
    sessionId: randomUUID(),
    setId: randomUUID(),
  } satisfies ProgressRecord;
  assert.equal(recordText(record, 'en'), '+35 kg × 3 reps');
  assert.equal(
    recordText(
      {
        ...record,
        type: 'MIN_ASSISTANCE',
        loadMode: 'assisted',
        value: '20.00',
        reps: 8,
      },
      'it',
    ),
    '20 kg assistenza × 8 reps',
  );
  assert.equal(
    recordText(
      {
        ...record,
        type: 'MAX_DURATION',
        value: '90',
        trackingMode: 'duration',
      },
      'it',
    ),
    '1:30',
  );
  assert.equal(
    performanceText(
      {
        sessionId: record.sessionId,
        date: time,
        trackingMode: 'reps',
        loadMode: 'external',
        reps: 7,
        loadKg: '82.50',
        durationSeconds: null,
        assistanceKg: null,
      },
      'it',
    ),
    '82,5 kg × 7 reps',
  );
});
test('range labels, empty/insufficient states and pending-sync notice exist in both locales', () => {
  for (const locale of ['it', 'en'] as const) {
    for (const range of progressRanges)
      assert.ok(resources[locale].progress.ranges[range]);
    for (const key of [
      'empty',
      'insufficient',
      'pendingSync',
      'updatedAt',
      'unavailable',
    ] as const)
      assert.ok(resources[locale].progress[key]);
  }
});
test('SQLite v1→v2 upgrade preserves workout metadata/outbox and is repeatable; cache survives reopen', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jimo-progress-')),
    file = join(dir, 'local.db');
  let c = sqliteAdapter(file);
  try {
    c.sqlite.exec(initialSchema);
    c.sqlite.exec('PRAGMA user_version=1');
    c.sqlite
      .prepare('INSERT INTO sync_metadata VALUES(?,?,?)')
      .run(a, 'sentinel', 'preserved');
    const repo = new WorkoutLocalRepository(c.db, randomUUID, () => time),
      program = cachedProgram();
    const workout = await repo.start(a, program, program.days[0]!.id);
    await repo.save(a, workout.exercises[0]!.sets[0]!.id, {
      actualReps: 7,
      actualLoadKg: '82.50',
      actualDurationSeconds: null,
      actualAssistanceKg: null,
      actualRpe: '9.0',
    });
    await c.db.migrate();
    assert.equal(
      (await repo.detail(a, workout.id))?.exercises[0]?.sets[0]?.actualLoadKg,
      '82.50',
    );
    assert.equal((await new SyncOutboxRepository(c.db).list(a)).length, 2);
    assert.equal(
      c.sqlite.prepare('PRAGMA user_version').get()?.user_version,
      2,
    );
    assert.equal(
      c.sqlite
        .prepare('SELECT value FROM sync_metadata WHERE key=?')
        .get('sentinel')?.value,
      'preserved',
    );
    await new ProgressCacheRepository(c.db).save(
      a,
      'it:8w:Rome',
      { count: 4 },
      schema,
      time,
    );
    await c.db.migrate();
    c.sqlite.close();
    c = sqliteAdapter(file);
    await c.db.migrate();
    assert.deepEqual(
      await new ProgressCacheRepository(c.db).read(a, 'it:8w:Rome', schema),
      { payload: { count: 4 }, fetchedAt: time },
    );
    assert.equal(c.sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally {
    c.sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('progress cache is owner/key isolated, validated, bounded and never changes actual data', async () => {
  const c = sqliteAdapter();
  try {
    await c.db.migrate();
    const cache = new ProgressCacheRepository(c.db);
    await cache.save(a, 'it:8w:Rome', { count: 4 }, schema, time);
    assert.equal(await cache.read(b, 'it:8w:Rome', schema), null);
    assert.equal(await cache.read(a, 'en:8w:Rome', schema), null);
    c.sqlite.prepare('UPDATE progress_cache SET payload_json=?').run('{bad');
    assert.equal(await cache.read(a, 'it:8w:Rome', schema), null);
    await assert.rejects(
      cache.save(
        a,
        'invalid',
        { count: 'no' } as unknown as { count: number },
        schema,
      ),
    );
    for (let i = 0; i < 105; i++)
      await cache.save(
        a,
        `key-${i}`,
        { count: i },
        schema,
        new Date(Date.parse(time) + i * 1000).toISOString(),
      );
    assert.equal(
      c.sqlite
        .prepare(
          'SELECT count(*) AS n FROM progress_cache WHERE owner_user_id=?',
        )
        .get(a)?.n,
      100,
    );
    assert.equal(
      c.sqlite.prepare('SELECT count(*) AS n FROM local_workout_sets').get()?.n,
      0,
    );
  } finally {
    c.sqlite.close();
  }
});
test('offline/failing transport displays last known analytics with timestamp, uncached data fails clearly', async () => {
  const c = sqliteAdapter();
  try {
    await c.db.migrate();
    const cache = new ProgressCacheRepository(c.db);
    await cache.save(a, 'summary', { count: 4 }, schema, time);
    const options = {
      owner: a,
      key: 'summary',
      schema,
      cache,
      online: false,
      currentOwner: () => a,
      fetch: async () => {
        throw new Error('NETWORK_ERROR');
      },
    };
    assert.deepEqual(await loadProgress(options), {
      payload: { count: 4 },
      fetchedAt: time,
      stale: true,
    });
    assert.equal(
      (await loadProgress({ ...options, online: true })).stale,
      true,
    );
    await assert.rejects(
      loadProgress({ ...options, key: 'not-cached' }),
      /PROGRESS_OFFLINE_UNCACHED/,
    );
    const refreshed = await loadProgress({
      ...options,
      online: true,
      fetch: async () => ({ count: 5 }),
    });
    assert.equal(refreshed.stale, false);
    assert.equal(refreshed.payload.count, 5);
  } finally {
    c.sqlite.close();
  }
});
test('in-flight identity change or server identity mismatch cannot cache or show another owner data', async () => {
  const c = sqliteAdapter();
  try {
    await c.db.migrate();
    const cache = new ProgressCacheRepository(c.db);
    let owner = a;
    await assert.rejects(
      loadProgress({
        owner: a,
        key: 'summary',
        schema,
        cache,
        online: true,
        currentOwner: () => owner,
        fetch: async () => {
          owner = b;
          return { count: 999 };
        },
      }),
      /IDENTITY_CHANGED/,
    );
    assert.equal(await cache.read(a, 'summary', schema), null);
    assert.equal(await cache.read(b, 'summary', schema), null);
    await cache.save(a, 'summary', { count: 4 }, schema, time);
    await assert.rejects(
      loadProgress({
        owner: a,
        key: 'summary',
        schema,
        cache,
        online: true,
        currentOwner: () => a,
        fetch: async () => {
          throw Object.assign(new Error('IDENTITY_CHANGED'), { status: 403 });
        },
      }),
      /IDENTITY_CHANGED/,
    );
  } finally {
    c.sqlite.close();
  }
});
test('Home history filter uses completedAt for workouts crossing the local week boundary', async () => {
  const c = sqliteAdapter();
  try {
    await c.db.migrate();
    let event = '2026-10-04T21:30:00Z';
    const repo = new WorkoutLocalRepository(c.db, randomUUID, () => event),
      program = cachedProgram();
    const workout = await repo.start(a, program, program.days[0]!.id);
    event = '2026-10-04T23:30:00Z';
    await repo.finish(a, workout.id, true);
    const since = '2026-10-04T22:00:00Z',
      until = '2026-10-11T22:00:00Z';
    assert.equal((await repo.history(a, since, until, 'started')).length, 0);
    assert.equal((await repo.history(a, since, until, 'completed')).length, 1);
  } finally {
    c.sqlite.close();
  }
});

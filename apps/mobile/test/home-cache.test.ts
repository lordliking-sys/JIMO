import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { ProgramCacheRepository } from '../src/db/repositories/programs';
import {
  WorkoutLocalRepository,
  makeLocalWorkout,
} from '../src/db/repositories/workouts';
import { cachedProgram } from './offline-fixtures';
import { sqliteAdapter } from './sqlite-adapter';

test('an unchanged active-program refresh does not rewrite cached prescriptions', async () => {
  const c = sqliteAdapter(),
    owner = randomUUID(),
    p = cachedProgram();
  await c.db.migrate();
  try {
    const cache = new ProgramCacheRepository(c.db);
    assert.equal(await cache.replaceActive(owner, p), true);
    const writes = c.sqlite.prepare('SELECT total_changes() AS n').get()!.n;
    assert.equal(await cache.replaceActive(owner, structuredClone(p)), false);
    assert.equal(
      c.sqlite.prepare('SELECT total_changes() AS n').get()!.n,
      writes,
    );
    assert.deepEqual(await cache.active(owner), p);
  } finally {
    c.sqlite.close();
  }
});

test('successful exercise/day deletion replaces the local active detail and its relational rows', async () => {
  const c = sqliteAdapter(),
    owner = randomUUID(),
    p = cachedProgram();
  await c.db.migrate();
  try {
    const cache = new ProgramCacheRepository(c.db);
    await cache.replaceActive(owner, p);
    const old = structuredClone(p),
      revision = cache.revision(owner);
    p.days[0]!.exercises = [];
    await cache.applyDetail(owner, p);
    await cache.replaceActive(owner, old, revision);
    assert.deepEqual((await cache.active(owner))!.days[0]!.exercises, []);
    assert.equal(
      c.sqlite
        .prepare('SELECT COUNT(*) AS n FROM cached_program_exercises')
        .get()!.n,
      0,
    );
    p.days = [];
    p.daysCount = 0;
    await cache.applyDetail(owner, p);
    assert.deepEqual((await cache.active(owner))!.days, []);
    assert.equal(await cache.day(owner, old.days[0]!.id), null);
  } finally {
    c.sqlite.close();
  }
});

test('draft creation preserves the active plan, activation replaces it, deletion resists late GETs and is owner-scoped', async () => {
  const c = sqliteAdapter(),
    owner = randomUUID(),
    other = randomUUID(),
    p = cachedProgram();
  await c.db.migrate();
  try {
    const cache = new ProgramCacheRepository(c.db);
    await cache.replaceActive(owner, p);
    await cache.replaceActive(other, p);
    const draft = { ...cachedProgram(), status: 'draft' as const };
    await cache.applyDetail(owner, draft);
    assert.equal((await cache.active(owner))!.id, p.id);
    await cache.applyDetail(owner, { ...draft, status: 'active' });
    assert.equal((await cache.active(owner))!.id, draft.id);
    const revision = cache.revision(owner);
    await cache.remove(owner, draft.id);
    await cache.replaceActive(owner, { ...draft, status: 'active' }, revision);
    assert.equal(await cache.active(owner), null);
    assert.equal((await cache.active(other))!.id, p.id);
  } finally {
    c.sqlite.close();
  }
});

test('confirmed missing workout cache clears Home without deleting pending offline edits or another owner', async () => {
  const c = sqliteAdapter(),
    owner = randomUUID(),
    other = randomUUID(),
    p = cachedProgram();
  await c.db.migrate();
  try {
    const repo = new WorkoutLocalRepository(c.db, randomUUID);
    const synced = makeLocalWorkout(
      p,
      p.days[0]!.id,
      randomUUID,
      new Date().toISOString(),
    );
    await repo.import(owner, synced);
    await repo.import(other, synced);
    await repo.removeMissing(owner, synced.id);
    assert.equal(await repo.active(owner), null);
    assert.equal((await repo.active(other))!.id, synced.id);
    const pending = await repo.start(owner, p, p.days[0]!.id);
    await repo.removeMissing(owner, pending.id);
    assert.equal((await repo.active(owner))!.id, pending.id);
    assert.ok(
      c.sqlite
        .prepare(
          'SELECT 1 FROM sync_outbox WHERE owner_user_id=? AND session_id=?',
        )
        .get(owner, pending.id),
    );
  } finally {
    c.sqlite.close();
  }
});

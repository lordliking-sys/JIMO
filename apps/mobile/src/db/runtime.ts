import { ProgressCacheRepository } from './repositories/progress';
import { randomUUID } from 'expo-crypto';
import {
  syncIdentitySchema,
  syncResponseSchema,
  type ActualInput,
} from '@jimo/schemas';
import { apiRequest, ApiClientError } from '../api/client';
import { programsApi } from '../api/programs';
import { workoutsApi as serverWorkouts } from '../api/workouts';
import type { LocalDatabase } from './database';
import { WorkoutLocalRepository } from './repositories/workouts';
import { ProgramCacheRepository } from './repositories/programs';
import { SyncOutboxRepository } from './repositories/outbox';
import { SyncEngine } from './sync/engine';
export class OfflineRuntime {
  owner: string | null = null;
  online = true;
  syncError: string | null = null;
  locale = 'en';
  readonly workouts;
  readonly programs;
  readonly outbox;
  readonly engine;
  readonly progress;
  progressRevision = 0;
  /** Disabled until auth binds the resolved provider subject to its local UUID. */
  authBound = false;
  private listeners = new Set<() => void>();
  constructor(readonly db: LocalDatabase) {
    this.progress = new ProgressCacheRepository(db);
    this.workouts = new WorkoutLocalRepository(db, randomUUID);
    this.programs = new ProgramCacheRepository(db);
    this.outbox = new SyncOutboxRepository(db);
    this.engine = new SyncEngine({
      outbox: this.outbox,
      owner: () => this.owner,
      network: () => this.online && this.authBound,
      verifyIdentity: async () => {
        if (!this.authBound) throw new ApiClientError('AUTH_REQUIRED', 401);
        const { userId } = await apiRequest(
          '/sync/identity',
          syncIdentitySchema,
        );
        if (userId !== this.owner)
          throw new ApiClientError('IDENTITY_CHANGED', 403);
        return userId;
      },
      send: (owner, operations) =>
        apiRequest('/sync/workout-operations', syncResponseSchema, {
          method: 'POST',
          timeoutMs: 60_000,
          body: { expectedUserId: owner, operations },
        }),
      synced: () => {
        this.progressRevision++;
        this.changed();
      },
      reconcile: (owner) => this.reconcile(owner),
      changed: () => this.changed(),
      error: (code) => {
        this.syncError = code;
        this.changed();
      },
    });
  }
  setLocale(locale: string) {
    this.locale = locale;
  }
  setNetwork(online: boolean) {
    const before = this.online;
    this.online = online;
    if (before !== online) this.changed();
    if (online) void this.engine.request(!before);
  }
  async hydrate() {
    // A last-used UUID cannot prove which account is signed in at startup.
    this.owner = null;
  }
  bindOwner(owner: string | null) {
    this.owner = owner;
    this.authBound = owner !== null;
    this.syncError = null;
    this.changed();
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  changed() {
    for (const fn of this.listeners) fn();
  }
  async metadata(owner: string, key: string, value?: string) {
    return this.db.access(async (sql) => {
      if (value !== undefined)
        await sql.run(
          'INSERT INTO sync_metadata VALUES(?,?,?) ON CONFLICT(owner_user_id,key) DO UPDATE SET value=excluded.value',
          [owner, key, value],
        );
      return (
        (
          await sql.all<{ value: string }>(
            'SELECT value FROM sync_metadata WHERE owner_user_id=? AND key=?',
            [owner, key],
          )
        )[0]?.value ?? null
      );
    });
  }
  private async reconcile(owner: string) {
    if (owner !== this.owner) return;
    const programs = await programsApi.list(this.locale),
      active = programs.programs.find((p) => p.status === 'active');
    const detail = active
      ? await programsApi.detail(active.id, this.locale)
      : null;
    if (owner !== this.owner) return;
    await this.programs.replaceActive(owner, detail);
    const local = await this.workouts.active(owner),
      server = await serverWorkouts.active();
    if (owner !== this.owner) return;
    if (local && server.workout && local.id !== server.workout.id) {
      await this.metadata(owner, 'activeConflict', local.id);
      this.syncError = 'WORKOUT_SYNC_CONFLICT';
    } else {
      await this.metadata(owner, 'activeConflict', '');
      if (server.workout) await this.workouts.import(owner, server.workout);
      else if (local) {
        // Server may have closed the same session on another device. Pending local
        // edits always win until acknowledged; missing server rows are never deleted.
        const queued = await this.outbox.list(owner);
        if (!queued.some((o) => o.session_id === local.id)) {
          try {
            await this.workouts.import(
              owner,
              await serverWorkouts.detail(local.id),
            );
          } catch (error) {
            if (
              error &&
              typeof error === 'object' &&
              'status' in error &&
              error.status === 404
            ) {
              await this.metadata(owner, 'activeConflict', local.id);
              this.syncError = 'WORKOUT_SYNC_CONFLICT';
            } else throw error;
          }
        }
      }
    }
    const history = await serverWorkouts.history();
    if (owner !== this.owner) return;
    await this.metadata(
      owner,
      'recentHistory',
      JSON.stringify(history.workouts),
    );
    // Bound downloads; cache enough read-only recent detail for offline history.
    for (const summary of history.workouts.slice(0, 5))
      if (
        owner === this.owner &&
        !(await this.workouts.detail(owner, summary.id))
      )
        await this.workouts.import(
          owner,
          await serverWorkouts.detail(summary.id),
        );
  }
  identity() {
    if (!this.owner) throw new Error('IDENTITY_NOT_CACHED');
    return this.owner;
  }
  private async mutate<T>(action: (owner: string) => Promise<T>) {
    const owner = this.identity(),
      result = await action(owner);
    void this.engine.request();
    return result;
  }
  async start(dayId: string) {
    return this.mutate(async (owner) => {
      let program = await this.programs.day(owner, dayId);
      if (!program && this.online) {
        const list = await programsApi.list(this.locale),
          active = list.programs.find((p) => p.status === 'active');
        if (active) {
          const fetched = await programsApi.detail(active.id, this.locale);
          await this.programs.replaceActive(owner, fetched);
          program = await this.programs.day(owner, dayId);
        }
      }
      if (!program) throw new Error('PROGRAM_NOT_CACHED');
      return this.workouts.start(owner, program, dayId);
    });
  }
  save(id: string, input: ActualInput, correction = false) {
    return this.mutate((owner) =>
      this.workouts.save(owner, id, input, correction),
    );
  }
  skip(id: string) {
    return this.mutate((owner) => this.workouts.skip(owner, id));
  }
  finish(id: string, skip = false) {
    return this.mutate((owner) => this.workouts.finish(owner, id, skip));
  }
  cancel(id: string) {
    return this.mutate((owner) => this.workouts.finish(owner, id, true, true));
  }
  async detail(id: string) {
    const owner = this.identity(),
      local = await this.workouts.detail(owner, id);
    if (local) return local;
    // Only an uncached history/deep link needs the server. Active work reads SQLite.
    if (!this.online) throw new Error('LOCAL_WORKOUT_NOT_FOUND');
    const server = await serverWorkouts.detail(id);
    await this.workouts.import(owner, server);
    return this.workouts.detail(owner, id);
  }
  async history(
    since?: string,
    until?: string,
    dateField: 'started' | 'completed' = 'started',
  ) {
    const dateOf = (w: { startedAt: string; completedAt: string | null }) =>
      dateField === 'completed' ? w.completedAt : w.startedAt;
    if (!this.owner) return { workouts: [] };
    const local = await this.workouts.history(
        this.owner,
        since,
        until,
        dateField,
      ),
      cached = JSON.parse(
        (await this.metadata(this.owner, 'recentHistory')) ?? '[]',
      ) as typeof local;
    const merged = new Map(
      cached
        .filter(
          (w) =>
            (!since ||
              (dateOf(w) !== null &&
                Date.parse(dateOf(w)!) >= Date.parse(since))) &&
            (!until ||
              (dateOf(w) !== null &&
                Date.parse(dateOf(w)!) < Date.parse(until))),
        )
        .map((w) => [w.id, w]),
    );
    for (const w of local) merged.set(w.id, w);
    return {
      workouts: [...merged.values()]
        .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
        .slice(0, 100),
    };
  }
}

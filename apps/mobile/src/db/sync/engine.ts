import type { WorkoutOperation, SyncResponse } from '@jimo/schemas';
import type { SyncOutboxRepository } from '../repositories/outbox';
export const retryDelay = (attempt: number) =>
  [2000, 5000, 15000, 30000][Math.min(Math.max(attempt - 1, 0), 3)]!;
export interface SyncDependencies {
  outbox: SyncOutboxRepository;
  owner: () => string | null;
  verifyIdentity: () => Promise<string>;
  send: (
    owner: string,
    operations: WorkoutOperation[],
  ) => Promise<SyncResponse>;
  reconcile: (owner: string) => Promise<void>;
  synced?: () => void;
  changed: () => void;
  network: () => boolean;
  error: (code: string | null) => void;
}
/** One instance per application. A queued request never launches another worker. */
export class SyncEngine {
  private running: Promise<void> | null = null;
  private requested = false;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private authPaused = false;
  constructor(private deps: SyncDependencies) {}
  request(reset = false): Promise<void> {
    if (this.stopped || !this.deps.network()) return Promise.resolve();
    if (reset) {
      this.authPaused = false;
      this.attempt = 0;
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.authPaused) return Promise.resolve();
    if (this.timer && !reset) return Promise.resolve();
    this.requested = true;
    if (!this.running)
      this.running = this.run().finally(() => {
        this.running = null;
        if (this.requested && !this.timer && !this.stopped) void this.request();
      });
    return this.running;
  }
  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  private schedule() {
    if (this.stopped || !this.deps.network()) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.request();
    }, retryDelay(++this.attempt));
  }
  private async run() {
    const initialOwner = this.deps.owner();
    try {
      do {
        this.requested = false;
        const owner = await this.deps.verifyIdentity();
        if (this.stopped || owner !== this.deps.owner()) return;
        while (
          this.deps.network() &&
          !this.stopped &&
          owner === this.deps.owner()
        ) {
          const operations = await this.deps.outbox.batch(owner);
          if (!operations.length) break;
          this.deps.changed();
          try {
            const result = await this.deps.send(owner, operations);
            await this.deps.outbox.acknowledge(owner, operations, result);
            if (result.acknowledged.length) this.deps.synced?.();
            this.deps.changed();
            const failure = result.failed[0];
            if (failure) {
              this.deps.error(failure.code);
              if (result.failed.some((f) => f.status === 'retry')) {
                this.schedule();
                return;
              }
            }
            if (!result.acknowledged.length && !result.failed.length) {
              this.deps.error('INVALID_SYNC_RESPONSE');
              this.schedule();
              return;
            }
          } catch (error) {
            const status =
              error && typeof error === 'object' && 'status' in error
                ? Number(error.status)
                : 0;
            const code =
              status === 401
                ? 'AUTH_REQUIRED'
                : status === 403
                  ? 'IDENTITY_CHANGED'
                  : status >= 400 &&
                      status < 500 &&
                      status !== 408 &&
                      status !== 429
                    ? 'SYNC_REJECTED'
                    : 'SYNC_UNAVAILABLE';
            const permanent =
              status >= 400 &&
              status < 500 &&
              status !== 401 &&
              status !== 403 &&
              status !== 408 &&
              status !== 429;
            await this.deps.outbox.release(owner, operations, code, permanent);
            this.deps.changed();
            if (owner !== this.deps.owner()) return;
            this.deps.error(code);
            if (status === 401 || status === 403) this.authPaused = true;
            if (!permanent && status !== 401 && status !== 403) this.schedule();
            return;
          }
        }
        if (this.stopped || owner !== this.deps.owner()) return;
        await this.deps.reconcile(owner);
        const remaining = await this.deps.outbox.list(owner);
        if (
          !remaining.some(
            (o) => o.status === 'failed' || o.status === 'conflict',
          )
        )
          this.deps.error(null);
        this.attempt = 0;
        this.deps.changed();
      } while (this.requested && this.deps.network() && !this.stopped);
    } catch (error) {
      if (initialOwner !== this.deps.owner()) return;
      const status =
        error && typeof error === 'object' && 'status' in error
          ? Number(error.status)
          : 0;
      this.deps.error(
        status === 401
          ? 'AUTH_REQUIRED'
          : status === 403
            ? 'IDENTITY_CHANGED'
            : 'SYNC_UNAVAILABLE',
      );
      if (status === 401 || status === 403) this.authPaused = true;
      if (!status || status >= 500 || status === 408 || status === 429)
        this.schedule();
    }
  }
}

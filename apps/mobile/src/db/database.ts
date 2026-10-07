import { progressCacheSchema } from './migrations/0002_progress_cache';
import { initialSchema } from './migrations/0001_offline_workouts';
export type Value = string | number | null;
export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: Value[]): Promise<void>;
  all<T>(sql: string, params?: Value[]): Promise<T[]>;
}
/** Serializes ALL reads and writes on the connection, including timer metadata.
 * Expo withTransactionAsync alone also captures concurrent unrelated statements.
 */
export class LocalDatabase {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private sql: SqlExecutor) {}
  access<T>(fn: (sql: SqlExecutor) => Promise<T>): Promise<T> {
    const result = this.tail.then(() => fn(this.sql));
    this.tail = result.catch(() => undefined);
    return result;
  }
  transaction<T>(fn: (sql: SqlExecutor) => Promise<T>) {
    return this.access(async (sql) => {
      await sql.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(sql);
        await sql.exec('COMMIT');
        return result;
      } catch (error) {
        await sql.exec('ROLLBACK');
        throw error;
      }
    });
  }
  async migrate() {
    await this.access((sql) =>
      sql.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;'),
    );
    await this.transaction(async (sql) => {
      const version =
        (await sql.all<{ user_version: number }>('PRAGMA user_version'))[0]
          ?.user_version ?? 0;
      if (version > 2) throw new Error('LOCAL_SCHEMA_NEWER');
      if (version < 1) {
        await sql.exec(initialSchema);
        await sql.exec('PRAGMA user_version=1');
      }
      if (version < 2) {
        await sql.exec(progressCacheSchema);
        await sql.exec('PRAGMA user_version=2');
      }
      // Requests interrupted by a process kill can safely be resent.
      await sql.run(
        "UPDATE sync_outbox SET status='pending' WHERE status='syncing'",
      );
    });
  }
}

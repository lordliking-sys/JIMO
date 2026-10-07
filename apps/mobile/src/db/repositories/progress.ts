import type { z } from 'zod';
import type { LocalDatabase } from '../database';
export type CachedProgress<T> = { payload: T; fetchedAt: string };
export class ProgressCacheRepository {
  constructor(private db: LocalDatabase) {}
  async read<T>(
    owner: string,
    key: string,
    schema: z.ZodType<T>,
  ): Promise<CachedProgress<T> | null> {
    return this.db.access(async (sql) => {
      const row = (
        await sql.all<{ payload_json: string; fetched_at: string }>(
          'SELECT payload_json,fetched_at FROM progress_cache WHERE owner_user_id=? AND cache_key=?',
          [owner, key],
        )
      )[0];
      if (!row) return null;
      try {
        const result = schema.safeParse(JSON.parse(row.payload_json));
        return result.success
          ? { payload: result.data, fetchedAt: row.fetched_at }
          : null;
      } catch {
        return null;
      }
    });
  }
  async save<T>(
    owner: string,
    key: string,
    payload: T,
    schema: z.ZodType<T>,
    fetchedAt = new Date().toISOString(),
  ) {
    const data = schema.parse(payload);
    await this.db.transaction(async (sql) => {
      await sql.run(
        'INSERT INTO progress_cache VALUES(?,?,?,?) ON CONFLICT(owner_user_id,cache_key) DO UPDATE SET payload_json=excluded.payload_json,fetched_at=excluded.fetched_at',
        [owner, key, JSON.stringify(data), fetchedAt],
      );
      // Bounded read-only cache: keep 100 most recent responses per account.
      await sql.run(
        'DELETE FROM progress_cache WHERE owner_user_id=? AND cache_key NOT IN(SELECT cache_key FROM progress_cache WHERE owner_user_id=? ORDER BY fetched_at DESC,cache_key LIMIT 100)',
        [owner, owner],
      );
    });
    return { payload: data, fetchedAt };
  }
}

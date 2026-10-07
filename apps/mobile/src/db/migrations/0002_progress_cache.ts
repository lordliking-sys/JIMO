/** Last known SERVER responses only. Never used to calculate workout analytics. */
export const progressCacheSchema = `CREATE TABLE progress_cache(
 owner_user_id TEXT NOT NULL, cache_key TEXT NOT NULL, payload_json TEXT NOT NULL,
 fetched_at TEXT NOT NULL, PRIMARY KEY(owner_user_id,cache_key)
);`;

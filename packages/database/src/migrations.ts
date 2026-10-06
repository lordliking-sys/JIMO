import { readMigrationFiles } from 'drizzle-orm/migrator';
import type { DatabaseClient } from './client';

const lock = 1246317903;
export class MigrationStateError extends Error {}

export async function migrateDatabase(
  client: DatabaseClient,
  migrationsFolder: string,
) {
  const migrations = readMigrationFiles({ migrationsFolder });
  const query = client.sqlClient.query;
  await client.sqlClient.transaction([
    query('SELECT pg_advisory_xact_lock($1)', [lock]),
    query('CREATE SCHEMA IF NOT EXISTS drizzle'),
    query(
      'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint NOT NULL)',
    ),
  ]);
  const applied = await query(
    'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at',
  );
  for (const [index, row] of applied.entries()) {
    const migration = migrations[index];
    if (
      !migration ||
      Number(row.created_at) !== migration.folderMillis ||
      row.hash !== migration.hash
    ) {
      throw new MigrationStateError(
        'Migration history differs from versioned SQL; review before proceeding',
      );
    }
  }
  let count = 0;
  for (const migration of migrations.slice(applied.length)) {
    // One HTTP transaction includes DDL and ledger entry. A concurrent runner
    // cannot execute the same migration after acquiring the advisory lock.
    await client.sqlClient.transaction([
      query('SELECT pg_advisory_xact_lock($1)', [lock]),
      query(
        `DO $$ BEGIN IF EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at >= ${migration.folderMillis}) THEN RAISE EXCEPTION 'Concurrent migration detected; retry'; END IF; END $$`,
      ),
      ...migration.sql
        .filter((statement) => statement.trim())
        .map((statement) => query(statement)),
      query(
        'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
        [migration.hash, migration.folderMillis],
      ),
    ]);
    count++;
  }
  return { applied: count, total: migrations.length };
}
